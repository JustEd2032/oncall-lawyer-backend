import express from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import {
  createLawyerProfile,
  listAvailableLawyers
} from "../services/lawyers.js";

const router = express.Router();

router.post("/", authenticate, requireRole("lawyer"), async (req, res) => {
  const { lawyerId, userId, specialties, hourlyRate, bio } = req.body;

  if (!lawyerId || !userId) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const lawyer = await createLawyerProfile(lawyerId, {
    userId,
    specialties,
    hourlyRate,
    bio
  });

  res.json(lawyer);
});

router.get("/", async (req, res) => {
  const lawyers = await listAvailableLawyers();
  res.json(lawyers);
});

export default router;
