import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload as UploadIcon, FileVideo, FileAudio } from "lucide-react";
import { api } from "@/lib/api";
import { Verdict, Metric, Gauge } from "@/components/DetectionWidgets";

async function extractFramesFromVideo(file, count = 5) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url; video.muted = true; video.playsInline = true; video.crossOrigin = "anonymous";
    video.onloadedmetadata = async () => {
      const canvas = document.createElement("canvas");
      const w = 640, h = Math.round((video.videoHeight / video.videoWidth) * 640) || 360;
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      const frames = [];
      const duration = Math.max(0.2, video.duration);
      for (let i = 0; i < count; i++) {
        const t = (duration * (i + 0.5)) / count;
        await new Promise((res) => {
          const onSeeked = () => { video.removeEventListener("seeked", onSeeked); res(); };
          video.addEventListener("seeked", onSeeked);
          video.currentTime = Math.min(t, duration - 0.05);
        });
        ctx.drawImage(video, 0, 0, w, h);
        frames.push(canvas.toDataURL("image/jpeg", 0.75));
      }
      URL.revokeObjectURL(url);
      resolve(frames);
    };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to read video")); };
  });
}

async function renderAudioWaveform(file) {
  const arrayBuf = await file.arrayBuffer();
  const AC = window.AudioContext || window.webkitAudioContext;
  const ac = new AC();
  const buf = await ac.decodeAudioData(arrayBuf.slice(0));
  const raw = buf.getChannelData(0);
  const W = 900, H = 300;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, W, H);
  // grid
  ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // waveform
  const step = Math.max(1, Math.floor(raw.length / W));
  ctx.strokeStyle = "#00DDEB"; ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = 0; x < W; x++) {
    let min = 1, max = -1;
    for (let j = 0; j < step; j++) {
      const v = raw[x * step + j] || 0;
      if (v < min) min = v; if (v > max) max = v;
    }
    const y1 = ((1 - max) * H) / 2;
    const y2 = ((1 - min) * H) / 2;
    ctx.moveTo(x, y1); ctx.lineTo(x, y2);
  }
  ctx.stroke();
  ac.close();
  return { image: canvas.toDataURL("image/png"), duration: buf.duration };
}

export default function UploadPage() {
  const videoInput = useRef(null);
  const audioInput = useRef(null);
  const [busyKind, setBusyKind] = useState(null); // "video" | "audio"
  const [videoResult, setVideoResult] = useState(null);
  const [audioResult, setAudioResult] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [audioWave, setAudioWave] = useState(null);

  async function onVideo(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusyKind("video");
    setVideoResult(null);
    try {
      const previewUrl = URL.createObjectURL(f);
      setVideoPreview(previewUrl);
      toast.info("Extracting frames...");
      const frames = await extractFramesFromVideo(f, 5);
      toast.info("Analyzing with Claude Sonnet 4.5...");
      const r = await api.post("/detect/video", { frames_base64: frames, filename: f.name });
      setVideoResult(r.data);
      toast.success(`Video verdict: ${r.data.verdict}`);
    } catch (err) {
      toast.error("Video analysis failed");
    } finally {
      setBusyKind(null);
      e.target.value = "";
    }
  }

  async function onAudio(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusyKind("audio");
    setAudioResult(null);
    try {
      toast.info("Rendering waveform...");
      const { image, duration } = await renderAudioWaveform(f);
      setAudioWave(image);
      toast.info("Analyzing with Claude Sonnet 4.5...");
      const r = await api.post("/detect/audio", { waveform_base64: image, filename: f.name, duration_seconds: duration });
      setAudioResult(r.data);
      toast.success(`Audio verdict: ${r.data.verdict}`);
    } catch (err) {
      toast.error("Audio analysis failed");
    } finally {
      setBusyKind(null);
      e.target.value = "";
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">// 02 · Upload Analysis</div>
        <h1 className="font-display font-bold text-3xl mt-1">Video &amp; Audio Forensics</h1>
        <p className="text-slate-400 mt-2 text-sm">Upload a clip. We sample uniformly-distributed frames and audio waveforms, then run Claude Sonnet 4.5 forensic analysis.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VIDEO */}
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileVideo className="w-4 h-4 text-cyan-400" />
              <div className="font-display font-semibold">Video Deepfake Detection</div>
            </div>
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono uppercase text-[11px] tracking-widest transition-colors" data-testid="video-upload-label">
              {busyKind === "video" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadIcon className="w-3.5 h-3.5" />}
              Upload MP4
              <input ref={videoInput} onChange={onVideo} type="file" accept="video/*" className="hidden" data-testid="video-file-input" disabled={busyKind !== null} />
            </label>
          </div>

          <div className="mt-4 aspect-video bg-black border border-white/10 relative overflow-hidden">
            <div className="scanlines absolute inset-0 opacity-30 pointer-events-none" />
            {videoPreview ? (
              <video src={videoPreview} controls className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="font-mono text-xs uppercase tracking-widest text-slate-500">No file selected</div>
              </div>
            )}
          </div>

          {videoResult && (
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between">
                <Verdict verdict={videoResult.verdict} />
                <div className="font-mono text-[11px] text-slate-500">{videoResult.latency_ms}ms · {videoResult.faces_detected} face(s)</div>
              </div>
              <Gauge label="Fake Probability" value={videoResult.fake_probability} isThreat={videoResult.fake_probability >= 50} testid="video-fake-gauge" />
              <div className="text-sm text-slate-300 leading-relaxed">{videoResult.reasoning}</div>
              {videoResult.artifacts?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {videoResult.artifacts.map((a, i) => (
                    <span key={i} className="font-mono text-[10px] uppercase tracking-wider border border-white/10 px-2 py-1 text-slate-300">{a}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* AUDIO */}
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileAudio className="w-4 h-4 text-cyan-400" />
              <div className="font-display font-semibold">Audio Deepfake Detection</div>
            </div>
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono uppercase text-[11px] tracking-widest transition-colors" data-testid="audio-upload-label">
              {busyKind === "audio" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadIcon className="w-3.5 h-3.5" />}
              Upload Audio
              <input ref={audioInput} onChange={onAudio} type="file" accept="audio/*" className="hidden" data-testid="audio-file-input" disabled={busyKind !== null} />
            </label>
          </div>

          <div className="mt-4 aspect-video bg-black border border-white/10 relative overflow-hidden flex items-center justify-center">
            <div className="scanlines absolute inset-0 opacity-30 pointer-events-none" />
            {audioWave ? (
              <img src={audioWave} alt="waveform" className="w-full h-full object-contain" />
            ) : (
              <div className="font-mono text-xs uppercase tracking-widest text-slate-500">No file selected</div>
            )}
          </div>

          {audioResult && (
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between">
                <Verdict verdict={audioResult.verdict} />
                <div className="font-mono text-[11px] text-slate-500">{audioResult.latency_ms}ms</div>
              </div>
              <Gauge label="Fake Probability" value={audioResult.fake_probability} isThreat={audioResult.fake_probability >= 50} testid="audio-fake-gauge" />
              <div className="text-sm text-slate-300 leading-relaxed">{audioResult.reasoning}</div>
              {audioResult.artifacts?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {audioResult.artifacts.map((a, i) => (
                    <span key={i} className="font-mono text-[10px] uppercase tracking-wider border border-white/10 px-2 py-1 text-slate-300">{a}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
