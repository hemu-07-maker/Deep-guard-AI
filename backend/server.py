"""
DeepGuard AI - FastAPI backend.
Handles: Emergent Google Auth, deepfake detection (frame/video/audio) via Claude Sonnet 4.5,
detection history persistence, and analytics.
"""
import os
import base64
import json
import logging
import re
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="DeepGuard AI")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("deepguard")

# ---------- Models ----------
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class DetectionResult(BaseModel):
    detection_id: str
    user_id: str
    mode: str  # "webcam" | "video" | "audio"
    fake_probability: float
    faces_detected: int
    verdict: str  # "REAL" | "FAKE"
    audio_score: Optional[float] = None
    latency_ms: int
    artifacts: List[str] = []
    reasoning: str
    thumbnail: Optional[str] = None  # base64 preview (optional, small)
    created_at: datetime

# ---------- Auth helper ----------
async def get_current_user(request: Request) -> User:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization") or ""
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    return User(**user_doc)

# ---------- Auth endpoints ----------
@api_router.post("/auth/session")
async def process_session(request: Request, response: Response):
    """Exchange session_id from Emergent auth for session_token cookie."""
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = r.json()

    email = data["email"]
    session_token = data["session_token"]

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name", ""), "picture": data.get("picture", "")}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60,
    )
    return {
        "user_id": user_id,
        "email": email,
        "name": data.get("name", ""),
        "picture": data.get("picture", ""),
    }

@api_router.get("/auth/me")
async def me(user: User = Depends(get_current_user)):
    return user.model_dump(mode="json")

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}

# ---------- Detection helpers ----------
DETECTION_SYSTEM = """You are DeepGuard AI, a forensic multimodal deepfake detector.
Given one or more still frames or a waveform image, analyze visual/audio artifacts that indicate
AI-generated / face-swapped / voice-cloned content. Consider: unnatural blending, blurred edges,
inconsistent lighting/shadows, warped facial features, eye/teeth artifacts, mismatched skin texture,
frequency-domain artifacts, unnatural audio waveform periodicity, robotic tone signatures.

Respond ONLY with strict JSON in this exact schema:
{
  "fake_probability": <float 0-100>,
  "faces_detected": <int>,
  "audio_score": <float 0-100 or null>,
  "verdict": "REAL" | "FAKE",
  "artifacts": [<short strings>],
  "reasoning": <one concise paragraph>
}
Return JSON only, no markdown, no prose outside the object.
"""

def _parse_json_response(text: str) -> dict:
    """Extract JSON object from LLM text (strip code fences if any)."""
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise ValueError("No JSON found in LLM response")
    return json.loads(m.group(0))

async def _analyze_with_claude(images_b64: List[str], mode: str, extra_text: str = "") -> dict:
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"deepguard-{uuid.uuid4().hex[:8]}",
        system_message=DETECTION_SYSTEM,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    user_prompt = {
        "webcam": "Analyze this webcam frame for deepfake / face-swap artifacts.",
        "video":  "Analyze these sampled video frames for deepfake / face-swap artifacts.",
        "audio":  "Analyze this audio waveform / spectrogram image for voice-cloning / TTS deepfake artifacts. faces_detected=0 for audio.",
        "photo":  "Analyze this still photo for deepfake / face-swap / AI-generated image artifacts. Consider: unnatural skin texture, warped features, GAN fingerprints, inconsistent lighting/shadows, diffusion-model artifacts, blended edges.",
    }.get(mode, "Analyze for deepfake artifacts.")
    if extra_text:
        user_prompt = f"{user_prompt}\n{extra_text}"

    file_contents = [ImageContent(image_base64=b) for b in images_b64]
    msg = UserMessage(text=user_prompt, file_contents=file_contents)
    reply = await chat.send_message(msg)
    text = reply if isinstance(reply, str) else str(reply)
    parsed = _parse_json_response(text)

    # Normalize
    fp = float(parsed.get("fake_probability", 0))
    fp = max(0.0, min(100.0, fp))
    parsed["fake_probability"] = fp
    parsed["verdict"] = "FAKE" if fp >= 50 else "REAL"
    if "faces_detected" not in parsed or parsed["faces_detected"] is None:
        parsed["faces_detected"] = 0
    parsed["faces_detected"] = int(parsed["faces_detected"])
    if "artifacts" not in parsed or not isinstance(parsed["artifacts"], list):
        parsed["artifacts"] = []
    parsed["reasoning"] = str(parsed.get("reasoning", ""))
    if "audio_score" in parsed and parsed["audio_score"] is not None:
        parsed["audio_score"] = float(parsed["audio_score"])
    else:
        parsed["audio_score"] = None
    return parsed

def _clean_b64(b64: str) -> str:
    if b64.startswith("data:"):
        return b64.split(",", 1)[1]
    return b64

async def _persist_detection(user_id: str, mode: str, parsed: dict, latency_ms: int, thumb: Optional[str] = None) -> DetectionResult:
    detection = DetectionResult(
        detection_id=f"det_{uuid.uuid4().hex[:12]}",
        user_id=user_id,
        mode=mode,
        fake_probability=parsed["fake_probability"],
        faces_detected=parsed["faces_detected"],
        verdict=parsed["verdict"],
        audio_score=parsed.get("audio_score"),
        latency_ms=latency_ms,
        artifacts=parsed["artifacts"],
        reasoning=parsed["reasoning"],
        thumbnail=thumb,
        created_at=datetime.now(timezone.utc),
    )
    doc = detection.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.detections.insert_one(doc)
    return detection

# ---------- Detection endpoints ----------
class FrameInput(BaseModel):
    image_base64: str
    persist: bool = False  # only persist explicit user actions, not every live tick

@api_router.post("/detect/frame")
async def detect_frame(payload: FrameInput, user: User = Depends(get_current_user)):
    start = datetime.now(timezone.utc)
    b64 = _clean_b64(payload.image_base64)
    parsed = await _analyze_with_claude([b64], mode="webcam")
    latency_ms = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
    thumb = b64[:200000] if payload.persist else None
    if payload.persist:
        det = await _persist_detection(user.user_id, "webcam", parsed, latency_ms, thumb)
        return det.model_dump(mode="json")
    return {**parsed, "latency_ms": latency_ms, "mode": "webcam"}

class PhotoInput(BaseModel):
    image_base64: str
    filename: Optional[str] = None

@api_router.post("/detect/photo")
async def detect_photo(payload: PhotoInput, user: User = Depends(get_current_user)):
    b64 = _clean_b64(payload.image_base64)
    start = datetime.now(timezone.utc)
    parsed = await _analyze_with_claude([b64], mode="photo",
                                        extra_text=f"Filename: {payload.filename or 'upload'}.")
    latency_ms = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
    thumb = b64[:200000]
    det = await _persist_detection(user.user_id, "photo", parsed, latency_ms, thumb)
    return det.model_dump(mode="json")

class VideoFramesInput(BaseModel):
    frames_base64: List[str]  # sampled frames extracted client-side
    filename: Optional[str] = None

@api_router.post("/detect/video")
async def detect_video(payload: VideoFramesInput, user: User = Depends(get_current_user)):
    if not payload.frames_base64:
        raise HTTPException(status_code=400, detail="No frames provided")
    frames = [_clean_b64(f) for f in payload.frames_base64[:6]]  # cap at 6 frames
    start = datetime.now(timezone.utc)
    parsed = await _analyze_with_claude(frames, mode="video",
                                        extra_text=f"Filename: {payload.filename or 'upload'}. Frames sampled uniformly across the video.")
    latency_ms = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
    thumb = frames[0][:200000] if frames else None
    det = await _persist_detection(user.user_id, "video", parsed, latency_ms, thumb)
    return det.model_dump(mode="json")

class AudioWaveInput(BaseModel):
    waveform_base64: str  # PNG of waveform rendered client-side
    filename: Optional[str] = None
    duration_seconds: Optional[float] = None

@api_router.post("/detect/audio")
async def detect_audio(payload: AudioWaveInput, user: User = Depends(get_current_user)):
    b64 = _clean_b64(payload.waveform_base64)
    start = datetime.now(timezone.utc)
    extra = f"Filename: {payload.filename or 'upload'}."
    if payload.duration_seconds:
        extra += f" Duration: {payload.duration_seconds:.2f}s."
    parsed = await _analyze_with_claude([b64], mode="audio", extra_text=extra)
    latency_ms = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
    thumb = b64[:200000]
    det = await _persist_detection(user.user_id, "audio", parsed, latency_ms, thumb)
    return det.model_dump(mode="json")

# ---------- History & analytics ----------
@api_router.get("/detections")
async def list_detections(user: User = Depends(get_current_user), limit: int = 50, mode: Optional[str] = None):
    query = {"user_id": user.user_id}
    if mode:
        query["mode"] = mode
    cursor = db.detections.find(query, {"_id": 0, "thumbnail": 0}).sort("created_at", -1).limit(limit)
    items = await cursor.to_list(length=limit)
    return items

@api_router.get("/detections/{detection_id}")
async def get_detection(detection_id: str, user: User = Depends(get_current_user)):
    doc = await db.detections.find_one({"detection_id": detection_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return doc

@api_router.get("/analytics/summary")
async def analytics(user: User = Depends(get_current_user)):
    pipeline_mode = [
        {"$match": {"user_id": user.user_id}},
        {"$group": {"_id": "$mode", "count": {"$sum": 1}, "avg_fake": {"$avg": "$fake_probability"}}},
    ]
    pipeline_verdict = [
        {"$match": {"user_id": user.user_id}},
        {"$group": {"_id": "$verdict", "count": {"$sum": 1}}},
    ]
    by_mode = await db.detections.aggregate(pipeline_mode).to_list(20)
    by_verdict = await db.detections.aggregate(pipeline_verdict).to_list(10)

    # Last 30 days timeline
    recent = await db.detections.find(
        {"user_id": user.user_id},
        {"_id": 0, "created_at": 1, "fake_probability": 1, "verdict": 1},
    ).sort("created_at", -1).limit(200).to_list(200)

    total = await db.detections.count_documents({"user_id": user.user_id})
    fakes = await db.detections.count_documents({"user_id": user.user_id, "verdict": "FAKE"})
    return {
        "total": total,
        "fakes": fakes,
        "reals": total - fakes,
        "by_mode": by_mode,
        "by_verdict": by_verdict,
        "recent": recent,
    }

# ---------- health ----------
@api_router.get("/")
async def root():
    return {"service": "DeepGuard AI", "status": "online"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
