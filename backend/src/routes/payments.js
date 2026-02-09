import express from "express";
import { stripe } from "../services/stripe.js";

const router = express.Router();

router.post("/create-intent", async (req, res) => {
  const { amount } = req.body;

  const intent = await stripe.paymentIntents.create({
    amount,
    currency: "usd",
    automatic_payment_methods: { enabled: true }
  });

  res.json({ clientSecret: intent.client_secret });
});

export default router;
