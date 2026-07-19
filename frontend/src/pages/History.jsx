import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, Filter } from "lucide-react";

const MODES = ["all", "webcam", "video", "audio"];

export default function History() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("all");

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const r = await api.get("/detections", { params: mode === "all" ? {} : { mode } });
        if (!cancel) setItems(r.data);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [mode]);

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">// 03 · Audit Log</div>
          <h1 className="font-display font-bold text-3xl mt-1">Detection History</h1>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          {MODES.map((m) => (
            <button
              key={m}
              data-testid={`filter-${m}`}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 font-mono uppercase text-[10px] tracking-widest border transition-colors ${
                mode === m ? "border-cyan-400 text-cyan-300 bg-cyan-500/10" : "border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="panel overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> loading...
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm font-mono text-slate-500">No detections logged yet.</div>
        ) : (
          <table className="w-full text-sm" data-testid="history-table">
            <thead>
              <tr className="border-b border-white/10 text-left">
                {["Timestamp", "Mode", "Faces", "Fake %", "Latency", "Verdict", "Artifacts"].map((h) => (
                  <th key={h} className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-slate-500 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.detection_id} className="border-b border-white/5 hover:bg-white/[0.03]" data-testid={`row-${it.detection_id}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{String(it.created_at).replace("T", " ").slice(0, 19)}</td>
                  <td className="px-4 py-3 font-mono text-xs uppercase tracking-widest">{it.mode}</td>
                  <td className="px-4 py-3 font-mono text-xs">{it.faces_detected}</td>
                  <td className={`px-4 py-3 font-mono text-xs ${it.fake_probability >= 50 ? "text-red-400" : "text-green-400"}`}>
                    {Number(it.fake_probability).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{it.latency_ms}ms</td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-1 border ${
                      it.verdict === "FAKE"
                        ? "border-red-500/50 text-red-300 bg-red-500/10"
                        : "border-green-500/50 text-green-300 bg-green-500/10"
                    }`}>
                      {it.verdict}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">{(it.artifacts || []).slice(0, 3).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
