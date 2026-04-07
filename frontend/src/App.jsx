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

function AppInner({ user, role }) {
  const { notification, dismissNotification } = useCallNotification(user?.uid);
  const defaultRedirect = role === "lawyer" ? "/lawyer-dashboard" : "/dashboard";

  return (
    <>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={user ? <Navigate to={defaultRedirect} /> : <Auth />} />

        {/* Client */}
        <Route path="/dashboard" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
        <Route path="/lawyers" element={<ProtectedRoute><LawyerList /></ProtectedRoute>} />

        {/* Lawyer */}
        <Route path="/lawyer-dashboard" element={<ProtectedRoute><LawyerDashboard /></ProtectedRoute>} />

        {/* Call */}
        <Route path="/call/:appointmentId" element={<ProtectedRoute><CallRoom /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      <CallNotificationBanner notification={notification} onDismiss={dismissNotification} />
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);
  const [role, setRole] = useState(undefined);

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

  if (user === undefined || (user !== null && role === undefined)) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", fontFamily: "var(--font-body)", color: "var(--brown-light)",
        background: "var(--ivory)", fontSize: "0.9rem", letterSpacing: "0.1em",
      }}>
        PRUDENTE TORRES &amp; ASOCIADOS
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppInner user={user} role={role} />
    </BrowserRouter>
  );
}
