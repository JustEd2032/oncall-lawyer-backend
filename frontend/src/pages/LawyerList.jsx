import { useEffect, useState, useMemo } from "react";
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
    auth.onAuthStateChanged(u => setUser(u));
    api.get("/lawyers")
      .then(res => {
        let data = res.data;
        if (!Array.isArray(data)) data = data?.lawyers ?? data?.data ?? [];
        if (!Array.isArray(data)) data = [];
        setLawyers(data);
      })
      .catch(() => setLawyers([]))
      .finally(() => setLoading(false));
  }, []);

  const lawyerList = Array.isArray(lawyers) ? lawyers : [];
  const filtered = lawyerList.filter(l =>
    !search ||
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
          <span>🔍</span>
          <input
            className="form-input"
            style={{ border: "none", outline: "none", flex: 1, background: "transparent" }}
            placeholder="Search by specialty..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={styles.empty}>Loading lawyers...</div>
        ) : filtered.length === 0 ? (
          <div style={styles.empty}>{lawyerList.length === 0 ? "No lawyers available yet." : "No lawyers found."}</div>
        ) : (
          <div className="fade-up-3" style={styles.grid}>
            {filtered.map(lawyer => (
              <LawyerCard key={lawyer.id} lawyer={lawyer} onBook={() => setSelected(lawyer)} />
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
      {Array.isArray(lawyer.specialties) && lawyer.specialties.length > 0 && (
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
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsBlocked, setSlotsBlocked] = useState(false);
  const [appointmentDuration, setAppointmentDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showUnavailable, setShowUnavailable] = useState(false);

  // Fetch slots whenever date changes
  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlot("");
    setSlotsBlocked(false);

    api.get(`/availability/${lawyer.id}/slots?date=${selectedDate}`)
      .then(res => {
        setSlots(res.data.slots || []);
        setSlotsBlocked(res.data.blocked || false);
        setAppointmentDuration(res.data.appointmentDuration || 60);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, lawyer.id]);

  const availableSlots = useMemo(() => slots.filter(s => s.available), [slots]);
  const unavailableSlots = useMemo(() => slots.filter(s => !s.available), [slots]);

  const formatTime = (time) => {
    const [h, m] = time.split(":").map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const getEndTime = (time) => {
    const [h, m] = time.split(":").map(Number);
    const d = new Date(); d.setHours(h, m + appointmentDuration, 0, 0);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const handleBook = async () => {
    if (!selectedDate || !selectedSlot) return setError("Please select a date and time.");
    setError(""); setLoading(true);
    try {
      const token = await user.getIdToken();
      const scheduledAt = new Date(`${selectedDate}T${selectedSlot}:00`).toISOString();

      const intentRes = await api.post("/payments/create-intent",
        { lawyerId: lawyer.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await api.post("/appointments",
        { lawyerId: lawyer.id, scheduledAt, paymentIntentId: intentRes.data.clientSecret.split("_secret_")[0] },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onBooked();
    } catch (err) {
      setError(err.response?.data?.error || "Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div className="card" style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Book Consultation</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.modalBody}>
          {/* Lawyer summary */}
          <div style={styles.lawyerSummary}>
            <div style={{ ...styles.avatar, width: "48px", height: "48px" }}>
              {lawyer.id.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p style={{ fontWeight: "600", color: "var(--navy)" }}>Attorney #{lawyer.id.slice(0, 6)}</p>
              <p style={{ color: "var(--gold)", fontWeight: "600", fontSize: "0.85rem" }}>
                ${lawyer.hourlyRate}/hr · {appointmentDuration} min sessions
              </p>
            </div>
          </div>

          <hr className="divider" />

          {/* Date picker */}
          <div className="form-group">
            <label className="form-label">Select Date</label>
            <input
              className="form-input" type="date"
              value={selectedDate}
              min={todayStr}
              onChange={e => setSelectedDate(e.target.value)}
            />
          </div>

          {/* Slot section */}
          {selectedDate && (
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <label className="form-label" style={{ margin: 0 }}>Available Times</label>
                {unavailableSlots.length > 0 && (
                  <button
                    style={styles.toggleUnavailBtn}
                    onClick={() => setShowUnavailable(v => !v)}
                  >
                    {showUnavailable ? "Hide" : "Show"} unavailable ({unavailableSlots.length})
                  </button>
                )}
              </div>

              {loadingSlots ? (
                <p style={{ color: "var(--gray-500)", fontSize: "0.875rem" }}>Loading slots...</p>
              ) : slotsBlocked ? (
                <p style={{ color: "var(--error)", fontSize: "0.875rem" }}>This date is fully blocked. Please choose another.</p>
              ) : slots.length === 0 ? (
                <p style={{ color: "var(--gray-500)", fontSize: "0.875rem" }}>No slots available on this day.</p>
              ) : availableSlots.length === 0 ? (
                <p style={{ color: "var(--gray-500)", fontSize: "0.875rem" }}>All slots are booked for this day.</p>
              ) : (
                <>
                  {/* Legend */}
                  <div style={styles.legend}>
                    <span style={styles.legendAvail}>■ Available</span>
                    {showUnavailable && <span style={styles.legendUnavail}>■ Unavailable</span>}
                  </div>

                  {/* Slot grid — available slots */}
                  <div style={styles.slotsGrid}>
                    {availableSlots.map(slot => (
                      <button
                        key={slot.time}
                        style={{
                          ...styles.slotBtn,
                          ...(selectedSlot === slot.time ? styles.slotSelected : styles.slotAvailable)
                        }}
                        onClick={() => setSelectedSlot(slot.time)}
                        title={`${formatTime(slot.time)} – ${getEndTime(slot.time)}`}
                      >
                        {formatTime(slot.time)}
                      </button>
                    ))}

                    {/* Unavailable slots — greyed out, not clickable */}
                    {showUnavailable && unavailableSlots.map(slot => (
                      <button
                        key={slot.time}
                        style={styles.slotUnavailable}
                        disabled
                        title={slot.reason === "booked" ? "Already booked" : "Unavailable"}
                      >
                        {formatTime(slot.time)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Booking summary */}
          {selectedSlot && (
            <div style={styles.summary}>
              <div>
                <p style={{ fontWeight: "600", color: "var(--navy)", fontSize: "0.9rem" }}>
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
                <p style={{ color: "var(--gray-500)", fontSize: "0.82rem" }}>
                  {formatTime(selectedSlot)} – {getEndTime(selectedSlot)} ({appointmentDuration} min)
                </p>
              </div>
              <span style={{ fontWeight: "700", color: "var(--navy)", fontSize: "1.1rem" }}>${lawyer.hourlyRate}</span>
            </div>
          )}

          {error && <p className="form-error" style={{ marginTop: "0.75rem" }}>{error}</p>}

          <button
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center", marginTop: "1rem", padding: "0.9rem" }}
            onClick={handleBook}
            disabled={loading || !selectedSlot}
          >
            {loading ? "Booking..." : selectedSlot ? "Confirm Booking" : "Select a Time Slot"}
          </button>

          <p style={{ fontSize: "0.75rem", color: "var(--gray-300)", textAlign: "center", marginTop: "0.75rem" }}>
            Payment processed securely via Stripe
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
  searchBar: { display: "flex", alignItems: "center", gap: "0.75rem", background: "var(--white)", border: "1.5px solid var(--gray-100)", borderRadius: "var(--radius)", padding: "0.6rem 1rem", marginBottom: "2rem", boxShadow: "var(--shadow-sm)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" },
  card: { padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1rem" },
  cardTop: { display: "flex", alignItems: "center", gap: "1rem" },
  avatar: { width: "46px", height: "46px", borderRadius: "12px", background: "var(--navy)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "0.95rem", flexShrink: 0 },
  lawyerName: { fontWeight: "700", color: "var(--navy)", fontSize: "1rem" },
  lawyerRate: { color: "var(--gold)", fontWeight: "600", fontSize: "0.9rem" },
  specialties: { display: "flex", flexWrap: "wrap", gap: "0.4rem" },
  specialtyBadge: { background: "var(--gray-50)", color: "var(--navy-muted)", border: "1px solid var(--gray-100)" },
  bio: { fontSize: "0.875rem", color: "var(--gray-500)", lineHeight: "1.6" },
  empty: { textAlign: "center", color: "var(--gray-500)", padding: "3rem" },
  overlay: { position: "fixed", inset: 0, background: "rgba(15,31,61,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem" },
  modal: { width: "100%", maxWidth: "500px", maxHeight: "92vh", overflowY: "auto" },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.5rem 1.5rem 0" },
  modalTitle: { fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--navy)" },
  closeBtn: { background: "none", border: "none", fontSize: "1rem", color: "var(--gray-500)", cursor: "pointer" },
  modalBody: { padding: "1.25rem 1.5rem 1.5rem" },
  lawyerSummary: { display: "flex", alignItems: "center", gap: "1rem" },
  legend: { display: "flex", gap: "1rem", marginBottom: "0.5rem", fontSize: "0.75rem" },
  legendAvail: { color: "var(--navy)", fontWeight: "600" },
  legendUnavail: { color: "var(--gray-300)", fontWeight: "600" },
  slotsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.4rem" },
  slotBtn: { padding: "0.45rem 0.25rem", border: "1.5px solid", borderRadius: "var(--radius)", fontSize: "0.75rem", fontWeight: "500", cursor: "pointer", fontFamily: "var(--font-body)", transition: "all 0.15s", textAlign: "center" },
  slotAvailable: { background: "var(--white)", color: "var(--navy)", borderColor: "var(--gray-100)" },
  slotSelected: { background: "var(--navy)", color: "var(--white)", borderColor: "var(--navy)" },
  slotUnavailable: { padding: "0.45rem 0.25rem", border: "1.5px solid var(--gray-100)", borderRadius: "var(--radius)", fontSize: "0.75rem", fontFamily: "var(--font-body)", background: "var(--gray-50)", color: "var(--gray-300)", cursor: "not-allowed", textAlign: "center", textDecoration: "line-through" },
  toggleUnavailBtn: { background: "none", border: "none", fontSize: "0.78rem", color: "var(--navy-muted)", cursor: "pointer", fontFamily: "var(--font-body)", textDecoration: "underline" },
  summary: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--gray-50)", borderRadius: "var(--radius)", padding: "0.75rem 1rem" },
};

export default LawyerList;
