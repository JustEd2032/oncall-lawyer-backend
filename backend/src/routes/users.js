import express from "express";
import { createUser, getUser } from "../services/users.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/", authenticate, async (req, res) => {
  const userId = req.user.uid;
  const email = req.user.email;
  const { role, name, phone } = req.body;

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

router.get("/:id", authenticate, async (req, res) => {

  if (req.user.uid !== req.params.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const user = await getUser(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

export default router;
