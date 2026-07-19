import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider } from "@/context/AuthContext";
import AuthCallback from "@/components/AuthCallback";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";

import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import UploadPage from "@/pages/Upload";
import History from "@/pages/History";
import Analytics from "@/pages/Analytics";

function AppRouter() {
  const location = useLocation();
  // CRITICAL: Handle OAuth session_id in hash BEFORE any other route logic (avoids race conditions)
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/history" element={<History />} />
        <Route path="/analytics" element={<Analytics />} />
      </Route>
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: { background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", color: "#F8FAFC", fontFamily: "JetBrains Mono, monospace" },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
