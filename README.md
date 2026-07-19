# DeepGuard AI

**Forensic-grade multi-modal deepfake detection platform.**
Real-time webcam, video, photo and audio deepfake analysis powered by Claude Sonnet 4.5, with a dark cyber SOC-style operator console.

> *"Trust nothing. Verify everything."* — Forensic Ops Doctrine

---

## Features

- **Live webcam detection** — auto-tick frame sampling with per-frame verdict, faces, FPS, latency
- **Video upload analysis** — client-side uniform frame sampling + multi-frame Claude reasoning
- **Photo detection** — single-image deepfake / face-swap / diffusion-artifact scoring
- **Audio detection** — client-rendered waveform → Claude spectrogram analysis
- **Detection history** — filterable audit table (webcam / photo / video / audio)
- **Analytics dashboard** — Recharts (fake ratio, verdict pie, timeline, mode breakdown)
- **Emergent Google Auth** — httpOnly secure session cookie + Bearer fallback
- **Dark cyber aesthetic** — 3D wireframe hero (react-three-fiber), HUD corner brackets, scanlines, glow accents

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, React Router 7, TailwindCSS, shadcn/ui, Recharts, framer-motion, react-three-fiber, three.js |
| Backend | FastAPI, Motor (async MongoDB), Pydantic v2, emergentintegrations (Claude Sonnet 4.5) |
| Database | MongoDB |
| LLM | Anthropic Claude Sonnet 4.5 via `emergentintegrations` + Emergent Universal LLM key |
| Auth | Emergent-managed Google OAuth |

## Project structure

```
deepguard-ai/
├── backend/
│   ├── server.py          # FastAPI app: auth + detection + history + analytics
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── pages/         # Landing, Dashboard, Upload, History, Analytics
│   │   ├── components/    # Layout, Hero3D, HudFrame, TiltCard, AuthCallback, DetectionWidgets, PageTransition, AmbientParticles
│   │   ├── context/       # AuthContext
│   │   └── lib/           # api.js
│   ├── package.json
│   └── .env.example
└── README.md
```

## Local development

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set MONGO_URL, DB_NAME, EMERGENT_LLM_KEY
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

Get your `EMERGENT_LLM_KEY` from the Emergent dashboard (Profile → Universal Key).

### 2. Frontend

```bash
cd frontend
yarn install
cp .env.example .env
# Edit .env: point REACT_APP_BACKEND_URL at your backend
yarn start
```

Open http://localhost:3000

### 3. MongoDB

Any MongoDB 5+ instance works. For local:

```bash
docker run -d --name mongo -p 27017:27017 mongo:7
```

## API surface (all under `/api`)

### Auth
| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/session` | Exchange Emergent OAuth `session_id` for httpOnly cookie |
| GET  | `/auth/me` | Current user (cookie or Bearer) |
| POST | `/auth/logout` | Invalidate session |

### Detection
| Method | Path | Body |
|---|---|---|
| POST | `/detect/frame` | `{ image_base64, persist }` — webcam frame |
| POST | `/detect/photo` | `{ image_base64, filename }` — still image |
| POST | `/detect/video` | `{ frames_base64: [], filename }` — sampled frames |
| POST | `/detect/audio` | `{ waveform_base64, filename, duration_seconds }` |

### History & Analytics
| Method | Path |
|---|---|
| GET | `/detections?mode=&limit=` |
| GET | `/detections/{detection_id}` |
| GET | `/analytics/summary` |

## Design system

- **Fonts**: Outfit (display), IBM Plex Sans (body), JetBrains Mono (metrics)
- **Palette**: `#050505` background · cyan `#00DDEB` accent · threat-red `#FF3B30` · safe-green `#00E676`
- **Motifs**: 1px crisp borders, HUD corner brackets, scanlines, radial vignettes, particle fields, wireframe 3D mesh

## License

MIT — see LICENSE.

## Credits

- LLM analysis via [Anthropic Claude Sonnet 4.5](https://www.anthropic.com/claude)
- Built on the [Emergent](https://emergent.sh) platform
- Landing image references: Pexels
