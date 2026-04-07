import express from "express";
import { authenticate } from "../middleware/auth.js";
import { db } from "../services/firestore.js";
import {
  createAppointment,
  updateAppointmentStatus,
  getAppointmentsByUser,
  getAppointmentById
} from "../services/appointments.js";
import { sendBookingConfirmation } from "../services/email.js";

const router = express.Router();

router.post("/", authenticate, async (req, res) => {
  try {
    const clientId = req.user.uid;
    // tzOffset = client's UTC offset in minutes (e.g. -360 for UTC-6)
    const { lawyerId, scheduledAt, paymentIntentId, tzOffset } = req.body;

    if (!clientId || !lawyerId || !scheduledAt) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const parsedDate = new Date(scheduledAt);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    // ── Double booking check ──
    // Get the lawyer's appointment duration
    const availDoc = await db.collection("availability").doc(lawyerId).get();
    const duration = availDoc.exists ? (availDoc.data().appointmentDuration || 60) : 60;

    const newStart = parsedDate.getTime();
    const newEnd = newStart + duration * 60 * 1000;

    // Check for any active appointments that overlap this slot
    const startWindow = new Date(newStart - duration * 60 * 1000);
    const endWindow = new Date(newEnd);

    const conflictSnapshot = await db.collection("appointments")
      .where("lawyerId", "==", lawyerId)
      .where("scheduledAt", ">=", startWindow)
      .where("scheduledAt", "<=", endWindow)
      .get();

    const hasConflict = conflictSnapshot.docs.some(doc => {
      const appt = doc.data();
      if (["cancelled"].includes(appt.status)) return false;
      const existingStart = appt.scheduledAt?.toDate
        ? appt.scheduledAt.toDate().getTime()
        : new Date(appt.scheduledAt._seconds * 1000).getTime();
      const existingEnd = existingStart + duration * 60 * 1000;
      // Overlap check
      return newStart < existingEnd && newEnd > existingStart;
    });

    if (hasConflict) {
      return res.status(409).json({ error: "This time slot is no longer available. Please choose another time." });
    }

    const appointment = await createAppointment({
      clientId, lawyerId,
      scheduledAt: parsedDate,
      paymentIntentId,
      // Store client timezone offset so emails show correct local time
      tzOffset: tzOffset || 0,
    });

    // Send confirmation emails in background
    Promise.all([
      db.collection("users").doc(clientId).get(),
      db.collection("users").doc(lawyerId).get(),
    ]).then(async ([clientDoc, lawyerDoc]) => {
      const clientEmail = clientDoc.exists ? clientDoc.data().email : null;
      const lawyerEmail = lawyerDoc.exists ? lawyerDoc.data().email : null;
      const clientName = clientDoc.exists ? (clientDoc.data().name || clientEmail) : "Client";
      const lawyerName = lawyerDoc.exists ? (lawyerDoc.data().name || lawyerEmail) : "Attorney";

      const shared = {
        scheduledAt: parsedDate,
        appointmentId: appointment.id,
        clientName,
        lawyerName,
        tzOffset: tzOffset || 0,
      };

      if (clientEmail) {
        await sendBookingConfirmation({ ...shared, toEmail: clientEmail, role: "client" })
          .catch(e => console.error("Client confirmation email failed:", e));
      }
      if (lawyerEmail) {
        await sendBookingConfirmation({ ...shared, toEmail: lawyerEmail, role: "lawyer" })
          .catch(e => console.error("Lawyer confirmation email failed:", e));
      }
    }).catch(e => console.error("Email fetch error:", e));

    res.json(appointment);
  } catch (err) {
    console.error("Create appointment error:", err);
    res.status(500).json({ error: "Failed to create appointment" });
  }
});

router.patch("/:id/status", authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const VALID_STATUSES = ["pending", "confirmed", "cancelled", "completed"];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }
    const appointment = await getAppointmentById(req.params.id);
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    const userDoc = await db.collection("users").doc(req.user.uid).get();
    const userRole = userDoc.exists ? userDoc.data().role : "client";
    const isClient = appointment.clientId === req.user.uid;
    const isLawyer = appointment.lawyerId === req.user.uid || userRole === "lawyer";

    if (!isClient && !isLawyer) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await updateAppointmentStatus(req.params.id, status);
    res.json({ success: true });
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

router.get("/user/:id", authenticate, async (req, res) => {
  try {
    if (req.user.uid !== req.params.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    const userRole = userDoc.exists ? userDoc.data().role : "client";

    let appointments;
    if (userRole === "lawyer") {
      const snapshot = await db.collection("appointments")
        .where("lawyerId", "==", req.params.id)
        .get();
      appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      appointments = await getAppointmentsByUser(req.params.id);
    }
    res.json(appointments);
  } catch (err) {
    console.error("Get appointments error:", err);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

export default router;
