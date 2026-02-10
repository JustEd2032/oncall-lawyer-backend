import express from "express";
import Stripe from "stripe";
import { updateAppointmentStatus } from "../services/appointments.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/confirm", async (req, res) => {
  const { paymentIntentId, appointmentId } = req.body;

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (intent.status === "succeeded") {
    await updateAppointmentStatus(appointmentId, "confirmed");
    return res.json({ confirmed: true });
  }

  res.status(400).json({ error: "Payment not completed" });
});

export default router;
