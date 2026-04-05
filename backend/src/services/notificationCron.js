import cron from "node-cron";
import { db } from "./firestore.js";
import { sendAppointmentReminder } from "./email.js";

// Tracks which appointments have already been notified to avoid duplicate sends
const notifiedAppointments = new Set();

async function checkUpcomingAppointments() {
  try {
    const now = new Date();
    // Window: appointments starting between 14 and 16 minutes from now
    const windowStart = new Date(now.getTime() + 14 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 16 * 60 * 1000);

    const snapshot = await db.collection("appointments")
      .where("scheduledAt", ">=", windowStart)
      .where("scheduledAt", "<=", windowEnd)
      .where("status", "in", ["confirmed", "pending"])
      .get();

    if (snapshot.empty) return;

    for (const doc of snapshot.docs) {
      const appt = doc.data();
      const apptId = doc.id;

      // Skip if already notified this session
      if (notifiedAppointments.has(apptId)) continue;
      notifiedAppointments.add(apptId);

      // Fetch client and lawyer user docs for emails
      const [clientDoc, lawyerDoc] = await Promise.all([
        db.collection("users").doc(appt.clientId).get(),
        db.collection("users").doc(appt.lawyerId).get(),
      ]);

      const clientEmail = clientDoc.exists ? clientDoc.data().email : null;
      const lawyerEmail = lawyerDoc.exists ? lawyerDoc.data().email : null;
      const clientName = clientDoc.exists ? (clientDoc.data().name || clientEmail) : "Client";
      const lawyerName = lawyerDoc.exists ? (lawyerDoc.data().name || lawyerEmail) : "Your attorney";

      const sharedData = {
        scheduledAt: appt.scheduledAt,
        appointmentId: apptId,
        clientName,
        lawyerName,
      };

      // Send to client
      if (clientEmail) {
        await sendAppointmentReminder({
          ...sharedData,
          toEmail: clientEmail,
          role: "client",
        }).catch(err => console.error(`Failed to email client ${clientEmail}:`, err));
      }

      // Send to lawyer
      if (lawyerEmail) {
        await sendAppointmentReminder({
          ...sharedData,
          toEmail: lawyerEmail,
          role: "lawyer",
        }).catch(err => console.error(`Failed to email lawyer ${lawyerEmail}:`, err));
      }

      console.log(`📧 Reminder sent for appointment ${apptId}`);
    }
  } catch (err) {
    console.error("Cron check error:", err);
  }
}

export function startNotificationCron() {
  // Run every 5 minutes
  cron.schedule("*/5 * * * *", () => {
    console.log("🔔 Checking upcoming appointments...");
    checkUpcomingAppointments();
  });

  console.log("✅ Notification cron started");
}
