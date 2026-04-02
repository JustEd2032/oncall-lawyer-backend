import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import api from "../api";
import Navbar from "../components/Navbar";
import { formatDate, isCallTime, getTimeUntil } from "../utils/dateUtils";

const VALID_STATUSES = ["pending", "confirmed", "cancelled", "completed"];
const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const DAY_LABELS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const makeDefaultDays = () => Object.fromEntries(
  DAYS.map(day => [day, {
    enabled: ["monday","tuesday","wednesday","thursday","friday"].includes(day),
    blocks: [{ start: "09:00", end: "17:00" }],
    blockedRanges: []
  }])
);

function LawyerDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("appointments");
  const [now, setNow] = useState(new Date());
  const navigate = useNavigate();

  // Profile
  const [specialties, setSpecialties] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Availability
  const [days, setDays] = useState(makeDefaultDays());
  const [appointmentDuration, setAppointmentDuration] = useState(60);
  const [blockedDates, setBlockedDates] = useState([]);
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [savingAvail, setSavingAvail] = useState(false);
  const [availMsg, setAvailMsg] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) return;
      setUser(firebaseUser);
      try {
        const token = await firebaseUser.getIdToken();
        const apptRes = await api.get(`/appointments/user/${firebaseUser.uid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        let data = apptRes.data;
        if (!Array.isArray(data)) data = data?.appointments ?? data?.data ?? [];
        if (!Array.isArray(data)) data = [];
        setAppointments(data);

        try {
          const p = await api.get(`/lawyers/${firebaseUser.uid}`);
          if (p?.data) {
            setSpecialties(p.data.specialties?.join(", ") || "");
            setHourlyRate(p.data.hourlyRate || "");
            setBio(p.data.bio || "");
          }
        } catch {}

        try {
          const av = await api.get(`/availability/${firebaseUser.uid}`);
          if (av?.data) {
            setDays(av.data.days || makeDefaultDays());
            setAppointmentDuration(av.data.appointmentDuration || 60);
            setBlockedDates(av.data.blockedDates || []);
          }
        } catch {}
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      const token = await user.getIdToken();
      await api.patch(`/appointments/${id}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch { alert("Failed to update status."); }
  };

  const handleSaveProfile = async () => {
    setSaving(true); setSaveMsg("");
    try {
      const token = await user.getIdToken();
      await api.post("/lawyers", {
        specialties: specialties.split(",").map(s => s.trim()).filter(Boolean),
        hourlyRate: parseFloat(hourlyRate), bio,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSaveMsg("Profile saved!");
    } catch { setSaveMsg("Failed to save."); }
    finally { setSaving(false); }
  };

  const handleSaveAvailability = async () => {
    setSavingAvail(true); setAvailMsg("");
    try {
      const token = await user.getIdToken();
      await api.post("/availability", { days, appointmentDuration, blockedDates },
        { headers: { Authorization: `Bearer ${token}` } });
      setAvailMsg("Availability saved!");
    } catch { setAvailMsg("Failed to save."); }
    finally { setSavingAvail(false); }
  };

  // Day helpers
  const updateDayEnabled = (day, enabled) =>
    setDays(prev => ({ ...prev, [day]: { ...prev[day], enabled } }));

  const addBlock = (day) =>
    setDays(prev => ({ ...prev, [day]: { ...prev[day], blocks: [...(prev[day].blocks || []), { start: "09:00", end: "17:00" }] } }));

  const updateBlock = (day, idx, field, value) =>
    setDays(prev => {
      const blocks = [...(prev[day].blocks || [])];
      blocks[idx] = { ...blocks[idx], [field]: value };
      return { ...prev, [day]: { ...prev[day], blocks } };
    });

  const removeBlock = (day, idx) =>
    setDays(prev => {
      const blocks = (prev[day].blocks || []).filter((_, i) => i !== idx);
      return { ...prev, [day]: { ...prev[day], blocks } };
    });

  const addBlockedRange = (day) =>
    setDays(prev => ({ ...prev, [day]: { ...prev[day], blockedRanges: [...(prev[day].blockedRanges || []), { start: "12:00", end: "13:00" }] } }));

  const updateBlockedRange = (day, idx, field, value) =>
    setDays(prev => {
      const ranges = [...(prev[day].blockedRanges || [])];
      ranges[idx] = { ...ranges[idx], [field]: value };
      return { ...prev, [day]: { ...prev[day], blockedRanges: ranges } };
    });

  const removeBlockedRange = (day, idx) =>
    setDays(prev => {
      const ranges = (prev[day].blockedRanges || []).filter((_, i) => i !== idx);
      return { ...prev, [day]: { ...prev[day], blockedRanges: ranges } };
    });

  const appts = Array.isArray(appointments) ? appointments : [];
  const upcoming = appts.filter(a => ["confirmed","pending"].includes(a.status));
  const past = appts.filter(a => ["completed","cancelled"].includes(a.status));

  return (
    <>
      <Navbar user={user} />
      <div className="page">
        <div className="fade-up" style={s.header}>
          <div>
            <h1 style={s.pageTitle}>Lawyer Dashboard</h1>
            <p style={s.pageSubtitle}>Manage appointments, availability and profile</p>
          </div>
        </div>

        <div className="fade-up-2" style={s.statsRow}>
          {[
            { label: "Total", value: appts.length, icon: "📋" },
            { label: "Upcoming", value: upcoming.length, icon: "📅" },
            { label: "Completed", value: appts.filter(a => a.status === "completed").length, icon: "✅" },
            { label: "Pending", value: appts.filter(a => a.status === "pending").length, icon: "⏳" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="card" style={s.statCard}>
              <span style={s.statIcon}>{icon}</span>
              <span style={s.statValue}>{value}</span>
              <span style={s.statLabel}>{label}</span>
            </div>
          ))}
        </div>

        <div className="fade-up-3" style={s.tabs}>
          {["appointments","availability","profile"].map(tab => (
            <button key={tab} style={{ ...s.tab, ...(activeTab === tab ? s.tabActive : {}) }} onClick={() => setActiveTab(tab)}>
              {tab === "appointments" ? "📅 Appointments" : tab === "availability" ? "🗓 Availability" : "👤 Profile"}
            </button>
          ))}
        </div>

        {/* Appointments */}
        {activeTab === "appointments" && (
          <div className="fade-up">
            {loading ? <div style={s.empty}>Loading...</div> : appts.length === 0 ? (
              <div className="card" style={s.emptyCard}>
                <p style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📭</p>
                <h3 style={{ fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}>No appointments yet</h3>
                <p style={{ color: "var(--gray-500)" }}>Clients will appear here once they book.</p>
              </div>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <section style={{ marginBottom: "2rem" }}>
                    <h2 style={s.sectionTitle}>Upcoming</h2>
                    <div style={s.apptList}>
                      {upcoming.map(a => <AppointmentRow key={a.id} appointment={a} now={now} onStatusChange={handleStatusChange} onJoin={() => navigate(`/call/${a.id}`)} />)}
                    </div>
                  </section>
                )}
                {past.length > 0 && (
                  <section>
                    <h2 style={s.sectionTitle}>Past</h2>
                    <div style={s.apptList}>
                      {past.map(a => <AppointmentRow key={a.id} appointment={a} now={now} onStatusChange={handleStatusChange} />)}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {/* Availability */}
        {activeTab === "availability" && (
          <div className="fade-up">
            <div className="card" style={s.availCard}>
              <h2 style={s.sectionTitle}>Availability Settings</h2>
              <p style={{ color: "var(--gray-500)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                Set working blocks per day, mark specific time ranges as unavailable, and block full dates.
                Clients see 5-minute slots — booked and blocked times appear greyed out.
              </p>

              {/* Appointment duration */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Default Appointment Length (min)</label>
                  <input
                    className="form-input" type="number" min="5" max="480" style={{ width: "120px" }}
                    value={appointmentDuration}
                    onChange={e => setAppointmentDuration(Number(e.target.value))}
                  />
                </div>
                <p style={{ color: "var(--gray-500)", fontSize: "0.8rem", maxWidth: "300px", marginTop: "1.5rem" }}>
                  When a client books at e.g. 4:15, this many minutes become unavailable (4:15–5:15).
                </p>
              </div>

              <hr className="divider" />

              {/* Per-day schedule */}
              {DAYS.map((day, i) => (
                <div key={day} style={s.daySection}>
                  <div style={s.dayHeader}>
                    <label style={s.toggleLabel}>
                      <input
                        type="checkbox"
                        checked={days[day]?.enabled || false}
                        onChange={e => updateDayEnabled(day, e.target.checked)}
                        style={{ marginRight: "0.5rem" }}
                      />
                      <span style={{ fontWeight: "700", color: days[day]?.enabled ? "var(--navy)" : "var(--gray-300)", fontSize: "0.95rem", minWidth: "100px" }}>
                        {DAY_LABELS[i]}
                      </span>
                    </label>
                    {days[day]?.enabled && (
                      <span style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>
                        {(days[day].blocks || []).length} working block(s) · {(days[day].blockedRanges || []).length} gap(s)
                      </span>
                    )}
                  </div>

                  {days[day]?.enabled && (
                    <div style={s.dayBody}>
                      {/* Working blocks */}
                      <div style={s.blockSection}>
                        <p style={s.blockLabel}>Working Blocks</p>
                        {(days[day].blocks || []).map((block, idx) => (
                          <div key={idx} style={s.timeRow}>
                            <input type="time" className="form-input" style={{ width: "130px" }}
                              value={block.start} onChange={e => updateBlock(day, idx, "start", e.target.value)} />
                            <span style={s.toLabel}>to</span>
                            <input type="time" className="form-input" style={{ width: "130px" }}
                              value={block.end} onChange={e => updateBlock(day, idx, "end", e.target.value)} />
                            {(days[day].blocks || []).length > 1 && (
                              <button style={s.removeBtn} onClick={() => removeBlock(day, idx)}>✕ Remove</button>
                            )}
                          </div>
                        ))}
                        <button className="btn-secondary" style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem", marginTop: "0.5rem" }}
                          onClick={() => addBlock(day)}>
                          + Add Block
                        </button>
                      </div>

                      {/* Blocked ranges */}
                      <div style={s.blockSection}>
                        <p style={{ ...s.blockLabel, color: "var(--error)" }}>Unavailable Gaps <span style={{ color: "var(--gray-500)", fontWeight: "400" }}>(within working blocks)</span></p>
                        {(days[day].blockedRanges || []).length === 0 && (
                          <p style={{ color: "var(--gray-300)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>No gaps set — full working blocks are open</p>
                        )}
                        {(days[day].blockedRanges || []).map((range, idx) => (
                          <div key={idx} style={s.timeRow}>
                            <input type="time" className="form-input" style={{ width: "130px" }}
                              value={range.start} onChange={e => updateBlockedRange(day, idx, "start", e.target.value)} />
                            <span style={s.toLabel}>to</span>
                            <input type="time" className="form-input" style={{ width: "130px" }}
                              value={range.end} onChange={e => updateBlockedRange(day, idx, "end", e.target.value)} />
                            <button style={s.removeBtn} onClick={() => removeBlockedRange(day, idx)}>✕ Remove</button>
                          </div>
                        ))}
                        <button className="btn-secondary" style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem", marginTop: "0.5rem" }}
                          onClick={() => addBlockedRange(day)}>
                          + Add Gap
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <hr className="divider" />

              {/* Blocked dates */}
              <h2 style={{ ...s.sectionTitle, marginBottom: "0.5rem" }}>Blocked Dates</h2>
              <p style={{ color: "var(--gray-500)", fontSize: "0.875rem", marginBottom: "1rem" }}>Block full days — vacations, holidays, etc.</p>
              <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                <input type="date" className="form-input" style={{ maxWidth: "200px" }}
                  value={newBlockedDate} min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setNewBlockedDate(e.target.value)} />
                <button className="btn-secondary" onClick={() => {
                  if (!newBlockedDate || blockedDates.includes(newBlockedDate)) return;
                  setBlockedDates(prev => [...prev, newBlockedDate].sort());
                  setNewBlockedDate("");
                }}>+ Block Date</button>
              </div>
              {blockedDates.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem" }}>
                  {blockedDates.map(date => (
                    <div key={date} style={s.blockedTag}>
                      <span>{new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                      <button style={{ background: "none", border: "none", color: "var(--gray-500)", cursor: "pointer", fontSize: "0.8rem" }}
                        onClick={() => setBlockedDates(prev => prev.filter(d => d !== date))}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {availMsg && (
                <p style={{ color: availMsg.includes("saved") ? "var(--success)" : "var(--error)", fontSize: "0.875rem", marginBottom: "1rem" }}>
                  {availMsg}
                </p>
              )}
              <button className="btn-primary" onClick={handleSaveAvailability} disabled={savingAvail}>
                {savingAvail ? "Saving..." : "Save Availability"}
              </button>
            </div>
          </div>
        )}

        {/* Profile */}
        {activeTab === "profile" && (
          <div className="card fade-up" style={{ padding: "2rem", maxWidth: "600px" }}>
            <h2 style={s.sectionTitle}>My Lawyer Profile</h2>
            <div className="form-group">
              <label className="form-label">Specialties</label>
              <input className="form-input" placeholder="Family Law, Immigration" value={specialties} onChange={e => setSpecialties(e.target.value)} />
              <span style={{ fontSize: "0.75rem", color: "var(--gray-300)" }}>Separate with commas</span>
            </div>
            <div className="form-group">
              <label className="form-label">Hourly Rate (USD)</label>
              <input className="form-input" type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea className="form-input" rows={4} value={bio} onChange={e => setBio(e.target.value)} style={{ resize: "vertical" }} />
            </div>
            {saveMsg && <p style={{ color: saveMsg.includes("saved") ? "var(--success)" : "var(--error)", fontSize: "0.875rem", marginBottom: "1rem" }}>{saveMsg}</p>}
            <button className="btn-primary" onClick={handleSaveProfile} disabled={saving}>{saving ? "Saving..." : "Save Profile"}</button>
          </div>
        )}
      </div>
    </>
  );
}

function AppointmentRow({ appointment, now, onStatusChange, onJoin }) {
  const canJoin = isCallTime(appointment.scheduledAt, now) && appointment.status === "confirmed";
  return (
    <div className="card" style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", ...(canJoin ? { borderLeft: "3px solid var(--gold)" } : {}) }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "var(--gray-50)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>👤</div>
        <div>
          <p style={{ fontWeight: "600", color: "var(--navy)", fontSize: "0.9rem" }}>Client: {appointment.clientId?.slice(0, 10)}...</p>
          <p style={{ fontSize: "0.82rem", color: "var(--gray-500)", marginTop: "0.1rem" }}>{formatDate(appointment.scheduledAt)}</p>
          {canJoin && <p style={{ fontSize: "0.8rem", color: "var(--gold)", fontWeight: "600", marginTop: "0.2rem" }}>{getTimeUntil(appointment.scheduledAt, now)}</p>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        {canJoin && onJoin && <button className="btn-gold" style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }} onClick={onJoin}>📞 Join Call</button>}
        <span className={`badge badge-${appointment.status}`}>{appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}</span>
        <select style={{ border: "1.5px solid var(--gray-100)", borderRadius: "var(--radius)", padding: "0.35rem 0.65rem", fontSize: "0.8rem", color: "var(--navy)", background: "var(--white)", cursor: "pointer", fontFamily: "var(--font-body)" }}
          value={appointment.status} onChange={e => onStatusChange(appointment.id, e.target.value)}>
          {VALID_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>
    </div>
  );
}

const s = {
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem" },
  pageTitle: { fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--navy)", marginBottom: "0.25rem" },
  pageSubtitle: { color: "var(--gray-500)", fontSize: "0.95rem" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" },
  statCard: { padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.3rem" },
  statIcon: { fontSize: "1.4rem" },
  statValue: { fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: "700", color: "var(--navy)" },
  statLabel: { fontSize: "0.78rem", color: "var(--gray-500)", fontWeight: "500" },
  tabs: { display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" },
  tab: { padding: "0.6rem 1.25rem", border: "1.5px solid var(--gray-100)", borderRadius: "var(--radius)", background: "var(--white)", color: "var(--gray-500)", fontWeight: "500", fontSize: "0.875rem", transition: "all 0.2s", fontFamily: "var(--font-body)" },
  tabActive: { background: "var(--navy)", color: "var(--white)", borderColor: "var(--navy)" },
  sectionTitle: { fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--navy)", marginBottom: "1rem" },
  apptList: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  availCard: { padding: "2rem", maxWidth: "760px" },
  daySection: { borderBottom: "1px solid var(--gray-100)", paddingBottom: "1.25rem", marginBottom: "1.25rem" },
  dayHeader: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" },
  toggleLabel: { display: "flex", alignItems: "center", cursor: "pointer" },
  dayBody: { paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" },
  blockSection: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  blockLabel: { fontSize: "0.8rem", fontWeight: "600", color: "var(--navy)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.04em" },
  timeRow: { display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" },
  toLabel: { color: "var(--gray-500)", fontSize: "0.875rem" },
  removeBtn: { background: "none", border: "1px solid var(--gray-100)", borderRadius: "6px", color: "var(--error)", cursor: "pointer", fontSize: "0.78rem", padding: "0.3rem 0.6rem", fontFamily: "var(--font-body)" },
  blockedTag: { display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--gray-50)", border: "1px solid var(--gray-100)", borderRadius: "999px", padding: "0.3rem 0.75rem", fontSize: "0.82rem", color: "var(--navy)" },
  emptyCard: { padding: "4rem 2rem", textAlign: "center", maxWidth: "480px", margin: "0 auto" },
  empty: { textAlign: "center", color: "var(--gray-500)", padding: "3rem" },
};

export default LawyerDashboard;
