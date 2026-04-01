import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function CallNotificationBanner({ notification, onDismiss }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when a new notification comes in
  const notifKey = notification?.appointmentId;

  // Don't show on the call page itself
  if (location.pathname.startsWith("/call/")) return null;

  // Don't show if dismissed or no notification
  if (!notification || dismissed) return null;

  const handleJoin = () => {
    setDismissed(false);
    onDismiss();
    navigate(`/call/${notification.appointmentId}`);
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  return (
    <div style={styles.banner} key={notifKey}>
      <div style={styles.left}>
        <span style={styles.pulse}>📞</span>
        <div>
          <p style={styles.title}>Call Ready</p>
          <p style={styles.message}>{notification.message}</p>
        </div>
      </div>
      <div style={styles.actions}>
        <button style={styles.joinBtn} onClick={handleJoin}>
          Join Now
        </button>
        <button style={styles.dismissBtn} onClick={handleDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

const styles = {
  banner: {
    position: "fixed",
    bottom: "1.5rem",
    right: "1.5rem",
    background: "#0f1f3d",
    color: "#fff",
    borderRadius: "16px",
    padding: "1.25rem 1.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1.5rem",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    zIndex: 999,
    maxWidth: "420px",
    width: "calc(100vw - 3rem)",
    border: "1px solid rgba(201,168,76,0.4)",
    animation: "fadeUp 0.3s ease",
  },
  left: { display: "flex", alignItems: "center", gap: "1rem" },
  pulse: { fontSize: "1.75rem", flexShrink: 0 },
  title: { fontWeight: "700", fontSize: "0.95rem", color: "#fff", marginBottom: "0.2rem", fontFamily: "var(--font-display)" },
  message: { fontSize: "0.8rem", color: "rgba(255,255,255,0.65)" },
  actions: { display: "flex", flexDirection: "column", gap: "0.5rem", flexShrink: 0 },
  joinBtn: {
    background: "#c9a84c", color: "#fff", border: "none", borderRadius: "8px",
    padding: "0.5rem 1rem", fontSize: "0.85rem", fontWeight: "600",
    cursor: "pointer", fontFamily: "var(--font-body)", whiteSpace: "nowrap",
  },
  dismissBtn: {
    background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)",
    border: "none", borderRadius: "8px", padding: "0.4rem 1rem",
    fontSize: "0.8rem", cursor: "pointer", fontFamily: "var(--font-body)",
  },
};

export default CallNotificationBanner;
