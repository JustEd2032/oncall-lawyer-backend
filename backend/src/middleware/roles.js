import { db } from "../services/firestore.js";

export function requireRole(role) {
  return async (req, res, next) => {
    const uid = req.user.uid;

    const doc = await db.collection("users").doc(uid).get();

    if (!doc.exists) {
      return res.status(403).json({ error: "User not found" });
    }

    if (doc.data().role !== role) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
}
