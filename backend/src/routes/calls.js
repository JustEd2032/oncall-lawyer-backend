import express from "express";
import { authenticate } from "../middleware/auth.js";
import { db } from "../services/firestore.js";

const router = express.Router();
const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_BASE_URL = "https://api.daily.co/v1";

// Helper to call Daily.co API
async function dailyFetch(path, method = "GET", body = null) {
  const res = await fetch(`${DAILY_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Daily.co error: ${err}`);
  }
  return res.json();
}

// POST /calls/create-room
// Creates a Daily.co room for an appointment and saves the URL to Firestore
router.post("/create-room", authenticate, async (req, res) => {
  const { appointmentId } = req.body;

  if (!appointmentId) {
    return res.status(400).json({ error: "appointmentId is required" });
  }

  // Fetch appointment
  const doc = await db.collection("appointments").doc(appointmentId).get();
  if (!doc.exists) {
    return res.status(404).json({ error: "Appointment not found" });
  }

  const appointment = doc.data();

  // Only client or lawyer of this appointment can create the room
  if (appointment.clientId !== req.user.uid && appointment.lawyerId !== req.user.uid) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // If room already exists, return it
  if (appointment.roomUrl) {
    return res.json({ roomUrl: appointment.roomUrl });
  }

  // Create Daily.co room — expires 2 hours after scheduled time
  const scheduledAt = appointment.scheduledAt?.toDate
    ? appointment.scheduledAt.toDate()
    : new Date(appointment.scheduledAt);

  const expiry = Math.floor(scheduledAt.getTime() / 1000) + 60 * 60 * 2; // +2 hours

  const room = await dailyFetch("/rooms", "POST", {
    name: `oncall-${appointmentId}`,
    properties: {
      exp: expiry,
      enable_chat: true,
      enable_screenshare: true,
      start_video_off: false,
      start_audio_off: false,
    },
  });

  // Save roomUrl to Firestore so lawyer gets notified
  await db.collection("appointments").doc(appointmentId).update({
    roomUrl: room.url,
    roomName: room.name,
    callStatus: "ready",
  });

  res.json({ roomUrl: room.url });
});

// POST /calls/token
// Generates a Daily.co meeting token for the user
router.post("/token", authenticate, async (req, res) => {
  const { roomName, isOwner } = req.body;

  if (!roomName) {
    return res.status(400).json({ error: "roomName is required" });
  }

  const token = await dailyFetch("/meeting-tokens", "POST", {
    properties: {
      room_name: roomName,
      is_owner: isOwner === true,
      user_name: req.user.email,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 2, // 2 hours
    },
  });

  res.json({ token: token.token });
});

export default router;
