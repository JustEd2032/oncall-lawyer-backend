import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ClientDashboard from "./pages/ClientDashboard";
import LawyerDashboard from "./pages/LawyerDashboard";
import LawyerList from "./pages/LawyerList";
import CallRoom from "./pages/CallRoom";
import ProtectedRoute from "./components/ProtectedRoute";
import CallNotificationBanner from "./components/CallNotificationBanner";
import { useCallNotification } from "./hooks/useCallNotification";

// ── Splash screen ──
function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState("in"); // "in" | "hold" | "out" | "done"

  useEffect(() => {
    // Fade in: 0 → 800ms
    // Hold:    800ms → 2000ms
    // Fade out: 2000ms → 2800ms
    // Done:    2800ms
    const hold = setTimeout(() => setPhase("out"), 2000);
    const done = setTimeout(() => { setPhase("done"); onDone(); }, 2800);
    return () => { clearTimeout(hold); clearTimeout(done); };
  }, []);

  if (phase === "done") return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#faf7f2",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: "1.5rem",
      opacity: phase === "out" ? 0 : 1,
      transition: phase === "out" ? "opacity 0.8s ease" : "none",
      pointerEvents: "none",
    }}>
      {/* Logo */}
      <div style={{
        opacity: phase === "in" ? 1 : 1,
        animation: "splashFadeIn 0.9s ease forwards",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem",
      }}>
        <img
          src="/logo-transparent.png"
          alt="Prudente Torres & Asociados A.C."
          style={{ width: "200px", height: "auto", objectFit: "contain" }}
        />
        {/* Gold rule */}
        <div style={{
          width: "0px", height: "1px", background: "var(--gold)",
          animation: "splashRuleExpand 0.8s 0.5s ease forwards",
        }} />
        {/* Tagline */}
        <p style={{
          fontFamily: "var(--font-body)", fontSize: "0.7rem",
          letterSpacing: "0.25em", textTransform: "uppercase",
          color: "var(--brown-light)", opacity: 0,
          animation: "splashFadeIn 0.6s 0.9s ease forwards",
        }}>
          Abogados &nbsp;·&nbsp; English Spoken
        </p>
      </div>

      <style>{`
        @keyframes splashFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashRuleExpand {
          from { width: 0px; }
          to   { width: 120px; }
        }
      `}</style>
    </div>
  );
}

function AppInner({ user, role }) {
  const { notification, dismissNotification } = useCallNotification(user?.uid);
  const defaultRedirect = role === "lawyer" ? "/lawyer-dashboard" : "/dashboard";

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={user ? <Navigate to={defaultRedirect} /> : <Auth />} />
        <Route path="/dashboard" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
        <Route path="/lawyers" element={<ProtectedRoute><LawyerList /></ProtectedRoute>} />
        <Route path="/lawyer-dashboard" element={<ProtectedRoute><LawyerDashboard /></ProtectedRoute>} />
        <Route path="/call/:appointmentId" element={<ProtectedRoute><CallRoom /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <CallNotificationBanner notification={notification} onDismiss={dismissNotification} />
    </>
  );
}

export default function App() {
  const [user, setUser]       = useState(undefined);
  const [role, setRole]       = useState(undefined);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          setRole(userDoc.exists() ? (userDoc.data().role || "client") : "client");
        } catch { setRole("client"); }
        setUser(firebaseUser);
      } else {
        setUser(null);
        setRole(null);
      }
    });
    return unsubscribe;
  }, []);

  const appReady = user !== undefined && (user === null || role !== undefined);

  return (
    <>
      {/* Splash always shows first, fades out after 2.8s */}
      <SplashScreen onDone={() => setSplashDone(true)} />

      {/* App renders underneath — visible once splash fades */}
      <div style={{
        opacity: splashDone ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}>
        {appReady ? (
          <BrowserRouter>
            <AppInner user={user} role={role} />
          </BrowserRouter>
        ) : (
          // Keep blank while auth loads — splash covers it anyway
          <div style={{ minHeight: "100vh", background: "var(--ivory)" }} />
        )}
      </div>
    </>
  );
}
