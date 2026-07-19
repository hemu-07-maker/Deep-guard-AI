import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) { navigate("/", { replace: true }); return; }
    const session_id = decodeURIComponent(m[1]);

    (async () => {
      try {
        const r = await api.post("/auth/session", { session_id });
        // Clean URL fragment
        window.history.replaceState({}, "", "/dashboard");
        navigate("/dashboard", { replace: true, state: { user: r.data } });
      } catch (e) {
        navigate("/", { replace: true });
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="font-mono text-sm text-cyan-300 animate-pulse" data-testid="auth-callback-loading">
        &gt; Authenticating operator...
      </div>
    </div>
  );
}
