import express from "express";
import { authenticate } from "../middleware/auth.js";
import { db } from "../services/firestore.js";

const router = express.Router();

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

const DEFAULT_AVAILABILITY = {
  days: Object.fromEntries(DAYS.map(day => [day, {
    enabled: ["monday","tuesday","wednesday","thursday","friday"].includes(day),
    blocks: [{ start: "09:00", end: "17:00" }],
    blockedRanges: []
  }])),
  appointmentDuration: 60,
  blockedDates: []
};

// Convert "HH:MM" to total minutes
function toMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Convert minutes to "HH:MM"
function toTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

// Check if a slot [start, start+duration] overlaps with a range [rangeStart, rangeEnd]
function overlaps(slotStart, slotEnd, rangeStart, rangeEnd) {
  return slotStart < rangeEnd && slotEnd > rangeStart;
}

// GET /availability/:lawyerId
router.get("/:lawyerId", async (req, res) => {
  try {
    const doc = await db.collection("availability").doc(req.params.lawyerId).get();
    res.json(doc.exists ? doc.data() : DEFAULT_AVAILABILITY);
  } catch (err) {
    console.error("Get availability error:", err);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
});

// POST /availability — save lawyer's schedule
router.post("/", authenticate, async (req, res) => {
  try {
    const { days, appointmentDuration, blockedDates } = req.body;

    const duration = parseInt(appointmentDuration);
    if (isNaN(duration) || duration < 5 || duration > 480) {
      return res.status(400).json({ error: "Duration must be 5–480 minutes" });
    }

    const blocked = Array.isArray(blockedDates)
      ? blockedDates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
      : [];

    await db.collection("availability").doc(req.user.uid).set({
      days,
      appointmentDuration: duration,
      blockedDates: blocked,
      updatedAt: new Date()
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Save availability error:", err);
    res.status(500).json({ error: "Failed to save availability" });
  }
});

// GET /availability/:lawyerId/slots?date=YYYY-MM-DD
// Returns all 5-min ticks with available flag
router.get("/:lawyerId/slots", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "date required (YYYY-MM-DD)" });
    }

    const doc = await db.collection("availability").doc(req.params.lawyerId).get();
    const avail = doc.exists ? doc.data() : DEFAULT_AVAILABILITY;

    // Check blocked date
    if ((avail.blockedDates || []).includes(date)) {
      return res.json({ slots: [], blocked: true, appointmentDuration: avail.appointmentDuration });
    }

    // Get day schedule
    const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    const dayKey = dayNames[new Date(date + "T12:00:00").getDay()];
    const dayConfig = avail.days?.[dayKey];

    if (!dayConfig?.enabled || !Array.isArray(dayConfig.blocks) || dayConfig.blocks.length === 0) {
      return res.json({ slots: [], blocked: false, appointmentDuration: avail.appointmentDuration });
    }

    const duration = avail.appointmentDuration || 60;

    // Collect all blocked ranges for the day (lawyer-defined)
    const lawyerBlockedRanges = (dayConfig.blockedRanges || []).map(r => ({
      start: toMinutes(r.start),
      end: toMinutes(r.end)
    }));

    // Fetch existing bookings for this lawyer on this date
    const startOfDay = new Date(date + "T00:00:00");
    const endOfDay = new Date(date + "T23:59:59");

    const apptSnapshot = await db.collection("appointments")
      .where("lawyerId", "==", req.params.lawyerId)
      .where("scheduledAt", ">=", startOfDay)
      .where("scheduledAt", "<=", endOfDay)
      .get();

    // Build booked ranges from existing appointments
    const bookedRanges = apptSnapshot.docs
      .filter(d => !["cancelled"].includes(d.data().status))
      .map(d => {
        const t = d.data().scheduledAt;
        const dt = t?.toDate ? t.toDate() : new Date(t._seconds * 1000);
        const startMin = dt.getHours() * 60 + dt.getMinutes();
        return { start: startMin, end: startMin + duration };
      });

    // Current time in minutes (for same-day filtering)
    const now = new Date();
    const isToday = date === now.toISOString().slice(0, 10);
    const nowMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : 0;

    // Generate 5-min ticks across all working blocks
    const slots = [];

    for (const block of dayConfig.blocks) {
      const blockStart = toMinutes(block.start);
      const blockEnd = toMinutes(block.end);

      for (let tick = blockStart; tick + duration <= blockEnd; tick += 5) {
        const slotEnd = tick + duration;

        // Skip past slots for today
        if (isToday && tick < nowMinutes) continue;

        // Check if this slot overlaps any blocked range or existing booking
        const isBlockedByLawyer = lawyerBlockedRanges.some(r => overlaps(tick, slotEnd, r.start, r.end));
        const isBooked = bookedRanges.some(r => overlaps(tick, slotEnd, r.start, r.end));

        slots.push({
          time: toTime(tick),
          available: !isBlockedByLawyer && !isBooked,
          reason: isBooked ? "booked" : isBlockedByLawyer ? "blocked" : null
        });
      }
    }

    res.json({ slots, blocked: false, appointmentDuration: duration });
  } catch (err) {
    console.error("Get slots error:", err);
    res.status(500).json({ error: "Failed to fetch slots" });
  }
});

export default router;
