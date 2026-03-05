import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

import Auth from "./pages/Auth";
import ClientDashboard from "./pages/ClientDashboard";
import LawyerDashboard from "./pages/LawyerDashboard";
import LawyerList from "./pages/LawyerList";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return unsubscribe;
  }, []);

  if (user === undefined) {
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
      <Routes>
        {/* Public */}
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Auth />} />

        {/* Client */}
        <Route path="/dashboard" element={
          <ProtectedRoute><ClientDashboard /></ProtectedRoute>
        } />
        <Route path="/lawyers" element={
          <ProtectedRoute><LawyerList /></ProtectedRoute>
        } />

        {/* Lawyer */}
        <Route path="/lawyer-dashboard" element={
          <ProtectedRoute><LawyerDashboard /></ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
