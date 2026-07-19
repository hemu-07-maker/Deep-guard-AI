# DeepGuard AI – PRD

## Original problem statement
Real-time multi-modal deepfake detection platform. Webcam / video / audio detection, multi-face, live analytics dashboard, detection history, dark cyber/security aesthetic. User chose: Claude Sonnet 4.5, Emergent Google Auth, dark cyber theme.

Platform constraint: React + FastAPI + MongoDB (no GPU/PyTorch/Streamlit). Delivered as a working web console using Claude Sonnet 4.5 vision as the forensic analyzer, replacing on-device models.

## Personas
- **SOC / Threat-Intel Analyst** – runs live webcam sweeps, uploads suspicious clips, needs verdict + reasoning quickly.
- **Compliance / Trust & Safety Reviewer** – uses history + analytics as an audit trail.

## Core requirements (static)
1. Landing page with Emergent Google Auth CTA
2. Authenticated forensic dashboard: live webcam feed, faces, FPS, latency, fake probability, audio score, REAL/FAKE verdict
3. Video upload → per-frame Claude analysis
4. Audio upload → waveform → Claude analysis
5. Detection history (filterable) + analytics (charts)
6. Session cookie + Bearer token both accepted; timezone-aware expiry

## Implemented (2026-02-19)
- Backend `/app/backend/server.py`: full auth (`/api/auth/session`, `/api/auth/me`, `/api/auth/logout`), detection (`/api/detect/frame|video|audio`), history (`/api/detections`, `/api/detections/{id}`), analytics (`/api/analytics/summary`). Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) via `emergentintegrations` + `EMERGENT_LLM_KEY`.
- Frontend: React Router routes, `AuthProvider`, `AuthCallback` (hash session_id race-safe), `ProtectedRoute`, sidebar `Layout`, pages `Landing` / `Dashboard` / `Upload` / `History` / `Analytics`. Recharts for analytics; framer-motion for telemetry.
- Design: dark cyber theme, Outfit + IBM Plex Sans + JetBrains Mono, scanlines, cyan/red/green accents, threat glows.
- 17/17 backend pytest tests passing (auth, detection with real image, history, analytics).

## Backlog

### P0 — none blocking
### P1
- Replace fps mock with actual computed frame timings
- Live streaming responses (SSE) for detection to reduce perceived latency
- Grad-CAM-style heatmap overlay (ask Claude to output bounding-box coords)

### P2
- Export detection history to CSV
- Team workspaces & role-based access
- Webhooks for FAKE-only alerts
- Sora 2 / stress test datasets library

## Known limitations
- No GPU-side ML models; detection is LLM-based reasoning, not a trained CNN.
- Auth invalid provider response → 500 (see finding 1).
- `on_event("shutdown")` uses deprecated syntax.
- Thumbnail is a truncated base64 slice — future work: decode + resize.
