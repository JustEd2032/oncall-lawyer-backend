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
        <div className="fade-up" style={st.header}>
          <div>
            <h1 style={st.pageTitle}>Find a Lawyer</h1>
            <p style={st.pageSubtitle}>Browse our network of verified attorneys</p>
          </div>
        </div>

        <div className="fade-up-2" style={st.searchBar}>
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
          <div style={st.empty}>Loading lawyers...</div>
        ) : filtered.length === 0 ? (
          <div style={st.empty}>{lawyerList.length === 0 ? "No lawyers available yet." : "No lawyers found."}</div>
        ) : (
          <div className="fade-up-3" style={st.grid}>
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
    <div className="card" style={st.card}>
      <div style={st.cardTop}>
        <div style={st.avatar}>{initials}</div>
        <div>
          <p style={st.lawyerName}>Attorney #{lawyer.id.slice(0, 6)}</p>
          <p style={st.lawyerRate}>${lawyer.hourlyRate}/hr</p>
        </div>
      </div>
      {Array.isArray(lawyer.specialties) && lawyer.specialties.length > 0 && (
        <div style={st.specialties}>
          {lawyer.specialties.map(s => (
            <span key={s} className="badge" style={st.specialtyBadge}>{s}</span>
          ))}
        </div>
      )}
      {lawyer.bio && <p style={st.bio}>{lawyer.bio}</p>}
      <button className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "auto" }} onClick={onBook}>
        Book Consultation
      </button>
    </div>
  );
}

// Format "HH:MM" → "9:00 AM"
function formatTime(time) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

// Format hour integer → "9 AM"
function formatHour(h) {
  const d = new Date(); d.setHours(h, 0, 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
}

function getEndTime(time, duration) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(); d.setHours(h, m + duration, 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function BookingModal({ lawyer, user, onClose, onBooked }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [expandedHour, setExpandedHour] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsBlocked, setSlotsBlocked] = useState(false);
  const [appointmentDuration, setAppointmentDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Client timezone offset in minutes
  

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlot("");
    setExpandedHour(null);
    setSlotsBlocked(false);

    const now = new Date();
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const clientIsToday = selectedDate === todayLocal;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    api.get(`/availability/${lawyer.id}/slots?date=${selectedDate}&isToday=${clientIsToday}&nowMinutes=${nowMinutes}&tzOffset=${-new Date().getTimezoneOffset()}`)
      .then(res => {
        setSlots(res.data.slots || []);
        setSlotsBlocked(res.data.blocked || false);
        setAppointmentDuration(res.data.appointmentDuration || 60);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, lawyer.id]);

  // Group slots by hour
  const hourGroups = useMemo(() => {
    const groups = {};
    for (const slot of slots) {
      const hour = parseInt(slot.time.split(":")[0]);
      if (!groups[hour]) groups[hour] = [];
      groups[hour].push(slot);
    }
    return groups;
  }, [slots]);

  const sortedHours = useMemo(() => Object.keys(hourGroups).map(Number).sort((a, b) => a - b), [hourGroups]);

  const availableSlots = useMemo(() => slots.filter(s => s.available), [slots]);

  // Hour icon status: "available" | "partial" | "unavailable"
  const hourStatus = (hour) => {
    const group = hourGroups[hour] || [];
    const avail = group.filter(s => s.available).length;
    if (avail === 0) return "unavailable";
    if (avail === group.length) return "available";
    return "partial";
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

      const tzOffset = -new Date().getTimezoneOffset();
      await api.post("/appointments",
        { lawyerId: lawyer.id, scheduledAt, paymentIntentId: intentRes.data.clientSecret.split("_secret_")[0], tzOffset },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Re-fetch slots so booked time shows as unavailable for anyone else viewing
      const now = new Date();
      const todayLocal = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
      const clientIsToday = selectedDate === todayLocal;
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const refreshed = await api.get(`/availability/${lawyer.id}/slots?date=${selectedDate}&isToday=${clientIsToday}&nowMinutes=${nowMinutes}&tzOffset=${-new Date().getTimezoneOffset()}`);
      setSlots(refreshed.data.slots || []);
      setSelectedSlot("");
      onBooked();
    } catch (err) {
      setError(err.response?.data?.error || "Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const statusColors = {
    available:   { bg: "var(--brown-deep)",  color: "var(--gold-light)",  border: "var(--brown-deep)" },
    partial:     { bg: "var(--parchment)",    color: "var(--brown-mid)",   border: "var(--brown-light)" },
    unavailable: { bg: "var(--cream)",    color: "var(--gray-warm)",   border: "var(--parchment)" },
  };

  return (
    <div style={st.overlay} onClick={onClose}>
      <div className="card" style={st.modal} onClick={e => e.stopPropagation()}>
        <div style={st.modalHeader}>
          <h2 style={st.modalTitle}>Book Consultation</h2>
          <button style={st.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={st.modalBody}>
          {/* Lawyer summary */}
          <div style={st.lawyerSummary}>
            <div style={{ ...st.avatar, width: "48px", height: "48px" }}>
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
              onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(""); setExpandedHour(null); }}
            />
          </div>

          {/* Hour icons + expanded 5-min slots */}
          {selectedDate && (
            <div style={{ marginBottom: "1.25rem" }}>
              <label className="form-label" style={{ display: "block", marginBottom: "0.6rem" }}>
                Select Time
              </label>

              {loadingSlots ? (
                <p style={{ color: "var(--gray-500)", fontSize: "0.875rem" }}>Loading available times...</p>
              ) : slotsBlocked ? (
                <p style={{ color: "var(--error)", fontSize: "0.875rem" }}>This date is blocked. Please choose another.</p>
              ) : slots.length === 0 ? (
                <p style={{ color: "var(--gray-500)", fontSize: "0.875rem" }}>No available times on this day.</p>
              ) : availableSlots.length === 0 ? (
                <p style={{ color: "var(--gray-500)", fontSize: "0.875rem" }}>All times are booked for this day.</p>
              ) : (
                <>
                  {/* Legend */}
                  <div style={st.legend}>
                    <div style={st.legendItem}><span style={{ ...st.legendDot, background: "var(--navy)" }} />Available</div>
                    <div style={st.legendItem}><span style={{ ...st.legendDot, background: "var(--navy-muted)", opacity: 0.5 }} />Partial</div>
                    <div style={st.legendItem}><span style={{ ...st.legendDot, background: "var(--parchment)", border: "1px solid var(--gray-warm)", opacity: 0.6 }} />Unavailable</div>
                  </div>

                  {/* Hour icons row */}
                  <div style={st.hourRow}>
                    {sortedHours.map(hour => {
                      const status = hourStatus(hour);
                      const isExpanded = expandedHour === hour;
                      const c = statusColors[status];
                      return (
                        <button
                          key={hour}
                          disabled={status === "unavailable"}
                          onClick={() => setExpandedHour(isExpanded ? null : hour)}
                          style={{
                            ...st.hourBtn,
                            background: isExpanded ? "var(--gold)" : c.bg,
                            color: isExpanded ? "#fff" : c.color,
                            border: `2px solid ${isExpanded ? "var(--gold)" : c.border}`,
                            cursor: status === "unavailable" ? "not-allowed" : "pointer",
                            transform: isExpanded ? "translateY(-2px)" : "none",
                            boxShadow: isExpanded ? "0 4px 12px rgba(201,168,76,0.3)" : "none",
                          }}
                          title={`${formatHour(hour)} — ${hourGroups[hour].filter(s => s.available).length} slot(s) available`}
                        >
                          <span style={st.hourBtnTime}>{formatHour(hour)}</span>
                          <span style={{ ...st.hourBtnCount, color: isExpanded ? "rgba(255,255,255,0.8)" : c.color }}>
                            {status === "unavailable" ? "full" : `${hourGroups[hour].filter(s => s.available).length} open`}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Expanded 5-min slots for selected hour */}
                  {expandedHour !== null && hourGroups[expandedHour] && (
                    <div style={st.expandedPanel}>
                      <p style={st.expandedLabel}>
                        {formatHour(expandedHour)} — pick a start time
                        <span style={{ color: "var(--gray-500)", fontWeight: "400" }}> (session ends {appointmentDuration} min later)</span>
                      </p>
                      <div style={st.subSlotsGrid}>
                        {hourGroups[expandedHour].map(slot => (
                          <button
                            key={slot.time}
                            disabled={!slot.available}
                            onClick={() => slot.available && setSelectedSlot(slot.time)}
                            style={{
                              ...st.subSlotBtn,
                              ...(selectedSlot === slot.time ? st.subSlotSelected :
                                slot.available ? st.subSlotAvail : st.subSlotUnavail)
                            }}
                            title={slot.available
                              ? `${formatTime(slot.time)} – ${getEndTime(slot.time, appointmentDuration)}`
                              : slot.reason === "booked" ? "Already booked" : "Unavailable"
                            }
                          >
                            {slot.time.slice(3)}
                            {!slot.available && <span style={st.blockedDot}>●</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Booking summary */}
          {selectedSlot && (
            <div style={st.summary}>
              <div>
                <p style={{ fontWeight: "600", color: "var(--navy)", fontSize: "0.9rem" }}>
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
                <p style={{ color: "var(--gray-500)", fontSize: "0.82rem" }}>
                  {formatTime(selectedSlot)} – {getEndTime(selectedSlot, appointmentDuration)} ({appointmentDuration} min)
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

const st = {
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
  overlay: { position: "fixed", inset: 0, background: "rgba(44,26,14,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem" },
  modal: { width: "100%", maxWidth: "500px", maxHeight: "92vh", overflowY: "auto" },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.5rem 1.5rem 0" },
  modalTitle: { fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--navy)" },
  closeBtn: { background: "none", border: "none", fontSize: "1rem", color: "var(--gray-500)", cursor: "pointer" },
  modalBody: { padding: "1.25rem 1.5rem 1.5rem" },
  lawyerSummary: { display: "flex", alignItems: "center", gap: "1rem" },
  legend: { display: "flex", gap: "1rem", marginBottom: "0.75rem", flexWrap: "wrap" },
  legendItem: { display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--gray-500)" },
  legendDot: { width: "10px", height: "10px", borderRadius: "50%", display: "inline-block", flexShrink: 0 },
  hourRow: { display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" },
  hourBtn: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "0.6rem 0.75rem", borderRadius: "var(--radius-lg)",
    minWidth: "72px", fontFamily: "var(--font-body)",
    transition: "all 0.15s ease",
  },
  hourBtnTime: { fontSize: "0.85rem", fontWeight: "700", lineHeight: 1.2 },
  hourBtnCount: { fontSize: "0.65rem", marginTop: "0.2rem", opacity: 0.8 },
  expandedPanel: {
    background: "var(--cream)", border: "1px solid var(--parchment)",
    borderRadius: "var(--radius)", padding: "1rem", marginTop: "0.25rem",
    animation: "fadeUp 0.2s ease",
  },
  expandedLabel: { fontSize: "0.8rem", fontWeight: "600", color: "var(--navy)", marginBottom: "0.75rem" },
  subSlotsGrid: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.35rem" },
  subSlotBtn: {
    padding: "0.4rem 0.2rem", borderRadius: "6px",
    fontSize: "0.72rem", fontWeight: "500", fontFamily: "var(--font-body)",
    textAlign: "center", position: "relative", transition: "all 0.1s",
    border: "1.5px solid var(--parchment)", background: "var(--white)", color: "var(--brown-deep)",
  },
  subSlotAvail: { background: "var(--white)", color: "var(--brown-deep)", borderColor: "var(--parchment)", cursor: "pointer" },
  subSlotSelected: { background: "var(--brown-deep)", color: "var(--gold-light)", border: "1.5px solid var(--brown-deep)", cursor: "pointer" },
  subSlotUnavail: { background: "transparent", color: "var(--gray-warm)", border: "1.5px solid var(--parchment)", cursor: "not-allowed", opacity: "0.35", textDecoration: "line-through" },
  blockedDot: { position: "absolute", top: "1px", right: "2px", fontSize: "0.4rem", color: "var(--error)" },
  summary: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--parchment)", borderRadius: "var(--radius)", padding: "0.75rem 1rem", border: "1px solid var(--gold-pale)" },
};

export default LawyerList;
