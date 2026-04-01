import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

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
        <Route path="/" element={user ? <Navigate to={defaultRedirect} /> : <Auth />} />
        <Route path="/dashboard" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
        <Route path="/lawyers" element={<ProtectedRoute><LawyerList /></ProtectedRoute>} />
        <Route path="/lawyer-dashboard" element={<ProtectedRoute><LawyerDashboard /></ProtectedRoute>} />
        <Route path="/call/:appointmentId" element={<ProtectedRoute><CallRoom /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={defaultRedirect} />} />
      </Routes>

      {/* Only show banner if not currently on a call page */}
      <CallNotificationBanner
        notification={notification}
        onDismiss={dismissNotification}
      />
    </>
  );
}

function App() {
  const [user, setUser] = useState(undefined);
  const [role, setRole] = useState(undefined); // undefined = still loading

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          setRole(userDoc.exists() ? (userDoc.data().role || "client") : "client");
        } catch {
          setRole("client");
        }
        setUser(firebaseUser);
      } else {
        setUser(null);
        setRole(null);
      }
    });
    return unsubscribe;
  }, []);

  // Wait for BOTH user AND role before rendering
  // This prevents the lawyer briefly seeing the client dashboard
  if (user === undefined || (user !== null && role === undefined)) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", fontFamily: "var(--font-body)", color: "var(--gray-500)",
        fontSize: "0.95rem",
      }}>
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppInner user={user} role={role} />
    </BrowserRouter>
  );
}

export default App;
