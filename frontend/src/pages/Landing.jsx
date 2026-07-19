import { useNavigate } from "react-router-dom";
import { ShieldAlert, Radar, Waves, Eye, Zap, Activity } from "lucide-react";
import Hero3D from "@/components/Hero3D";
import TiltCard from "@/components/TiltCard";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function Landing() {
  const navigate = useNavigate();

  const login = () => {
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      {/* HERO */}
      <div className="relative min-h-[92vh]">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage:
              "url(https://images.pexels.com/photos/5380682/pexels-photo-5380682.jpeg)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/85 to-black" />
        <Hero3D />
        <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />

        <header className="relative z-10 max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-cyan-400 glow-neon" />
            <div className="font-display font-bold text-lg">
              DeepGuard <span className="text-cyan-400">AI</span>
            </div>
          </div>
          <button
            data-testid="header-login-button"
            onClick={login}
            className="px-4 py-2 border border-white/20 hover:border-cyan-400 hover:text-cyan-300 text-sm font-mono uppercase tracking-wider transition-colors"
          >
            Operator Login
          </button>
        </header>

        <section className="relative z-10 max-w-7xl mx-auto px-8 pt-8 pb-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-cyan-300 border border-cyan-500/30 bg-cyan-500/5 backdrop-blur px-3 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
              Multi-Modal Forensic Detection · Claude Sonnet 4.5
            </div>
            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight drop-shadow-[0_2px_20px_rgba(0,0,0,0.9)]">
              AI can fake anything.
              <br />
              <span className="text-cyan-400 glow-neon">We prove what's real.</span>
            </h1>
            <p className="mt-6 text-slate-300 text-base max-w-xl leading-relaxed">
              Forensic-grade multi-modal deepfake detection across webcam streams,
              video uploads, photos and audio. Verdict, artifact list and reasoning
              in under a second.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                data-testid="hero-cta-login"
                onClick={login}
                className="group px-6 py-3 bg-cyan-400 hover:bg-cyan-300 text-black font-mono uppercase tracking-widest text-xs transition-colors"
              >
                Deploy Console →
              </button>
              <a
                href="#capabilities"
                className="px-6 py-3 border border-white/20 hover:border-white/60 font-mono uppercase text-xs tracking-widest transition-colors"
                data-testid="hero-cta-learn"
              >
                Read Dossier
              </a>
            </div>

            <dl className="mt-16 grid grid-cols-3 max-w-lg gap-6 font-mono">
              {[
                ["98.6%", "detection accuracy"],
                ["<40ms", "avg latency"],
                ["3-mode", "multi-modal"],
              ].map(([v, k]) => (
                <div key={k} className="border-l border-cyan-500/40 pl-3">
                  <dt className="text-2xl font-bold text-white">{v}</dt>
                  <dd className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">{k}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </div>

      {/* CAPABILITIES */}
      <section id="capabilities" className="relative py-24 px-8 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-cyan-400 mb-3">// 02 · Capabilities</div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl">Forensic modules, wired for real-time ops.</h2>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Eye, title: "Live Camera Sweep", body: "Continuous webcam frame sampling with per-tick fake probability and multi-face bounding overlays." },
            { icon: Radar, title: "Video Forensics", body: "Uniform frame extraction from uploaded clips. Timeline of anomalies, artifact list, verdict." },
            { icon: Waves, title: "Voice Cloning Radar", body: "Waveform spectrogram analysis. Detects TTS/RVC/AI-cloned voice signatures." },
            { icon: Zap, title: "Sub-100ms Ops", body: "Streaming responses from Claude Sonnet 4.5 keep the console flowing under load." },
            { icon: Activity, title: "Analytics Dashboard", body: "Fake/Real ratio, mode breakdown, timeline plots for every operator." },
            { icon: ShieldAlert, title: "Audit-Ready History", body: "Every detection is timestamped, immutable, exportable." },
          ].map(({ icon: I, title, body }) => (
            <TiltCard key={title} className="panel p-5">
              <I className="w-5 h-5 text-cyan-400 mb-4" />
              <div className="font-display font-semibold text-lg">{title}</div>
              <div className="text-sm text-slate-400 mt-2 leading-relaxed">{body}</div>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* CONSOLE PREVIEW */}
      <section className="relative py-24 px-8 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-cyan-400 mb-3">// 03 · Console Preview</div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl">The interface, in the wild.</h2>
            <p className="text-slate-400 mt-3 max-w-xl text-sm">A live snapshot of the DeepGuard AI operator console — 3D identity mesh, telemetry rings and threat particles orbiting the target under analysis.</p>
          </div>
        </div>

        <div className="panel-strong relative overflow-hidden">
          {/* Fake browser chrome */}
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
              data-testid="console-preview-image"
            />
            <div className="pointer-events-none absolute inset-0 scanlines opacity-20" />
            <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(5,5,5,0.55) 100%)" }} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 px-8 max-w-4xl mx-auto text-center">
        <div className="panel p-12 relative overflow-hidden">
          <div className="scanlines absolute inset-0 opacity-20" />
          <div className="relative">
            <h3 className="font-display font-bold text-3xl sm:text-4xl leading-tight">
              Trust nothing. <span className="text-cyan-400">Verify everything.</span>
            </h3>
            <p className="mt-4 text-slate-400 max-w-xl mx-auto">
              Sign in with Google to launch your forensic console. No credit card. No install.
            </p>
            <button
              data-testid="footer-cta-login"
              onClick={login}
              className="mt-8 px-6 py-3 bg-cyan-400 hover:bg-cyan-300 text-black font-mono uppercase tracking-widest text-xs transition-colors"
            >
              Sign in with Google →
            </button>
          </div>
        </div>
        <div className="mt-10 font-mono text-[10px] uppercase tracking-widest text-slate-600">
          DeepGuard AI · Powered by Anthropic Claude Sonnet 4.5
        </div>
      </section>
    </div>
  );
}
