import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState(location.state?.user ? "ok" : "checking");

  useEffect(() => {
    if (state === "ok") return;
    (async () => {
      try {
        await api.get("/auth/me");
        setState("ok");
      } catch {
        setState("no");
        navigate("/", { replace: true });
      }
    })();
  }, [state, navigate]);

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-xs text-cyan-300 animate-pulse">&gt; Verifying credentials...</div>
      </div>
    );
  }
  if (state !== "ok") return null;
  return children;
}
