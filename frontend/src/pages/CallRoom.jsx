import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import api from "../api";

function CallRoom() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [roomUrl, setRoomUrl] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Use a ref so handleLeave always reads the latest value
  // even if called before the state update re-renders
  const roleRef = useRef("client");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return navigate("/");
      try {
        const idToken = await user.getIdToken();

        // Get role and store in ref immediately
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          roleRef.current = userDoc.data().role || "client";
        }

        // Create or fetch Daily.co room
        const roomRes = await api.post(
          "/calls/create-room",
          { appointmentId },
          { headers: { Authorization: `Bearer ${idToken}` } }
        );

        const { roomUrl: url } = roomRes.data;
        const roomName = url.split("/").pop();

        const tokenRes = await api.post(
          "/calls/token",
          { roomName, isOwner: false },
          { headers: { Authorization: `Bearer ${idToken}` } }
        );

        setRoomUrl(url);
        setToken(tokenRes.data.token);
      } catch (err) {
        console.error("Failed to start call", err);
        setError("Failed to start the call. Please try again.");
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [appointmentId]);

  const handleLeave = () => {
    const destination = roleRef.current === "lawyer" ? "/lawyer-dashboard" : "/dashboard";
    navigate(destination);
  };

  const iframeUrl = roomUrl && token ? `${roomUrl}?t=${token}` : null;

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div style={styles.brand}>
          OnCall<span style={{ color: "#c9a84c" }}>Lawyer</span>
          <span style={styles.liveTag}>● LIVE</span>
        </div>
        <button style={styles.leaveBtn} onClick={handleLeave}>
          Leave Call
        </button>
      </div>

      <div style={styles.callArea}>
        {loading && (
          <div style={styles.centered}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Setting up your secure call...</p>
          </div>
        )}
        {error && (
          <div style={styles.centered}>
            <p style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚠️</p>
            <p style={styles.errorText}>{error}</p>
            <button style={styles.retryBtn} onClick={handleLeave}>
              Back to Dashboard
            </button>
          </div>
        )}
        {iframeUrl && (
          <iframe
            src={iframeUrl}
            style={styles.iframe}
            allow="camera; microphone; fullscreen; speaker; display-capture"
            title="Video Call"
          />
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: { display: "flex", flexDirection: "column", height: "100vh", background: "#0a0f1e" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 1.5rem", height: "56px", background: "#0f1f3d",
    borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0,
  },
  brand: {
    fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: "700",
    color: "#fff", display: "flex", alignItems: "center", gap: "0.75rem",
  },
  liveTag: { fontSize: "0.7rem", fontFamily: "var(--font-body)", fontWeight: "600", color: "#e74c3c", letterSpacing: "0.05em" },
  leaveBtn: {
    background: "#e74c3c", color: "#fff", border: "none", borderRadius: "8px",
    padding: "0.5rem 1.25rem", fontSize: "0.875rem", fontWeight: "600",
    cursor: "pointer", fontFamily: "var(--font-body)",
  },
  callArea: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  iframe: { width: "100%", height: "100%", border: "none" },
  centered: { display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", color: "#fff" },
  spinner: {
    width: "48px", height: "48px",
    border: "3px solid rgba(255,255,255,0.1)",
    borderTop: "3px solid #c9a84c",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: { color: "rgba(255,255,255,0.6)", fontSize: "0.95rem" },
  errorText: { color: "rgba(255,255,255,0.8)", fontSize: "1rem", textAlign: "center" },
  retryBtn: {
    background: "#1a3360", color: "#fff", border: "none", borderRadius: "8px",
    padding: "0.6rem 1.25rem", fontSize: "0.875rem", cursor: "pointer", fontFamily: "var(--font-body)",
  },
};

export default CallRoom;
