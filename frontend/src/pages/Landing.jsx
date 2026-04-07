import { useNavigate } from "react-router-dom";

const PRACTICAS = [
  { icon: "⚖️", es: "Derecho Penal", en: "Criminal Law", desc: "Defensa legal en procesos penales, amparo y recursos constitucionales." },
  { icon: "📜", es: "Derecho Civil", en: "Civil Law", desc: "Contratos, responsabilidad civil, bienes inmuebles y sucesiones." },
  { icon: "👨‍👩‍👧", es: "Derecho Familiar", en: "Family Law", desc: "Divorcios, custodia, pensión alimenticia y adopciones." },
  { icon: "🏭", es: "Derecho Laboral", en: "Labor Law", desc: "Representación ante IMSS, STPS, conflictos laborales y liquidaciones." },
  { icon: "📊", es: "Derecho Fiscal", en: "Tax Law", desc: "Asesoría fiscal, defensa ante el SAT y planeación tributaria." },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={s.wrapper}>

      {/* ── Top contact bar ── */}
      <div style={s.topBar}>
        <span style={s.topBarText}>📍 Calle Hidalgo No 10, Edificio Muller, Despacho 206 · Acapulco, Guerrero C.P. 39300</span>
        <span style={s.topBarText}>📞 (01744) 135-5072 · ✉️ prudentetorres@hotmail.com</span>
      </div>

      {/* ── Header with real logo ── */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <img
            src="/logo-transparent.png"
            alt="Prudente Torres & Asociados A.C."
            style={s.logoImg}
          />
          <nav style={s.nav}>
            <a href="#servicios" style={s.navLink}>Servicios</a>
            <a href="#nosotros" style={s.navLink}>Nosotros</a>
            <a href="#contacto" style={s.navLink}>Contacto</a>
            <button
              className="btn-primary"
              style={{ padding: "0.55rem 1.4rem", fontSize: "0.78rem" }}
              onClick={() => navigate("/auth")}
            >
              Acceder al Portal
            </button>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={s.hero}>
        <div style={s.heroPattern} />
        <div style={s.heroContent} className="fade-up">
          {/* Logo repeated large in hero for impact */}
          <img
            src="/logo-gold.png"
            alt="Prudente Torres & Asociados A.C."
            style={s.heroLogo}
          />
          <div style={s.heroDivider} />
          <h1 style={s.heroTitle}>
            Defensa Legal con<br />
            <em style={{ fontStyle: "italic", color: "var(--gold-light)" }}>Experiencia y Compromiso</em>
          </h1>
          <p style={s.heroSubtitle}>
            Más de dos décadas representando a personas y empresas en Acapulco y el estado de Guerrero.
            Asesoría legal integral en español e inglés.
          </p>
          <div style={s.heroBtns}>
            <button
              className="btn-gold"
              style={{ padding: "0.9rem 2.25rem", fontSize: "0.9rem" }}
              onClick={() => navigate("/auth")}
            >
              Agendar Consulta
            </button>
            <a href="#servicios" style={s.heroLink}>Ver Servicios ↓</a>
          </div>
        </div>

        {/* Right side decorative panel */}
        <div style={s.heroRight}>
          <div style={s.heroCard}>
            <p style={s.heroCardLabel}>ÁREAS DE PRÁCTICA</p>
            <div style={s.heroCardDivider} />
            {PRACTICAS.map(p => (
              <div key={p.es} style={s.heroCardItem}>
                <span style={s.heroCardIcon}>{p.icon}</span>
                <div>
                  <p style={s.heroCardName}>{p.es}</p>
                  <p style={s.heroCardEn}>{p.en}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div style={s.statsBar}>
        {[
          { num: "20+", label: "Años de experiencia · Years of experience" },
          { num: "500+", label: "Casos resueltos · Cases resolved" },
          { num: "5",   label: "Áreas de práctica · Practice areas" },
          { num: "24/7", label: "Disponibilidad · Availability" },
        ].map(({ num, label }) => (
          <div key={label} style={s.statItem}>
            <span style={s.statNum}>{num}</span>
            <span style={s.statLabel}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Servicios ── */}
      <section id="servicios" style={s.section}>
        <div style={s.sectionInner}>
          <div className="ornament fade-up" style={{ marginBottom: "1rem" }}>Asesoría Legal · Legal Advisory</div>
          <h2 style={s.sectionTitle} className="fade-up-2">Áreas de Práctica</h2>
          <p style={s.sectionSubtitle} className="fade-up-3">
            Ofrecemos representación legal especializada en las siguientes ramas del derecho mexicano.
          </p>
          <div style={s.practiceGrid} className="fade-up-3">
            {PRACTICAS.map(p => (
              <div key={p.es} style={s.practiceCard}>
                <div style={s.practiceIcon}>{p.icon}</div>
                <h3 style={s.practiceName}>{p.es}</h3>
                <p style={s.practiceEn}>{p.en}</p>
                <div style={s.practiceRule} />
                <p style={s.practiceDesc}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Nosotros ── */}
      <section id="nosotros" style={s.sectionDark}>
        <div style={s.sectionInner}>
          <div className="ornament fade-up" style={{ marginBottom: "1rem", color: "var(--gold-light)" }}>
            El Despacho · The Firm
          </div>
          <h2 style={{ ...s.sectionTitle, color: "var(--cream)" }} className="fade-up-2">
            Prudente Torres &amp; Asociados A.C.
          </h2>
          <div style={s.aboutGrid} className="fade-up-3">
            <div>
              <img src="/logo-gold.png" alt="Prudente Torres & Asociados" style={s.aboutLogo} />
              <p style={s.aboutText}>
                Somos un despacho de abogados con sede en Acapulco, Guerrero, con más de dos décadas de experiencia
                en el ejercicio de la abogacía. Nuestro equipo está comprometido con la defensa de los derechos
                de nuestros clientes, brindando asesoría legal de alta calidad en materia penal, civil, familiar,
                laboral y fiscal.
              </p>
              <p style={{ ...s.aboutText, marginTop: "1.25rem" }}>
                We also provide legal services in English, ensuring that foreign nationals and international
                businesses receive the same quality representation throughout Guerrero state.
              </p>
            </div>
            <div id="contacto" style={s.contactCard}>
              <h3 style={s.contactTitle}>Contacto · Contact</h3>
              <div style={s.contactRule} />
              {[
                { icon: "📍", text: "Calle Hidalgo No 10, Edificio Muller, Despacho 206, Segundo Piso, Col. Centro, C.P. 39300, Acapulco, Guerrero" },
                { icon: "📞", text: "(01744) 135-5072" },
                { icon: "✉️", text: "prudentetorres@hotmail.com" },
              ].map(({ icon, text }) => (
                <div key={text} style={s.contactItem}>
                  <span style={s.contactIcon}>{icon}</span>
                  <span style={s.contactText}>{text}</span>
                </div>
              ))}
              <button
                className="btn-gold"
                style={{ width: "100%", justifyContent: "center", marginTop: "1.75rem", padding: "0.9rem" }}
                onClick={() => navigate("/auth")}
              >
                Agendar Consulta en Línea
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <img src="/logo-gold.png" alt="Prudente Torres" style={s.footerLogo} />
          <p style={s.footerText}>
            © {new Date().getFullYear()} Prudente Torres &amp; Asociados A.C. · Todos los derechos reservados · All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

const s = {
  wrapper: { minHeight: "100vh", background: "var(--ivory)" },

  topBar: {
    background: "var(--brown-deep)", padding: "0.45rem 2.5rem",
    display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem",
    borderBottom: "1px solid rgba(184,150,46,0.3)",
  },
  topBarText: { fontSize: "0.68rem", color: "var(--gray-warm)", letterSpacing: "0.04em" },

  header: {
    background: "var(--cream)", borderBottom: "2px solid var(--gold)",
    padding: "0 2.5rem", position: "sticky", top: 0, zIndex: 100,
    boxShadow: "0 2px 16px rgba(44,26,14,0.12)",
  },
  headerInner: {
    maxWidth: "1200px", margin: "0 auto", height: "80px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  logoImg: {
    height: "60px", width: "auto", objectFit: "contain",
  },
  nav: { display: "flex", alignItems: "center", gap: "2rem" },
  navLink: {
    fontSize: "0.78rem", fontWeight: "500", color: "var(--brown)",
    letterSpacing: "0.08em", textTransform: "uppercase", transition: "color 0.2s",
  },

  hero: {
    position: "relative", minHeight: "92vh",
    background: "linear-gradient(160deg, var(--brown-deep) 0%, var(--brown) 55%, var(--brown-mid) 100%)",
    display: "flex", alignItems: "center",
    overflow: "hidden",
  },
  heroPattern: {
    position: "absolute", inset: 0,
    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 50px, rgba(184,150,46,0.04) 50px, rgba(184,150,46,0.04) 100px)`,
    pointerEvents: "none",
  },
  heroContent: {
    position: "relative", zIndex: 1, flex: 1,
    padding: "4rem 3rem 4rem 5rem", maxWidth: "680px",
  },
  heroLogo: {
    height: "90px", width: "auto", objectFit: "contain",
    marginBottom: "2rem", display: "block",
  },
  heroDivider: {
    width: "80px", height: "2px",
    background: "linear-gradient(to right, var(--gold), transparent)",
    marginBottom: "1.75rem",
  },
  heroTitle: {
    fontFamily: "var(--font-display)", fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
    fontWeight: "300", color: "var(--cream)", lineHeight: "1.15", marginBottom: "1.5rem",
  },
  heroSubtitle: {
    fontSize: "1rem", color: "rgba(245,240,232,0.7)", lineHeight: "1.9",
    maxWidth: "500px", marginBottom: "2.5rem", fontWeight: "300",
  },
  heroBtns: { display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" },
  heroLink: {
    fontSize: "0.82rem", color: "var(--gold-light)", fontWeight: "500",
    letterSpacing: "0.06em", textTransform: "uppercase",
  },
  heroRight: {
    position: "relative", zIndex: 1,
    padding: "2rem 4rem 2rem 2rem", flexShrink: 0,
  },
  heroCard: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(184,150,46,0.3)",
    borderRadius: "var(--radius-lg)", padding: "1.75rem", backdropFilter: "blur(8px)",
    minWidth: "240px",
  },
  heroCardLabel: {
    fontSize: "0.65rem", fontWeight: "600", color: "var(--gold)",
    letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "0.75rem",
  },
  heroCardDivider: { height: "1px", background: "rgba(184,150,46,0.3)", marginBottom: "1.25rem" },
  heroCardItem: { display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" },
  heroCardIcon: { fontSize: "1.2rem", flexShrink: 0 },
  heroCardName: { fontSize: "0.88rem", fontWeight: "600", color: "var(--cream)", lineHeight: 1.2 },
  heroCardEn: { fontSize: "0.68rem", color: "var(--gold)", letterSpacing: "0.08em", marginTop: "0.1rem" },

  statsBar: {
    background: "var(--brown-deep)", borderTop: "1px solid rgba(184,150,46,0.4)",
    borderBottom: "2px solid var(--gold)", padding: "0 2.5rem",
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
  },
  statItem: {
    padding: "1.75rem 1rem", display: "flex", flexDirection: "column",
    alignItems: "center", gap: "0.35rem",
    borderRight: "1px solid rgba(184,150,46,0.15)",
  },
  statNum: { fontFamily: "var(--font-display)", fontSize: "2.25rem", fontWeight: "700", color: "var(--gold-light)" },
  statLabel: { fontSize: "0.65rem", color: "var(--gray-warm)", letterSpacing: "0.08em", textAlign: "center", textTransform: "uppercase" },

  section: { padding: "6rem 2.5rem", background: "var(--ivory)" },
  sectionDark: { padding: "6rem 2.5rem", background: "var(--brown-deep)" },
  sectionInner: { maxWidth: "1200px", margin: "0 auto" },
  sectionTitle: { fontFamily: "var(--font-display)", fontSize: "2.5rem", color: "var(--brown-deep)", marginBottom: "1rem", fontWeight: "400" },
  sectionSubtitle: { color: "var(--gray-warm)", fontSize: "0.95rem", maxWidth: "560px", marginBottom: "3rem", lineHeight: "1.8" },

  practiceGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "1.5rem" },
  practiceCard: {
    background: "var(--white)", borderRadius: "var(--radius-lg)", padding: "2rem 1.5rem",
    border: "1px solid var(--parchment)", boxShadow: "var(--shadow-sm)",
    display: "flex", flexDirection: "column",
  },
  practiceIcon: { fontSize: "2rem", marginBottom: "0.75rem" },
  practiceName: { fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--brown-deep)", fontWeight: "600" },
  practiceEn: { fontSize: "0.68rem", color: "var(--gold)", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: "0.2rem" },
  practiceRule: { height: "1px", background: "var(--parchment)", margin: "0.75rem 0" },
  practiceDesc: { fontSize: "0.83rem", color: "var(--gray-warm)", lineHeight: "1.7" },

  aboutGrid: { display: "grid", gridTemplateColumns: "1fr 380px", gap: "4rem", alignItems: "start" },
  aboutLogo: {
    height: "70px", width: "auto", objectFit: "contain",
    marginBottom: "1.75rem", display: "block",
  },
  aboutText: { fontSize: "0.95rem", color: "rgba(245,240,232,0.72)", lineHeight: "1.95", fontWeight: "300" },

  contactCard: {
    background: "rgba(255,255,255,0.05)", border: "1px solid var(--gold)",
    borderRadius: "var(--radius-lg)", padding: "2rem",
  },
  contactTitle: { fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--gold-light)", marginBottom: "0.75rem", fontWeight: "400" },
  contactRule: { height: "1px", background: "rgba(184,150,46,0.4)", marginBottom: "1.5rem" },
  contactItem: { display: "flex", gap: "0.75rem", marginBottom: "1rem", alignItems: "flex-start" },
  contactIcon: { fontSize: "1rem", flexShrink: 0, marginTop: "0.1rem" },
  contactText: { fontSize: "0.85rem", color: "rgba(245,240,232,0.75)", lineHeight: "1.7" },

  footer: { background: "var(--ink)", borderTop: "2px solid var(--gold)", padding: "2rem 2.5rem" },
  footerInner: { maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" },
  footerLogo: {
    height: "40px", width: "auto", objectFit: "contain",
    opacity: 0.7,
  },
  footerText: { fontSize: "0.72rem", color: "var(--gray-warm)", letterSpacing: "0.04em" },
};
