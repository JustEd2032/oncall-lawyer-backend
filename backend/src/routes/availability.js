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
  return `${String(Math.floor(minutes/60)).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}`;
}

function overlaps(s1, e1, s2, e2) {
  return s1 < e2 && e1 > s2;
}

// GET /availability/:lawyerId
router.get("/:lawyerId", async (req, res) => {
  try {
    const doc = await db.collection("availability").doc(req.params.lawyerId).get();
    res.json(doc.exists ? doc.data() : DEFAULT_AVAILABILITY);
  } catch (err) {
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
    res.status(500).json({ error: "Failed to save availability" });
  }
});

// GET /availability/:lawyerId/slots?date=YYYY-MM-DD&isToday=true&nowMinutes=N&tzOffset=N
// tzOffset = client's UTC offset in minutes. UTC-6 = -360, UTC+5:30 = 330
router.get("/:lawyerId/slots", async (req, res) => {
  try {
    const { date, isToday, nowMinutes: nowMinutesStr, tzOffset: tzOffsetStr } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "date required (YYYY-MM-DD)" });
    }

    // tzOffset: client sends -new Date().getTimezoneOffset()
    // UTC-6 → getTimezoneOffset()=360 → tzOffset=-360
    const tzOffset = parseInt(tzOffsetStr) || 0;

    const doc = await db.collection("availability").doc(req.params.lawyerId).get();
    const avail = doc.exists ? doc.data() : DEFAULT_AVAILABILITY;

    if ((avail.blockedDates || []).includes(date)) {
      return res.json({ slots: [], blocked: true, appointmentDuration: avail.appointmentDuration });
    }

    const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    const dayKey = dayNames[new Date(date + "T12:00:00Z").getDay()];
    const dayConfig = avail.days?.[dayKey];

    if (!dayConfig?.enabled || !Array.isArray(dayConfig.blocks) || dayConfig.blocks.length === 0) {
      return res.json({ slots: [], blocked: false, appointmentDuration: avail.appointmentDuration });
    }

    const duration = avail.appointmentDuration || 60;

    const lawyerBlockedRanges = (dayConfig.blockedRanges || []).map(r => ({
      start: toMinutes(r.start), end: toMinutes(r.end)
    }));

    // ── Day boundaries in UTC ──
    // Client's midnight on `date` in UTC = date midnight UTC minus tzOffset minutes
    // e.g. UTC-6 (tzOffset=-360): local midnight = UTC 06:00
    //   startOfDay UTC = Date.UTC(y,m,d,0,0,0) - (-360)*60000 = Date.UTC(y,m,d,0,0,0) + 360*60000
    //   = Date.UTC(y,m,d,6,0,0) ✓
    const [y, mo, d] = date.split("-").map(Number);
    const localMidnightUTC = Date.UTC(y, mo - 1, d, 0, 0, 0) - tzOffset * 60 * 1000;
    const startOfDay = new Date(localMidnightUTC);
    const endOfDay   = new Date(localMidnightUTC + 24 * 60 * 60 * 1000 - 1);

    const apptSnapshot = await db.collection("appointments")
      .where("lawyerId", "==", req.params.lawyerId)
      .where("scheduledAt", ">=", startOfDay)
      .where("scheduledAt", "<=", endOfDay)
      .get();

    const bookedRanges = apptSnapshot.docs
      .filter(d => !["cancelled"].includes(d.data().status))
      .map(d => {
        const t = d.data().scheduledAt;
        const utcMs = t?.toDate ? t.toDate().getTime() : new Date(t._seconds * 1000).getTime();
        // Convert UTC timestamp to client local minutes-since-midnight
        const localMs = utcMs + tzOffset * 60 * 1000;
        const localDate = new Date(localMs);
        const startMin = localDate.getUTCHours() * 60 + localDate.getUTCMinutes();
        return { start: startMin, end: startMin + duration };
      });

    // ── Today filtering ──
    const clientIsToday = isToday === "true";
    const nowMinutes = clientIsToday ? (parseInt(nowMinutesStr) || 0) : 0;

    // ── Generate 5-min ticks ──
    const slots = [];
    for (const block of dayConfig.blocks) {
      const blockStart = toMinutes(block.start);
      const blockEnd   = toMinutes(block.end);

      for (let tick = blockStart; tick + duration <= blockEnd; tick += 5) {
        const slotEnd = tick + duration;
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
