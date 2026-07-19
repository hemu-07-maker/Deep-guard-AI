import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Loader2 } from "lucide-react";

const COLORS = { FAKE: "#FF3B30", REAL: "#00E676" };

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/analytics/summary");
        setData(r.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> loading...</div>;
  }
  if (!data) return null;

  const byModeData = (data.by_mode || []).map(m => ({ mode: m._id, count: m.count, avg: Number(m.avg_fake || 0).toFixed(1) }));
  const byVerdict = (data.by_verdict || []).map(v => ({ name: v._id, value: v.count }));

  const timeline = [...(data.recent || [])].reverse().map((d, i) => ({
    idx: i + 1, fake: d.fake_probability, verdict: d.verdict,
  }));

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">// 04 · Intel</div>
        <h1 className="font-display font-bold text-3xl mt-1">Threat Analytics</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ["Total Scans", data.total, "text-cyan-300"],
          ["Fakes Detected", data.fakes, "text-red-400"],
          ["Verified Real", data.reals, "text-green-400"],
          ["Fake Ratio", `${data.total ? ((data.fakes / data.total) * 100).toFixed(1) : 0}%`, "text-white"],
        ].map(([label, v, cls]) => (
          <div key={label} className="panel p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
            <div className={`font-mono font-bold text-3xl mt-2 ${cls}`}>{v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel p-5 lg:col-span-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-3">Recent Fake Probability Trend</div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={timeline}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="idx" stroke="#64748B" tick={{ fill: "#64748B", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                <YAxis domain={[0, 100]} stroke="#64748B" tick={{ fill: "#64748B", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                <Tooltip contentStyle={{ background: "#050505", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "JetBrains Mono", fontSize: 12 }} />
                <Line type="monotone" dataKey="fake" stroke="#00DDEB" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-3">Verdict Distribution</div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byVerdict} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50} stroke="#050505">
                  {byVerdict.map((entry, i) => <Cell key={i} fill={COLORS[entry.name] || "#64748B"} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#050505", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "JetBrains Mono", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-5 lg:col-span-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-3">Scans by Mode</div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={byModeData}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mode" stroke="#64748B" tick={{ fill: "#64748B", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                <YAxis stroke="#64748B" tick={{ fill: "#64748B", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                <Tooltip contentStyle={{ background: "#050505", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "JetBrains Mono", fontSize: 12 }} />
                <Bar dataKey="count" fill="#00DDEB" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
