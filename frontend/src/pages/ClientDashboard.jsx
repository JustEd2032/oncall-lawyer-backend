import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import api from "../api";
import Navbar from "../components/Navbar";
import { formatDate, isCallTime, getTimeUntil } from "../utils/dateUtils";

const statusOrder = ["confirmed", "pending", "completed", "cancelled"];

function ClientDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [now, setNow] = useState(new Date());
  const navigate = useNavigate();

  // Tick every 30 seconds so Join Call button appears automatically
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
        const res = await api.get(`/appointments/user/${firebaseUser.uid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        let data = res.data;
        if (!Array.isArray(data)) data = data?.appointments ?? data?.data ?? [];
        if (!Array.isArray(data)) data = [];
        const sorted = [...data].sort(
          (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
        );
        setAppointments(sorted);
      } catch (err) {
        console.error("Failed to load appointments", err);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const appts = Array.isArray(appointments) ? appointments : [];
  const upcoming = appts.filter(a => ["confirmed", "pending"].includes(a.status));
  const past = appts.filter(a => ["completed", "cancelled"].includes(a.status));

  return (
    <>
      {/* Fixed centered gold logo watermark */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 0, pointerEvents: "none",
      }}>
        <img src="/logo-gold.png" alt="" aria-hidden="true" style={{
          width: "340px", height: "auto", objectFit: "contain",
          opacity: 0.07, userSelect: "none",
        }} />
      </div>
      <Navbar user={user} />
      <div className="page" style={{ position: "relative", zIndex: 1 }}>
        <div className="fade-up" style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>My Dashboard</h1>
            <p style={styles.pageSubtitle}>Manage your legal consultations</p>
          </div>
          <button className="btn-primary" onClick={() => navigate("/lawyers")}>
            + Book Consultation
          </button>
        </div>

        <div className="fade-up-2" style={styles.statsRow}>
          {[
            { label: "Total Appointments", value: appts.length, icon: "📋" },
            { label: "Upcoming", value: upcoming.length, icon: "📅" },
            { label: "Completed", value: appts.filter(a => a.status === "completed").length, icon: "✅" },
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
        ) : appts.length === 0 ? (
          <div className="card fade-up-3" style={styles.emptyCard}>
            <p style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚖️</p>
            <h3 style={{ fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}>No appointments yet</h3>
            <p style={{ color: "var(--gray-warm)", marginBottom: "1.5rem" }}>
              Browse our network of verified attorneys and book your first consultation.
            </p>
            <button className="btn-primary" onClick={() => navigate("/lawyers")}>Find a Lawyer</button>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section className="fade-up-2" style={{ marginBottom: "2rem" }}>
                <h2 style={styles.sectionTitle}>Upcoming</h2>
                <div style={styles.appointmentList}>
                  {upcoming.map(a => (
                    <AppointmentCard
                      key={a.id}
                      appointment={a}
                      now={now}
                      onJoin={() => navigate(`/call/${a.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section className="fade-up-3">
                <h2 style={styles.sectionTitle}>Past</h2>
                <div style={styles.appointmentList}>
                  {past.map(a => <AppointmentCard key={a.id} appointment={a} now={now} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}

function AppointmentCard({ appointment, now, onJoin }) {
  const canJoin = isCallTime(appointment.scheduledAt, now) &&
    appointment.status === "confirmed";

  return (
    <div className="card" style={{
      ...styles.apptCard,
      ...(canJoin ? { borderLeft: "3px solid var(--gold)" } : {})
    }}>
      <div style={styles.apptLeft}>
        <div style={styles.apptIcon}>⚖️</div>
        <div>
          <p style={styles.apptLawyer}>Lawyer: {appointment.lawyerId?.slice(0, 8)}...</p>
          <p style={styles.apptDate}>{formatDate(appointment.scheduledAt)}</p>
          {canJoin && (
            <p style={styles.timeUntil}>{getTimeUntil(appointment.scheduledAt, now)}</p>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span className={`badge badge-${appointment.status}`}>
          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
        </span>
        {canJoin && onJoin && (
          <button className="btn-gold" style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }} onClick={onJoin}>
            📞 Join Call
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" },
  pageTitle: { fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--brown-deep)", marginBottom: "0.25rem" },
  pageSubtitle: { color: "var(--gray-warm)", fontSize: "0.95rem" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2.5rem" },
  statCard: { padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "flex-start" },
  statIcon: { fontSize: "1.5rem" },
  statValue: { fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: "700", color: "var(--brown-deep)" },
  statLabel: { fontSize: "0.8rem", color: "var(--gray-warm)", fontWeight: "500" },
  sectionTitle: { fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--brown-deep)", marginBottom: "1rem" },
  appointmentList: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  apptCard: { padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" },
  apptLeft: { display: "flex", alignItems: "center", gap: "1rem" },
  apptIcon: { width: "42px", height: "42px", borderRadius: "10px", background: "var(--parchment)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" },
  apptLawyer: { fontWeight: "600", color: "var(--brown-deep)", fontSize: "0.95rem" },
  apptDate: { fontSize: "0.85rem", color: "var(--gray-warm)", marginTop: "0.1rem" },
  timeUntil: { fontSize: "0.8rem", color: "var(--gold)", fontWeight: "600", marginTop: "0.2rem" },
  emptyCard: { padding: "4rem 2rem", textAlign: "center", maxWidth: "480px", margin: "0 auto" },
  empty: { textAlign: "center", color: "var(--gray-warm)", padding: "3rem" },
};

export default ClientDashboard;
