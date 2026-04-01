import express from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { db } from "../services/firestore.js";
import {
  createLawyerProfile,
  listAvailableLawyers,
  getLawyerById
} from "../services/lawyers.js";

const router = express.Router();

router.post("/", authenticate, requireRole("lawyer"), async (req, res) => {
  const userId = req.user.uid;
  const { specialties, hourlyRate, bio } = req.body;

  const lawyer = await createLawyerProfile(userId, {
    userId,
    specialties,
    hourlyRate,
    bio
  });

  res.json(lawyer);
});

router.get("/", async (req, res) => {
  try {
    const lawyers = await listAvailableLawyers();
    res.json(lawyers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch lawyers" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const lawyer = await getLawyerById(req.params.id);
    if (!lawyer) return res.status(404).json({ error: "Lawyer not found" });
    res.json(lawyer);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch lawyer" });
  }
});

export default router;
