import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import api from "../api";
import Navbar from "../components/Navbar";

function LawyerList() {
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    auth.onAuthStateChanged((u) => setUser(u));
    api.get("/lawyers")
      .then(res => setLawyers(res.data))
      .catch(err => console.error("Failed to load lawyers", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = lawyers.filter(l =>
    l.bio?.toLowerCase().includes(search.toLowerCase()) ||
    l.specialties?.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <Navbar user={user} />
      <div className="page">
        <div className="fade-up" style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>Find a Lawyer</h1>
            <p style={styles.pageSubtitle}>Browse our network of verified attorneys</p>
          </div>
        </div>

        <div className="fade-up-2" style={styles.searchBar}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            className="form-input"
            style={{ border: "none", outline: "none", flex: 1, background: "transparent" }}
            placeholder="Search by specialty (e.g. family law, immigration...)"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={styles.empty}>Loading lawyers...</div>
        ) : filtered.length === 0 ? (
          <div style={styles.empty}>No lawyers found matching your search.</div>
        ) : (
          <div className="fade-up-3" style={styles.grid}>
            {filtered.map(lawyer => (
              <LawyerCard
                key={lawyer.id}
                lawyer={lawyer}
                onBook={() => setSelected(lawyer)}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <BookingModal
          lawyer={selected}
          user={user}
          onClose={() => setSelected(null)}
          onBooked={() => { setSelected(null); navigate("/dashboard"); }}
        />
      )}
    </>
  );
}

function LawyerCard({ lawyer, onBook }) {
  const initials = (lawyer.userId || lawyer.id || "L").slice(0, 2).toUpperCase();
  return (
    <div className="card" style={styles.card}>
      <div style={styles.cardTop}>
        <div style={styles.avatar}>{initials}</div>
        <div>
          <p style={styles.lawyerName}>Attorney #{lawyer.id.slice(0, 6)}</p>
          <p style={styles.lawyerRate}>${lawyer.hourlyRate}/hr</p>
        </div>
      </div>
      {lawyer.specialties?.length > 0 && (
        <div style={styles.specialties}>
          {lawyer.specialties.map(s => (
            <span key={s} className="badge" style={styles.specialtyBadge}>{s}</span>
          ))}
        </div>
      )}
      {lawyer.bio && <p style={styles.bio}>{lawyer.bio}</p>}
      <button className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "auto" }} onClick={onBook}>
        Book Consultation
      </button>
    </div>
  );
}

function BookingModal({ lawyer, user, onClose, onBooked }) {
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBook = async () => {
    if (!scheduledAt) return setError("Please select a date and time.");
    setError("");
    setLoading(true);
    try {
      const token = await user.getIdToken();

      // 1. Create payment intent
      const intentRes = await api.post(
        "/payments/create-intent",
        { lawyerId: lawyer.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 2. Create appointment (payment handled via Stripe webhook in production)
      await api.post(
        "/appointments",
        {
          lawyerId: lawyer.id,
          scheduledAt,
          paymentIntentId: intentRes.data.clientSecret.split("_secret_")[0],
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onBooked();
    } catch (err) {
      setError("Booking failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div className="card" style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Book Consultation</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.modalBody}>
          <div style={styles.lawyerSummary}>
            <div style={{ ...styles.avatar, width: "52px", height: "52px", fontSize: "1.1rem" }}>
              {lawyer.id.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p style={{ fontWeight: "600", color: "var(--navy)" }}>Attorney #{lawyer.id.slice(0, 6)}</p>
              <p style={{ color: "var(--gold)", fontWeight: "600" }}>${lawyer.hourlyRate}/hr</p>
            </div>
          </div>

          <hr className="divider" />

          <div className="form-group">
            <label className="form-label">Select Date & Time</label>
            <input
              className="form-input"
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div style={styles.costBreakdown}>
            <span style={{ color: "var(--gray-500)" }}>Consultation fee</span>
            <span style={{ fontWeight: "600", color: "var(--navy)" }}>${lawyer.hourlyRate}</span>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center", marginTop: "1rem", padding: "0.9rem" }}
            onClick={handleBook}
            disabled={loading}
          >
            {loading ? "Booking..." : "Confirm Booking"}
          </button>

          <p style={{ fontSize: "0.75rem", color: "var(--gray-300)", textAlign: "center", marginTop: "0.75rem" }}>
            Payment is processed securely via Stripe
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem" },
  pageTitle: { fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--navy)", marginBottom: "0.25rem" },
  pageSubtitle: { color: "var(--gray-500)", fontSize: "0.95rem" },
  searchBar: {
    display: "flex", alignItems: "center", gap: "0.75rem",
    background: "var(--white)", border: "1.5px solid var(--gray-100)",
    borderRadius: "var(--radius)", padding: "0.6rem 1rem",
    marginBottom: "2rem", boxShadow: "var(--shadow-sm)",
  },
  searchIcon: { fontSize: "1rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" },
  card: { padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1rem" },
  cardTop: { display: "flex", alignItems: "center", gap: "1rem" },
  avatar: {
    width: "46px", height: "46px", borderRadius: "12px",
    background: "var(--navy)", color: "var(--gold)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: "700", fontSize: "0.95rem", flexShrink: 0,
  },
  lawyerName: { fontWeight: "700", color: "var(--navy)", fontSize: "1rem" },
  lawyerRate: { color: "var(--gold)", fontWeight: "600", fontSize: "0.9rem" },
  specialties: { display: "flex", flexWrap: "wrap", gap: "0.4rem" },
  specialtyBadge: { background: "var(--gray-50)", color: "var(--navy-muted)", border: "1px solid var(--gray-100)" },
  bio: { fontSize: "0.875rem", color: "var(--gray-500)", lineHeight: "1.6" },
  empty: { textAlign: "center", color: "var(--gray-500)", padding: "3rem" },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,31,61,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 200, padding: "1rem",
  },
  modal: { width: "100%", maxWidth: "440px", overflow: "hidden" },
  modalHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "1.5rem 1.5rem 0",
  },
  modalTitle: { fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--navy)" },
  closeBtn: { background: "none", border: "none", fontSize: "1rem", color: "var(--gray-500)", cursor: "pointer" },
  modalBody: { padding: "1.25rem 1.5rem 1.5rem" },
  lawyerSummary: { display: "flex", alignItems: "center", gap: "1rem" },
  costBreakdown: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "var(--gray-50)", borderRadius: "var(--radius)", padding: "0.75rem 1rem",
  },
};

export default LawyerList;
