import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import api from "../api";

function Auth() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      await api.post("/users", {}, { headers: { Authorization: `Bearer ${token}` } });
      await userCredential.user.getIdToken(true);
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError("");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      await api.post("/users", {}, { headers: { Authorization: `Bearer ${token}` } });
      await userCredential.user.getIdToken(true);
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const friendlyError = (code) => {
    switch (code) {
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential": return "Invalid email or password.";
      case "auth/email-already-in-use": return "An account with this email already exists.";
      case "auth/invalid-email": return "Please enter a valid email address.";
      case "auth/too-many-requests": return "Too many attempts. Please try again later.";
      default: return "Something went wrong. Please try again.";
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* Left panel */}
      <div style={styles.leftPanel}>
        <div style={styles.leftContent}>
          <div style={styles.logo}>OnCall<span style={styles.logoAccent}>Lawyer</span></div>
          <h1 style={styles.headline}>Legal help,<br />when you need it.</h1>
          <p style={styles.subtext}>
            Connect with verified attorneys instantly. Book consultations, manage appointments, and get the legal support you deserve.
          </p>
          <div style={styles.stats}>
            {[["200+", "Verified Lawyers"], ["4.9★", "Average Rating"], ["24/7", "Availability"]].map(([val, label]) => (
              <div key={label} style={styles.stat}>
                <span style={styles.statVal}>{val}</span>
                <span style={styles.statLabel}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={styles.rightPanel}>
        <div style={styles.formCard} className="fade-up">
          {/* Tab switcher */}
          <div style={styles.tabs}>
            <button
              style={{ ...styles.tab, ...(mode === "login" ? styles.tabActive : {}) }}
              onClick={() => { setMode("login"); setError(""); }}
            >Sign In</button>
            <button
              style={{ ...styles.tab, ...(mode === "register" ? styles.tabActive : {}) }}
              onClick={() => { setMode("register"); setError(""); }}
            >Create Account</button>
          </div>

          <div style={{ padding: "2rem" }}>
            <h2 style={styles.formTitle}>
              {mode === "login" ? "Welcome back" : "Get started"}
            </h2>
            <p style={styles.formSubtitle}>
              {mode === "login"
                ? "Sign in to your OnCallLawyer account"
                : "Create your free account today"}
            </p>

            <hr className="divider" />

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {mode === "register" && (
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            {error && <p className="form-error" style={{ marginBottom: "1rem" }}>{error}</p>}

            <button
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "0.85rem" }}
              onClick={mode === "login" ? handleLogin : handleRegister}
              disabled={loading}
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>

            {mode === "login" && (
              <p style={styles.forgotLink}>
                <a href="#" style={{ color: "var(--navy-muted)", fontSize: "0.85rem" }}>
                  Forgot your password?
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    minHeight: "100vh",
  },
  leftPanel: {
    flex: 1,
    background: "linear-gradient(145deg, #0f1f3d 0%, #1a3360 60%, #2d4a7a 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem",
    position: "relative",
    overflow: "hidden",
  },
  leftContent: {
    maxWidth: "420px",
    position: "relative",
    zIndex: 1,
  },
  logo: {
    fontFamily: "var(--font-display)",
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#fff",
    marginBottom: "2.5rem",
    letterSpacing: "0.01em",
  },
  logoAccent: { color: "#c9a84c" },
  headline: {
    fontFamily: "var(--font-display)",
    fontSize: "3rem",
    fontWeight: "700",
    color: "#fff",
    lineHeight: "1.15",
    marginBottom: "1.25rem",
  },
  subtext: {
    color: "rgba(255,255,255,0.65)",
    fontSize: "1rem",
    lineHeight: "1.7",
    marginBottom: "2.5rem",
  },
  stats: {
    display: "flex",
    gap: "2rem",
    borderTop: "1px solid rgba(255,255,255,0.15)",
    paddingTop: "2rem",
  },
  stat: { display: "flex", flexDirection: "column", gap: "0.2rem" },
  statVal: { color: "#c9a84c", fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: "700" },
  statLabel: { color: "rgba(255,255,255,0.55)", fontSize: "0.8rem" },
  rightPanel: {
    width: "480px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    background: "var(--off-white)",
  },
  formCard: {
    background: "#fff",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-lg)",
    border: "1px solid var(--gray-100)",
    width: "100%",
    overflow: "hidden",
  },
  tabs: {
    display: "flex",
    borderBottom: "1px solid var(--gray-100)",
  },
  tab: {
    flex: 1,
    padding: "1rem",
    border: "none",
    background: "none",
    fontSize: "0.9rem",
    fontWeight: "500",
    color: "var(--gray-500)",
    transition: "color 0.2s, border-bottom 0.2s",
    borderBottom: "2px solid transparent",
    fontFamily: "var(--font-body)",
  },
  tabActive: {
    color: "var(--navy)",
    borderBottom: "2px solid var(--navy)",
    fontWeight: "600",
  },
  formTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "1.6rem",
    color: "var(--navy)",
    marginBottom: "0.25rem",
  },
  formSubtitle: {
    color: "var(--gray-500)",
    fontSize: "0.9rem",
  },
  forgotLink: {
    textAlign: "center",
    marginTop: "1rem",
  },
};

export default Auth;
