import express from "express";
import Stripe from "stripe";
import { updateAppointmentStatus } from "../services/appointments.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object;
      const appointmentId = intent.metadata.appointmentId;

      if (appointmentId) {
        await updateAppointmentStatus(appointmentId, "confirmed");
      }
    }

    res.json({ received: true });
  }
);

export default router;
