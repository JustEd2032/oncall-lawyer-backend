import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import api from "../api";

export default function Auth() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError(""); setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      await api.post("/users", {}, { headers: { Authorization: `Bearer ${token}` } });
      await cred.user.getIdToken(true);
    } catch (err) { setError(friendlyError(err.code)); }
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    setError("");
    if (password !== confirmPassword) return setError("Las contraseñas no coinciden.");
    if (password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      await api.post("/users", {}, { headers: { Authorization: `Bearer ${token}` } });
      await cred.user.getIdToken(true);
    } catch (err) { setError(friendlyError(err.code)); }
    finally { setLoading(false); }
  };

  const friendlyError = (code) => {
    switch (code) {
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential": return "Correo o contraseña incorrectos.";
      case "auth/email-already-in-use": return "Ya existe una cuenta con este correo.";
      case "auth/invalid-email": return "Por favor ingrese un correo válido.";
      case "auth/too-many-requests": return "Demasiados intentos. Intente más tarde.";
      default: return "Ocurrió un error. Intente nuevamente.";
    }
  };

  return (
    <div style={s.wrapper}>
      {/* Left panel */}
      <div style={s.left}>
        <div style={s.leftPattern} />
        <div style={s.leftContent}>
          <img
            src="/logo-gold.png"
            alt="Prudente Torres & Asociados A.C."
            style={s.leftLogo}
          />
          <div style={s.leftRule} />
          <h2 style={s.leftTitle}>
            Portal de Clientes<br />
            <em style={{ fontStyle: "italic", color: "var(--gold-light)", fontWeight: "300" }}>
              Client Portal
            </em>
          </h2>
          <p style={s.leftText}>
            Acceda para agendar consultas, gestionar sus citas y comunicarse con nuestro equipo.
            Access to schedule consultations and manage your appointments.
          </p>
          <div style={s.practiceList}>
            {["Penal · Criminal", "Civil", "Familiar · Family", "Laboral · Labor", "Fiscal · Tax"].map(p => (
              <div key={p} style={s.practiceItem}>
                <span style={s.practiceDot}>◆</span>
                <span>Derecho {p}</span>
              </div>
            ))}
          </div>
          <button style={s.backBtn} onClick={() => navigate("/")}>
            ← Regresar al inicio · Back to home
          </button>
        </div>
      </div>

      {/* Right panel */}
      <div style={s.right}>
        <div style={s.formCard} className="fade-up">
          <div style={s.formHeader}>
            <img src="/logo-transparent.png" alt="Prudente Torres" style={s.formLogo} />
          </div>
          <div style={s.tabs}>
            <button style={{ ...s.tab, ...(mode === "login" ? s.tabActive : {}) }}
              onClick={() => { setMode("login"); setError(""); }}>
              Iniciar Sesión
            </button>
            <button style={{ ...s.tab, ...(mode === "register" ? s.tabActive : {}) }}
              onClick={() => { setMode("register"); setError(""); }}>
              Registrarse
            </button>
          </div>
          <div style={{ padding: "2rem" }}>
            <h2 style={s.formTitle}>
              {mode === "login" ? "Bienvenido" : "Crear cuenta"}
            </h2>
            <p style={s.formSubtitle}>
              {mode === "login"
                ? "Acceda a su portal · Access your portal"
                : "Registro de nuevo cliente · New client registration"}
            </p>
            <hr className="divider" />
            <div className="form-group">
              <label className="form-label">Correo electrónico · Email</label>
              <input className="form-input" type="email" placeholder="correo@ejemplo.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña · Password</label>
              <input className="form-input" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {mode === "register" && (
              <div className="form-group">
                <label className="form-label">Confirmar contraseña · Confirm password</label>
                <input className="form-input" type="password" placeholder="••••••••"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
            )}
            {error && <p className="form-error" style={{ marginBottom: "1rem" }}>{error}</p>}
            <button className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "0.9rem" }}
              onClick={mode === "login" ? handleLogin : handleRegister}
              disabled={loading}>
              {loading ? "Por favor espere..." : mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
            </button>
            {mode === "login" && (
              <p style={{ textAlign: "center", marginTop: "1rem" }}>
                <a href="#" style={{ color: "var(--brown-light)", fontSize: "0.8rem" }}>
                  ¿Olvidó su contraseña? · Forgot password?
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  wrapper: { display: "flex", minHeight: "100vh" },
  left: {
    flex: 1, position: "relative",
    background: "linear-gradient(155deg, var(--brown-deep) 0%, var(--brown) 60%, var(--brown-mid) 100%)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem",
    overflow: "hidden",
  },
  leftPattern: {
    position: "absolute", inset: 0,
    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 60px, rgba(184,150,46,0.04) 60px, rgba(184,150,46,0.04) 120px)`,
    pointerEvents: "none",
  },
  leftContent: { position: "relative", zIndex: 1, maxWidth: "440px", width: "100%" },
  leftLogo: {
    height: "80px", width: "auto", objectFit: "contain", display: "block",
    marginBottom: "1.75rem",
  },
  leftRule: { height: "1px", background: "linear-gradient(to right, var(--gold), transparent)", marginBottom: "1.75rem" },
  leftTitle: { fontFamily: "var(--font-display)", fontSize: "2.25rem", fontWeight: "300", color: "var(--cream)", lineHeight: "1.2", marginBottom: "1rem" },
  leftText: { fontSize: "0.875rem", color: "rgba(245,240,232,0.62)", lineHeight: "1.85", marginBottom: "2rem", fontWeight: "300" },
  practiceList: { display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "2.5rem" },
  practiceItem: { display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.83rem", color: "rgba(245,240,232,0.78)" },
  practiceDot: { color: "var(--gold)", fontSize: "0.45rem", flexShrink: 0 },
  backBtn: { background: "none", border: "none", color: "var(--gray-warm)", fontSize: "0.75rem", letterSpacing: "0.06em", cursor: "pointer", fontFamily: "var(--font-body)" },
  right: { width: "500px", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", background: "var(--cream)" },
  formCard: { background: "var(--white)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", border: "1px solid var(--parchment)", width: "100%", overflow: "hidden" },
  formHeader: { background: "var(--cream)", padding: "1.5rem 2rem", borderBottom: "1px solid var(--parchment)", display: "flex", justifyContent: "center" },
  formLogo: { height: "50px", width: "auto", objectFit: "contain" },
  tabs: { display: "flex", borderBottom: "1px solid var(--parchment)" },
  tab: { flex: 1, padding: "0.85rem", border: "none", background: "none", fontSize: "0.78rem", fontWeight: "500", color: "var(--gray-warm)", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "2px solid transparent", transition: "all 0.2s", fontFamily: "var(--font-body)", cursor: "pointer" },
  tabActive: { color: "var(--brown-deep)", borderBottom: "2px solid var(--gold)", fontWeight: "600" },
  formTitle: { fontFamily: "var(--font-display)", fontSize: "1.75rem", color: "var(--brown-deep)", marginBottom: "0.25rem", fontWeight: "400" },
  formSubtitle: { color: "var(--gray-warm)", fontSize: "0.78rem" },
};
