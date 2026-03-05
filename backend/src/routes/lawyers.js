import express from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import {
  createLawyerProfile,
  listAvailableLawyers
} from "../services/lawyers.js";

const router = express.Router();

router.post("/", authenticate, requireRole("lawyer"), async (req, res) => {
  const userId = req.user.uid;
  const { specialties, hourlyRate, bio } = req.body;  // lawyerId removed from body

  const lawyer = await createLawyerProfile(userId, {  // use verified uid instead
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
