"""
DeepGuard AI backend integration tests.

Covers:
- Health check (/api/)
- Auth: 401 without token, invalid session_id → 401, seeded session → /auth/me works,
  logout deletes session.
- Detection: /detect/frame (persist=false and persist=true), /detect/video, /detect/audio
  These call Claude Sonnet 4.5 via emergentintegrations. Uses real face JPEG & waveform PNG
  from /app/test_fixtures.
- History & analytics: /detections list & detail, /analytics/summary.
- Auth protection on all sensitive endpoints.
"""
import os
import base64
import uuid
import time
from datetime import datetime, timezone, timedelta

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

FIXTURES = "/app/test_fixtures"
FACE_JPG = f"{FIXTURES}/face.jpg"
WAVE_PNG = f"{FIXTURES}/waveform.png"

# --- Direct mongo access for seeding & cleanup ---
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
_mc = MongoClient(MONGO_URL)
_db = _mc[DB_NAME]


def _b64_file(p: str) -> str:
    with open(p, "rb") as f:
        return base64.b64encode(f.read()).decode()


@pytest.fixture(scope="session")
def face_b64():
    return _b64_file(FACE_JPG)


@pytest.fixture(scope="session")
def wave_b64():
    return _b64_file(WAVE_PNG)


@pytest.fixture(scope="session")
def seeded_session():
    """Seed a fresh test user + session_token directly in Mongo."""
    user_id = "user_test_" + uuid.uuid4().hex[:10]
    session_token = "sess_test_" + uuid.uuid4().hex
    now = datetime.now(timezone.utc)
    _db.users.insert_one({
        "user_id": user_id,
        "email": f"TEST_{user_id}@example.com",
        "name": "Test DeepGuard User",
        "picture": "",
        "created_at": now.isoformat(),
    })
    _db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (now + timedelta(days=7)).isoformat(),
        "created_at": now.isoformat(),
    })
    yield {"user_id": user_id, "session_token": session_token}
    # cleanup
    _db.user_sessions.delete_many({"user_id": user_id})
    _db.users.delete_many({"user_id": user_id})
    _db.detections.delete_many({"user_id": user_id})


@pytest.fixture(scope="session")
def auth_headers(seeded_session):
    return {
        "Authorization": f"Bearer {seeded_session['session_token']}",
        "Content-Type": "application/json",
    }


# ---------------- Health ----------------
class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("service") == "DeepGuard AI"
        assert data.get("status") == "online"


# ---------------- Auth ----------------
class TestAuth:
    def test_me_without_token_returns_401(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401

    def test_session_with_invalid_session_id_returns_401(self):
        r = requests.post(f"{API}/auth/session", json={"session_id": "invalid_" + uuid.uuid4().hex}, timeout=20)
        assert r.status_code == 401, r.text

    def test_session_missing_body_returns_400(self):
        r = requests.post(f"{API}/auth/session", json={}, timeout=15)
        assert r.status_code == 400

    def test_me_with_bearer_token(self, seeded_session, auth_headers):
        r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user_id"] == seeded_session["user_id"]
        assert data["email"].startswith("TEST_")
        assert data["name"] == "Test DeepGuard User"

    def test_protected_endpoints_require_auth(self):
        endpoints = [
            ("GET", "/detections"),
            ("GET", "/analytics/summary"),
            ("POST", "/detect/frame"),
            ("POST", "/detect/video"),
            ("POST", "/detect/audio"),
        ]
        for method, ep in endpoints:
            r = requests.request(method, f"{API}{ep}", json={}, timeout=10)
            assert r.status_code == 401, f"{method} {ep} expected 401, got {r.status_code}"


# ---------------- Detection + History (kept in same class so xdist loadscope
# pins them to one worker and shared state via class attrs works) ----------------
class TestDetection:
    def test_detect_frame_no_persist(self, auth_headers, face_b64):
        r = requests.post(
            f"{API}/detect/frame",
            headers=auth_headers,
            json={"image_base64": face_b64, "persist": False},
            timeout=120,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "fake_probability" in data
        assert isinstance(data["fake_probability"], (int, float))
        assert 0.0 <= float(data["fake_probability"]) <= 100.0
        assert data.get("verdict") in ("REAL", "FAKE")
        assert isinstance(data.get("artifacts", []), list)
        assert isinstance(data.get("reasoning", ""), str) and len(data["reasoning"]) > 0
        assert data.get("mode") == "webcam"
        assert isinstance(data.get("latency_ms"), int) and data["latency_ms"] > 0
        assert "faces_detected" in data
        # no persist => no detection_id
        assert "detection_id" not in data

    def test_detect_frame_with_persist(self, auth_headers, face_b64):
        r = requests.post(
            f"{API}/detect/frame",
            headers=auth_headers,
            json={"image_base64": face_b64, "persist": True},
            timeout=120,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("detection_id", "").startswith("det_")
        assert data.get("mode") == "webcam"
        assert data.get("thumbnail")  # should be present
        assert data.get("verdict") in ("REAL", "FAKE")
        # Persistence check
        pytest.detection_id_frame = data["detection_id"]

    def test_detect_video(self, auth_headers, face_b64):
        # Use 3 frames of the same real face image
        r = requests.post(
            f"{API}/detect/video",
            headers=auth_headers,
            json={"frames_base64": [face_b64, face_b64, face_b64], "filename": "TEST_video.mp4"},
            timeout=180,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("detection_id", "").startswith("det_")
        assert data.get("mode") == "video"
        assert data.get("verdict") in ("REAL", "FAKE")
        pytest.detection_id_video = data["detection_id"]

    def test_detect_video_empty_frames_returns_400(self, auth_headers):
        r = requests.post(
            f"{API}/detect/video",
            headers=auth_headers,
            json={"frames_base64": [], "filename": "empty.mp4"},
            timeout=15,
        )
        assert r.status_code == 400

    def test_detect_audio(self, auth_headers, wave_b64):
        r = requests.post(
            f"{API}/detect/audio",
            headers=auth_headers,
            json={"waveform_base64": wave_b64, "filename": "TEST_audio.wav", "duration_seconds": 3.5},
            timeout=120,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("detection_id", "").startswith("det_")
        assert data.get("mode") == "audio"
        assert data.get("verdict") in ("REAL", "FAKE")
        # audio should generally have faces_detected == 0
        assert data.get("faces_detected") == 0
        pytest.detection_id_audio = data["detection_id"]

    # ---------- History & analytics (same class -> same worker) ----------
    def test_list_detections(self, auth_headers, seeded_session):
        r = requests.get(f"{API}/detections", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 3
        modes = {i["mode"] for i in items}
        assert {"webcam", "video", "audio"}.issubset(modes)
        for it in items:
            assert "thumbnail" not in it
            assert it["user_id"] == seeded_session["user_id"]

    def test_get_detection_detail_includes_thumbnail(self, auth_headers):
        det_id = getattr(pytest, "detection_id_frame", None)
        assert det_id, "detection_id_frame not set - frame persist test must run first"
        r = requests.get(f"{API}/detections/{det_id}", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["detection_id"] == det_id
        assert data.get("thumbnail")

    def test_get_detection_not_found(self, auth_headers):
        r = requests.get(f"{API}/detections/det_does_not_exist", headers=auth_headers, timeout=10)
        assert r.status_code == 404

    def test_analytics_summary(self, auth_headers):
        r = requests.get(f"{API}/analytics/summary", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "total" in data and data["total"] >= 3
        assert "fakes" in data and "reals" in data
        assert data["total"] == data["fakes"] + data["reals"]
        assert isinstance(data["by_mode"], list)
        assert isinstance(data["by_verdict"], list)
        assert isinstance(data["recent"], list)


# Placeholder to keep any external references stable
class TestHistory:
    def test_placeholder_moved_to_TestDetection(self):
        assert True


# ---------------- Logout ----------------
class TestLogout:
    def test_logout_deletes_session(self, seeded_session):
        # create a new isolated session so we don't kill the shared one
        user_id = seeded_session["user_id"]
        tok = "sess_logout_" + uuid.uuid4().hex
        _db.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": tok,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        # verify token works
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"}, timeout=10)
        assert r.status_code == 200
        # logout with cookie
        s = requests.Session()
        s.cookies.set("session_token", tok)
        r = s.post(f"{API}/auth/logout", timeout=10)
        assert r.status_code == 200
        assert r.json().get("ok") is True
        # token should no longer work
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"}, timeout=10)
        assert r.status_code == 401
