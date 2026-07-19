import { motion } from "framer-motion";

export function Verdict({ verdict, size = "lg" }) {
  const isFake = verdict === "FAKE";
  const color = isFake ? "text-red-400" : "text-green-400";
  const border = isFake ? "border-red-500/60" : "border-green-500/60";
  const bg = isFake ? "bg-red-500/10" : "bg-green-500/10";
  const glow = isFake ? "glow-threat" : "glow-safe";
  const font = size === "lg" ? "text-4xl" : "text-2xl";
  return (
    <div
      className={`inline-flex items-center gap-3 border ${border} ${bg} ${glow} px-4 py-2`}
      data-testid={`verdict-${verdict?.toLowerCase()}`}
    >
      <span className={`w-2 h-2 rounded-full ${isFake ? "bg-red-500" : "bg-green-400"} animate-pulse`} />
      <span className={`font-mono font-bold ${font} tracking-widest ${color}`}>{verdict || "—"}</span>
    </div>
  );
}

export function Metric({ label, value, suffix, tone = "default", testid }) {
  const toneClass =
    tone === "threat" ? "text-red-400"
    : tone === "safe" ? "text-green-400"
    : tone === "neon" ? "text-cyan-300"
    : "text-white";
  return (
    <div className="panel p-4" data-testid={testid}>
      <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <motion.div
        key={String(value)}
        initial={{ opacity: 0.4, y: 2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className={`font-mono font-bold text-2xl mt-2 ${toneClass}`}
      >
        {value}
        {suffix ? <span className="text-sm text-slate-500 ml-1">{suffix}</span> : null}
      </motion.div>
    </div>
  );
}

export function Gauge({ label, value, isThreat, testid }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const color = isThreat ? "#FF3B30" : "#00E676";
  return (
    <div className="panel p-4" data-testid={testid}>
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
        <div className="font-mono text-sm" style={{ color }}>{pct.toFixed(1)}%</div>
      </div>
      <div className="mt-3 h-2 bg-white/5 border border-white/10 relative overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
    </div>
  );
}
