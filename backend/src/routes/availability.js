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

function toMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

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

// POST /availability
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
      days, appointmentDuration: duration, blockedDates: blocked, updatedAt: new Date()
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Save availability error:", err);
    res.status(500).json({ error: "Failed to save availability" });
  }
});

// GET /availability/:lawyerId/slots?date=YYYY-MM-DD&isToday=true&nowMinutes=258
// nowMinutes = client's current hour*60+minute in LOCAL time (e.g. 4:18pm = 258)
router.get("/:lawyerId/slots", async (req, res) => {
  try {
    const { date, isToday, nowMinutes: nowMinutesStr } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "date required (YYYY-MM-DD)" });
    }

    const doc = await db.collection("availability").doc(req.params.lawyerId).get();
    const avail = doc.exists ? doc.data() : DEFAULT_AVAILABILITY;

    if ((avail.blockedDates || []).includes(date)) {
      return res.json({ slots: [], blocked: true, appointmentDuration: avail.appointmentDuration });
    }

    const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    const dayKey = dayNames[new Date(date + "T12:00:00").getDay()];
    const dayConfig = avail.days?.[dayKey];

    if (!dayConfig?.enabled || !Array.isArray(dayConfig.blocks) || dayConfig.blocks.length === 0) {
      return res.json({ slots: [], blocked: false, appointmentDuration: avail.appointmentDuration });
    }

    const duration = avail.appointmentDuration || 60;

    const lawyerBlockedRanges = (dayConfig.blockedRanges || []).map(r => ({
      start: toMinutes(r.start), end: toMinutes(r.end)
    }));

    // Fetch existing bookings
    const startOfDay = new Date(date + "T00:00:00");
    const endOfDay = new Date(date + "T23:59:59");
    const apptSnapshot = await db.collection("appointments")
      .where("lawyerId", "==", req.params.lawyerId)
      .where("scheduledAt", ">=", startOfDay)
      .where("scheduledAt", "<=", endOfDay)
      .get();

    const bookedRanges = apptSnapshot.docs
      .filter(d => !["cancelled"].includes(d.data().status))
      .map(d => {
        const t = d.data().scheduledAt;
        const dt = t?.toDate ? t.toDate() : new Date(t._seconds * 1000);
        const startMin = dt.getHours() * 60 + dt.getMinutes();
        return { start: startMin, end: startMin + duration };
      });

    // Client tells us exactly what "now" is in their local time
    // isToday=true means the requested date is today in the client's timezone
    // nowMinutes = client's current local hour*60+minute (e.g. 4:18pm = 258)
    const clientIsToday = isToday === "true";
    const nowMinutes = clientIsToday ? (parseInt(nowMinutesStr) || 0) : 0;

    // Generate 5-min ticks
    const slots = [];
    for (const block of dayConfig.blocks) {
      const blockStart = toMinutes(block.start);
      const blockEnd = toMinutes(block.end);

      for (let tick = blockStart; tick + duration <= blockEnd; tick += 5) {
        const slotEnd = tick + duration;

        // Skip slots that have already started today
        if (clientIsToday && tick < nowMinutes) continue;

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
