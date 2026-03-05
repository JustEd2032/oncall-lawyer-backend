import express from "express";
import Stripe from "stripe";
import { updateAppointmentStatus, getAppointmentById } from "../services/appointments.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/confirm", authenticate, async (req, res) => {
  const { paymentIntentId, appointmentId } = req.body;

  // Verify the appointment belongs to the requesting user
  const appointment = await getAppointmentById(appointmentId);
  if (!appointment) return res.status(404).json({ error: "Appointment not found" });

  if (appointment.clientId !== req.user.uid) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (intent.status === "succeeded") {
    await updateAppointmentStatus(appointmentId, "confirmed");
    return res.json({ confirmed: true });
  }

  res.status(400).json({ error: "Payment not completed" });
});

export default router;
