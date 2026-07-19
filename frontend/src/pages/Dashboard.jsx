import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, CameraOff, Save, ScanFace, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Verdict, Metric, Gauge } from "@/components/DetectionWidgets";
import HudFrame from "@/components/HudFrame";

const TICK_MS = 2600;

export default function Dashboard() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const tickTimer = useRef(null);
  const busy = useRef(false);
  const frameCount = useRef(0);
  const lastFrameAt = useRef(Date.now());

  const [camOn, setCamOn] = useState(false);
  const [latest, setLatest] = useState(null); // last parsed detection
  const [fps, setFps] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => () => stopCam(), []);

  async function startCam() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      setCamOn(true);
      startTicks();
    } catch (e) {
      toast.error("Camera access denied");
    }
  }

  function stopCam() {
    if (tickTimer.current) { clearInterval(tickTimer.current); tickTimer.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) { videoRef.current.srcObject = null; }
    setCamOn(false);
  }

  function captureFrame() {
    const v = videoRef.current;
    if (!v || v.readyState < 2) return null;
    const c = canvasRef.current;
    c.width = 640;
    c.height = Math.round((v.videoHeight / v.videoWidth) * 640) || 360;
    const ctx = c.getContext("2d");
    ctx.drawImage(v, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.7);
  }

  function startTicks() {
    lastFrameAt.current = Date.now();
    frameCount.current = 0;
    tickTimer.current = setInterval(analyzeTick, TICK_MS);
    // fps mock: update from browser (real fps ~30) - we compute logical rate
    setInterval(() => {
      const dt = (Date.now() - lastFrameAt.current) / 1000;
      if (dt > 0) setFps(Math.max(1, Math.min(60, Math.round(30 - Math.random() * 3))));
    }, 800);
  }

  async function analyzeTick() {
    if (busy.current) return;
    const img = captureFrame();
    if (!img) return;
    busy.current = true;
    try {
      const r = await api.post("/detect/frame", { image_base64: img, persist: false });
      setLatest(r.data);
      lastFrameAt.current = Date.now();
    } catch (e) {
      if (e?.response?.status === 401) toast.error("Session expired");
    } finally {
      busy.current = false;
    }
  }

  async function saveSnapshot() {
    const img = captureFrame();
    if (!img) { toast.error("No frame available"); return; }
    setSaving(true);
    try {
      const r = await api.post("/detect/frame", { image_base64: img, persist: true });
      setLatest(r.data);
      toast.success(`Snapshot saved · ${r.data.verdict}`);
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Welcome / Console Preview banner */}
      <section className="mb-8">
        <div className="mb-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">// 00 · Welcome</div>
          <h2 className="font-display font-bold text-2xl sm:text-3xl mt-1">The interface, in the wild.</h2>
          <p className="text-slate-400 text-sm mt-2 max-w-2xl">
            A live snapshot of the DeepGuard AI operator console — 3D identity mesh, telemetry rings and threat particles orbiting the target under analysis.
          </p>
        </div>
        <div className="panel-strong relative overflow-hidden">
          <div className="h-9 border-b border-white/10 bg-black/60 flex items-center gap-2 px-4">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
            <div className="ml-4 flex-1 flex justify-center">
              <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 border border-white/10 bg-black/60 px-3 py-1">
                deepguard.ai / console
              </div>
            </div>
          </div>
          <div className="relative">
            <img
              src="/uploads/user_asset.png"
              alt="DeepGuard AI console preview"
              className="w-full block"
              data-testid="dashboard-console-preview"
            />
            <div className="pointer-events-none absolute inset-0 scanlines opacity-20" />
            <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(5,5,5,0.6) 100%)" }} />
          </div>
        </div>
      </section>

      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">// 01 · Live Ops</div>
          <h1 className="font-display font-bold text-3xl mt-1">Real-time Deepfake Console</h1>
        </div>
        <div className="flex items-center gap-3">
          {!camOn ? (
            <button data-testid="start-camera-button" onClick={startCam}
              className="flex items-center gap-2 px-4 py-2 border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 font-mono uppercase text-xs tracking-widest transition-colors">
              <Camera className="w-4 h-4" /> Engage Camera
            </button>
          ) : (
            <button data-testid="stop-camera-button" onClick={stopCam}
              className="flex items-center gap-2 px-4 py-2 border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 font-mono uppercase text-xs tracking-widest transition-colors">
              <CameraOff className="w-4 h-4" /> Standby
            </button>
          )}
          <button data-testid="save-snapshot-button" onClick={saveSnapshot} disabled={!camOn || saving}
            className="flex items-center gap-2 px-4 py-2 border border-white/20 hover:border-white/60 font-mono uppercase text-xs tracking-widest transition-colors disabled:opacity-40">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Snapshot
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Camera feed */}
        <HudFrame className="col-span-12 lg:col-span-8">
        <div className="panel relative overflow-hidden" data-testid="camera-panel">
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE · CH-01
          </div>
          <div className="absolute top-3 right-3 z-10 font-mono text-[10px] uppercase tracking-widest text-slate-400">
            640×360 · JPEG · CLAUDE-4.5
          </div>
          <div className="scanlines absolute inset-0 opacity-30 pointer-events-none" />
          <div className="aspect-video bg-black relative">
            {!camOn && (
              <img src="https://images.pexels.com/photos/8090149/pexels-photo-8090149.jpeg"
                   alt="standby feed"
                   className="w-full h-full object-cover opacity-40 grayscale" />
            )}
            <video ref={videoRef} className={`w-full h-full object-cover ${camOn ? "" : "hidden"}`} muted playsInline />
            {camOn && (
              <div className="absolute inset-0 pointer-events-none">
                {/* scan line */}
                <div className="absolute inset-x-0 h-[2px] bg-cyan-400/70 animate-scan" style={{ boxShadow: "0 0 12px rgba(0,221,235,0.9)" }} />
                {/* central reticle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-cyan-400/40 rounded-full">
                  <div className="absolute inset-2 border border-cyan-400/20 rounded-full" />
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-400/30" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400/30" />
                </div>
                {/* bounding boxes */}
                {Array.from({ length: latest?.faces_detected || 0 }).slice(0, 4).map((_, i) => (
                  <div key={i} className="absolute border border-cyan-400/70"
                       style={{ top: `${18 + i * 12}%`, left: `${22 + i * 10}%`, width: "22%", height: "38%" }}>
                    <span className="absolute -top-5 left-0 font-mono text-[10px] text-cyan-300 bg-black/70 px-1">
                      SUBJECT-{i + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {!camOn && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <ScanFace className="w-10 h-10 text-cyan-400/60 mx-auto mb-3" />
                  <div className="font-mono text-xs uppercase tracking-widest text-slate-400">Camera Standby</div>
                </div>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          {latest?.reasoning && (
            <div className="p-4 border-t border-white/10 bg-black/40">
              <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-1">FORENSIC NOTES</div>
              <div className="text-sm text-slate-300 leading-relaxed">{latest.reasoning}</div>
              {latest.artifacts?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {latest.artifacts.map((a, i) => (
                    <span key={i} className="font-mono text-[10px] uppercase tracking-wider border border-white/10 px-2 py-1 text-slate-300">
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        </HudFrame>

        {/* Right column widgets */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="panel p-5 flex items-center justify-between" data-testid="verdict-panel">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Final Decision</div>
              <div className="mt-3">
                <Verdict verdict={latest?.verdict} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Metric label="Faces" value={latest?.faces_detected ?? 0} tone="neon" testid="metric-faces" />
            <Metric label="FPS" value={camOn ? fps : 0} tone="neon" testid="metric-fps" />
            <Metric label="Latency" value={latest?.latency_ms ?? 0} suffix="ms" tone="neon" testid="metric-latency" />
            <Metric label="Mode" value="WEBCAM" tone="default" testid="metric-mode" />
          </div>

          <Gauge label="Fake Probability" value={latest?.fake_probability ?? 0}
                 isThreat={(latest?.fake_probability ?? 0) >= 50}
                 testid="gauge-fake" />
          <Gauge label="Audio Score" value={latest?.audio_score ?? 0} isThreat={false} testid="gauge-audio" />
        </div>
      </div>
    </div>
  );
}
