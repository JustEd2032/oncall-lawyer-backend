import express from "express";
import { createUser, getUser } from "../services/users.js";
import { authenticate } from "../middleware/auth.js";
import admin from "firebase-admin";

const router = express.Router();

router.post("/", authenticate, async (req, res) => {
  const userId = req.user.uid;
  const email = req.user.email;

  const existingUser = await getUser(userId);

  // ✅ If user already exists, just return it
  if (existingUser) {
    return res.json(existingUser);
  }

  // ✅ Create new user with default role
  const newUser = await createUser(userId, {
    email,
    role: "client", // default role
    createdAt: new Date()
  });

  // ✅ Set Firebase custom claim
  await admin.auth().setCustomUserClaims(userId, {
    role: "client"
  });

  res.json(newUser);
});

router.get("/:id", authenticate, async (req, res) => {

  if (req.user.uid !== req.params.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const user = await getUser(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

export default router;
