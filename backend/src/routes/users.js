import express from "express";
import { createUser, getUser } from "../services/users.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { userId, email, role, name, phone } = req.body;

  if (!userId || !email || !role) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const user = await createUser(userId, {
    email,
    role,
    name,
    phone
  });

  res.json(user);
});

router.get("/:id", async (req, res) => {
  const user = await getUser(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

export default router;
