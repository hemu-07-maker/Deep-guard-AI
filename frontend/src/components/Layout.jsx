import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Upload, History as HistoryIcon, BarChart3, LogOut, ShieldAlert, Radio } from "lucide-react";
import AmbientParticles from "@/components/AmbientParticles";
import PageTransition from "@/components/PageTransition";

const NAV = [
  { to: "/dashboard", label: "Live Detection", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/upload", label: "Upload Analysis", icon: Upload, testid: "nav-upload" },
  { to: "/history", label: "Detection History", icon: HistoryIcon, testid: "nav-history" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, testid: "nav-analytics" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen text-slate-100 flex">
      <AmbientParticles />
      {/* Sidebar */}
      <aside className="relative z-10 w-64 shrink-0 border-r border-white/10 bg-black/70 backdrop-blur-md flex flex-col">
        <div className="px-5 py-6 border-b border-white/10">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 group" data-testid="sidebar-logo">
            <div className="relative">
              <ShieldAlert className="w-6 h-6 text-cyan-400 glow-neon" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </div>
            <div className="font-display font-bold tracking-tight text-lg leading-none">
              DeepGuard <span className="text-cyan-400">AI</span>
            </div>
          </button>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Forensic Ops Console
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                data-testid={n.testid}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-sm border-l-2 transition-colors ${
                    isActive
                      ? "border-cyan-400 bg-white/5 text-white"
                      : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span className="font-body">{n.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="px-3 py-2 flex items-center gap-3">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-8 h-8 rounded-sm border border-white/10 object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-sm bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-mono text-xs">
                {(user?.name || user?.email || "?").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs truncate">{user?.name || "Operator"}</div>
              <div className="text-[10px] text-slate-500 truncate font-mono">{user?.email}</div>
            </div>
          </div>
          <button
            data-testid="logout-button"
            onClick={logout}
            className="mt-2 w-full flex items-center justify-center gap-2 border border-white/10 hover:border-red-500/50 hover:text-red-400 text-slate-400 text-xs font-mono uppercase py-2 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Terminate Session
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="relative z-10 flex-1 min-w-0 flex flex-col">
        <div className="h-11 border-b border-white/10 bg-black/60 backdrop-blur px-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span className="font-mono text-[11px] uppercase tracking-widest text-slate-400">
              SYSTEM ONLINE // WEB-CONSOLE
            </span>
            <span className="hidden md:inline font-mono text-[11px] uppercase tracking-widest text-cyan-400/80">
              · TRACE ACTIVE
            </span>
          </div>
          <div className="font-mono text-[11px] text-slate-500" data-testid="clock">
            {new Date().toISOString().slice(0, 19).replace("T", " ")} UTC
          </div>
        </div>
        <div className="flex-1 p-6 overflow-auto">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </main>
    </div>
  );
}
