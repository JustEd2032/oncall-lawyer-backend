import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import api from "../api";
import Navbar from "../components/Navbar";

const statusOrder = ["confirmed", "pending", "completed", "cancelled"];

function ClientDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) return;
      setUser(firebaseUser);
      try {
        const token = await firebaseUser.getIdToken();
        const res = await api.get(`/appointments/user/${firebaseUser.uid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const sorted = res.data.sort(
          (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
        );
        setAppointments(sorted);
      } catch (err) {
        console.error("Failed to load appointments", err);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

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
        {/* Header */}
        <div className="fade-up" style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>My Dashboard</h1>
            <p style={styles.pageSubtitle}>Manage your legal consultations</p>
          </div>
          <button className="btn-primary" onClick={() => navigate("/lawyers")}>
            + Book Consultation
          </button>
        </div>

        {/* Stats row */}
        <div className="fade-up-2" style={styles.statsRow}>
          {[
            { label: "Total Appointments", value: appointments.length, icon: "📋" },
            { label: "Upcoming", value: upcoming.length, icon: "📅" },
            { label: "Completed", value: past.filter(a => a.status === "completed").length, icon: "✅" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="card" style={styles.statCard}>
              <span style={styles.statIcon}>{icon}</span>
              <span style={styles.statValue}>{value}</span>
              <span style={styles.statLabel}>{label}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={styles.empty}>Loading your appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="card fade-up-3" style={styles.emptyCard}>
            <p style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚖️</p>
            <h3 style={{ fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}>No appointments yet</h3>
            <p style={{ color: "var(--gray-500)", marginBottom: "1.5rem" }}>
              Browse our network of verified attorneys and book your first consultation.
            </p>
            <button className="btn-primary" onClick={() => navigate("/lawyers")}>
              Find a Lawyer
            </button>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section className="fade-up-2" style={{ marginBottom: "2rem" }}>
                <h2 style={styles.sectionTitle}>Upcoming</h2>
                <div style={styles.appointmentList}>
                  {upcoming.map(a => <AppointmentCard key={a.id} appointment={a} formatDate={formatDate} />)}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section className="fade-up-3">
                <h2 style={styles.sectionTitle}>Past</h2>
                <div style={styles.appointmentList}>
                  {past.map(a => <AppointmentCard key={a.id} appointment={a} formatDate={formatDate} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}

function AppointmentCard({ appointment, formatDate }) {
  return (
    <div className="card" style={styles.apptCard}>
      <div style={styles.apptLeft}>
        <div style={styles.apptIcon}>⚖️</div>
        <div>
          <p style={styles.apptLawyer}>Lawyer ID: {appointment.lawyerId}</p>
          <p style={styles.apptDate}>{formatDate(appointment.scheduledAt)}</p>
        </div>
      </div>
      <span className={`badge badge-${appointment.status}`}>
        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
      </span>
    </div>
  );
}

const styles = {
  header: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    marginBottom: "2rem", flexWrap: "wrap", gap: "1rem",
  },
  pageTitle: { fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--navy)", marginBottom: "0.25rem" },
  pageSubtitle: { color: "var(--gray-500)", fontSize: "0.95rem" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2.5rem" },
  statCard: { padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "flex-start" },
  statIcon: { fontSize: "1.5rem" },
  statValue: { fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: "700", color: "var(--navy)" },
  statLabel: { fontSize: "0.8rem", color: "var(--gray-500)", fontWeight: "500" },
  sectionTitle: { fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--navy)", marginBottom: "1rem" },
  appointmentList: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  apptCard: {
    padding: "1.25rem 1.5rem", display: "flex", alignItems: "center",
    justifyContent: "space-between", transition: "box-shadow 0.2s",
  },
  apptLeft: { display: "flex", alignItems: "center", gap: "1rem" },
  apptIcon: {
    width: "42px", height: "42px", borderRadius: "10px",
    background: "var(--gray-50)", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: "1.2rem",
  },
  apptLawyer: { fontWeight: "600", color: "var(--navy)", fontSize: "0.95rem" },
  apptDate: { fontSize: "0.85rem", color: "var(--gray-500)", marginTop: "0.1rem" },
  emptyCard: { padding: "4rem 2rem", textAlign: "center", maxWidth: "480px", margin: "0 auto" },
  empty: { textAlign: "center", color: "var(--gray-500)", padding: "3rem" },
};

export default ClientDashboard;
