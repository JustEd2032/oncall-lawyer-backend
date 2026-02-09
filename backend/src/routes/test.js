import express from "express";
import { db } from "../services/firestore.js";

const router = express.Router();

router.get("/firestore", async (req, res) => {
  await db.collection("test").add({
    message: "Firestore connected",
    createdAt: Date.now(),
  });

  res.send("Firestore write successful");
});

export default router;
