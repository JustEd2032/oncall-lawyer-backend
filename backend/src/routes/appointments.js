import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  createAppointment,
  updateAppointmentStatus,
  getAppointmentsByUser,
  getAppointmentById
} from "../services/appointments.js";

const router = express.Router();

router.post("/", authenticate, async (req, res) => {
  const clientId = req.user.uid;
  const { lawyerId, scheduledAt, paymentIntentId } = req.body;

  if (!clientId || !lawyerId || !scheduledAt) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const appointment = await createAppointment({
    clientId,
    lawyerId,
    scheduledAt: new Date(scheduledAt),
    paymentIntentId
  });

  res.json(appointment);
});

router.patch("/:id/status", authenticate, async (req, res) => {
  const { status } = req.body;

  // Fix 3 is also applied here — validate status value
  const VALID_STATUSES = ["pending", "confirmed", "cancelled", "completed"];
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  const appointment = await getAppointmentById(req.params.id);
  if (!appointment) return res.status(404).json({ error: "Appointment not found" });

  // Only the client who owns it, or a lawyer, can update status
  if (appointment.clientId !== req.user.uid && req.user.role !== "lawyer") {
    return res.status(403).json({ error: "Forbidden" });
  }

  await updateAppointmentStatus(req.params.id, status);
  res.json({ success: true });
});

router.get("/user/:id", authenticate, async (req, res) => {
  if (req.user.uid !== req.params.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const appointments = await getAppointmentsByUser(req.params.id);
  res.json(appointments);
});

export default router;
