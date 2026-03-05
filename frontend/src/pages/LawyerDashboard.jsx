import { useEffect, useState } from "react";
import { auth } from "../firebase";
import api from "../api";
import Navbar from "../components/Navbar";

const VALID_STATUSES = ["pending", "confirmed", "cancelled", "completed"];

function LawyerDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("appointments");

  // Profile form state
  const [specialties, setSpecialties] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) return;
      setUser(firebaseUser);
      try {
        const token = await firebaseUser.getIdToken();

        // Load appointments
        const apptRes = await api.get(`/appointments/user/${firebaseUser.uid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAppointments(apptRes.data);

        // Load lawyer profile
        const profileRes = await api.get(`/lawyers/${firebaseUser.uid}`).catch(() => null);
        if (profileRes?.data) {
          setProfile(profileRes.data);
          setSpecialties(profileRes.data.specialties?.join(", ") || "");
          setHourlyRate(profileRes.data.hourlyRate || "");
          setBio(profileRes.data.bio || "");
        }
      } catch (err) {
        console.error("Failed to load lawyer data", err);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      const token = await user.getIdToken();
      await api.patch(
        `/appointments/${appointmentId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAppointments(prev =>
        prev.map(a => a.id === appointmentId ? { ...a, status: newStatus } : a)
      );
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const token = await user.getIdToken();
      await api.post(
        "/lawyers",
        {
          specialties: specialties.split(",").map(s => s.trim()).filter(Boolean),
          hourlyRate: parseFloat(hourlyRate),
          bio,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSaveMsg("Profile saved successfully!");
    } catch (err) {
      setSaveMsg("Failed to save profile.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const upcoming = appointments.filter(a => ["confirmed", "pending"].includes(a.status));
  const past = appointments.filter(a => ["completed", "cancelled"].includes(a.status));

  const formatDate = (val) => {
    if (!val) return "—";
    const date = val?.toDate ? val.toDate() : new Date(val);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      <Navbar user={user} />
      <div className="page">
        <div className="fade-up" style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>Lawyer Dashboard</h1>
            <p style={styles.pageSubtitle}>Manage your appointments and profile</p>
          </div>
        </div>

        {/* Stats */}
        <div className="fade-up-2" style={styles.statsRow}>
          {[
            { label: "Total Appointments", value: appointments.length, icon: "📋" },
            { label: "Upcoming", value: upcoming.length, icon: "📅" },
            { label: "Completed", value: appointments.filter(a => a.status === "completed").length, icon: "✅" },
            { label: "Pending", value: appointments.filter(a => a.status === "pending").length, icon: "⏳" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="card" style={styles.statCard}>
              <span style={styles.statIcon}>{icon}</span>
              <span style={styles.statValue}>{value}</span>
              <span style={styles.statLabel}>{label}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="fade-up-3" style={styles.tabs}>
          {["appointments", "profile"].map(tab => (
            <button
              key={tab}
              style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "appointments" ? "📅 Appointments" : "👤 My Profile"}
            </button>
          ))}
        </div>

        {/* Appointments Tab */}
        {activeTab === "appointments" && (
          <div className="fade-up">
            {loading ? (
              <div style={styles.empty}>Loading appointments...</div>
            ) : appointments.length === 0 ? (
              <div className="card" style={styles.emptyCard}>
                <p style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📭</p>
                <h3 style={{ fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}>No appointments yet</h3>
                <p style={{ color: "var(--gray-500)" }}>Clients will appear here once they book with you.</p>
              </div>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <section style={{ marginBottom: "2rem" }}>
                    <h2 style={styles.sectionTitle}>Upcoming</h2>
                    <div style={styles.apptList}>
                      {upcoming.map(a => (
                        <AppointmentRow
                          key={a.id}
                          appointment={a}
                          formatDate={formatDate}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {past.length > 0 && (
                  <section>
                    <h2 style={styles.sectionTitle}>Past</h2>
                    <div style={styles.apptList}>
                      {past.map(a => (
                        <AppointmentRow
                          key={a.id}
                          appointment={a}
                          formatDate={formatDate}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="card fade-up" style={styles.profileCard}>
            <h2 style={styles.sectionTitle}>My Lawyer Profile</h2>
            <p style={{ color: "var(--gray-500)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              This is what clients will see when browsing lawyers.
            </p>

            <div className="form-group">
              <label className="form-label">Specialties</label>
              <input
                className="form-input"
                placeholder="Family Law, Immigration, Criminal Law"
                value={specialties}
                onChange={e => setSpecialties(e.target.value)}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--gray-300)" }}>Separate with commas</span>
            </div>

            <div className="form-group">
              <label className="form-label">Hourly Rate (USD)</label>
              <input
                className="form-input"
                type="number"
                placeholder="150"
                value={hourlyRate}
                onChange={e => setHourlyRate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Tell clients about your experience and expertise..."
                value={bio}
                onChange={e => setBio(e.target.value)}
                style={{ resize: "vertical" }}
              />
            </div>

            {saveMsg && (
              <p style={{ color: saveMsg.includes("success") ? "var(--success)" : "var(--error)", fontSize: "0.875rem", marginBottom: "1rem" }}>
                {saveMsg}
              </p>
            )}

            <button className="btn-primary" onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function AppointmentRow({ appointment, formatDate, onStatusChange }) {
  return (
    <div className="card" style={styles.apptCard}>
      <div style={styles.apptLeft}>
        <div style={styles.apptIcon}>👤</div>
        <div>
          <p style={styles.apptClient}>Client: {appointment.clientId?.slice(0, 10)}...</p>
          <p style={styles.apptDate}>{formatDate(appointment.scheduledAt)}</p>
        </div>
      </div>
      <div style={styles.apptRight}>
        <span className={`badge badge-${appointment.status}`}>
          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
        </span>
        {["pending", "confirmed"].includes(appointment.status) && (
          <select
            style={styles.statusSelect}
            value={appointment.status}
            onChange={e => onStatusChange(appointment.id, e.target.value)}
          >
            {VALID_STATUSES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

const styles = {
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem" },
  pageTitle: { fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--navy)", marginBottom: "0.25rem" },
  pageSubtitle: { color: "var(--gray-500)", fontSize: "0.95rem" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" },
  statCard: { padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.3rem" },
  statIcon: { fontSize: "1.4rem" },
  statValue: { fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: "700", color: "var(--navy)" },
  statLabel: { fontSize: "0.78rem", color: "var(--gray-500)", fontWeight: "500" },
  tabs: { display: "flex", gap: "0.5rem", marginBottom: "1.5rem" },
  tab: {
    padding: "0.6rem 1.25rem", border: "1.5px solid var(--gray-100)",
    borderRadius: "var(--radius)", background: "var(--white)",
    color: "var(--gray-500)", fontWeight: "500", fontSize: "0.875rem",
    transition: "all 0.2s", fontFamily: "var(--font-body)",
  },
  tabActive: { background: "var(--navy)", color: "var(--white)", borderColor: "var(--navy)" },
  sectionTitle: { fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--navy)", marginBottom: "1rem" },
  apptList: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  apptCard: { padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" },
  apptLeft: { display: "flex", alignItems: "center", gap: "1rem" },
  apptIcon: {
    width: "40px", height: "40px", borderRadius: "10px",
    background: "var(--gray-50)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem",
  },
  apptClient: { fontWeight: "600", color: "var(--navy)", fontSize: "0.9rem" },
  apptDate: { fontSize: "0.82rem", color: "var(--gray-500)", marginTop: "0.1rem" },
  apptRight: { display: "flex", alignItems: "center", gap: "0.75rem" },
  statusSelect: {
    border: "1.5px solid var(--gray-100)", borderRadius: "var(--radius)",
    padding: "0.35rem 0.65rem", fontSize: "0.8rem", color: "var(--navy)",
    background: "var(--white)", cursor: "pointer", fontFamily: "var(--font-body)",
  },
  profileCard: { padding: "2rem", maxWidth: "600px" },
  emptyCard: { padding: "4rem 2rem", textAlign: "center", maxWidth: "480px", margin: "0 auto" },
  empty: { textAlign: "center", color: "var(--gray-500)", padding: "3rem" },
};

export default LawyerDashboard;
