import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  createAppointment,
  updateAppointmentStatus,
  getAppointmentsByUser
} from "../services/appointments.js";

const router = express.Router();

router.post("/", authenticate,async (req, res) => {
  const { clientId, lawyerId, scheduledAt, paymentIntentId } = req.body;

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

router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;
  await updateAppointmentStatus(req.params.id, status);
  res.json({ success: true });
});

router.get("/user/:id", async (req, res) => {
  const appointments = await getAppointmentsByUser(req.params.id);
  res.json(appointments);
});

export default router;
