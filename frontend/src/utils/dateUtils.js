/**
 * Converts any Firestore timestamp format to a JS Date.
 * Handles: Firestore Timestamp object, {_seconds, _nanoseconds}, ISO string, JS Date
 */
export function toDate(val) {
  if (!val) return null;
  if (val?.toDate) return val.toDate();                          // Firestore Timestamp SDK
  if (val?._seconds !== undefined) return new Date(val._seconds * 1000); // REST API format
  if (val?.seconds !== undefined) return new Date(val.seconds * 1000);   // alternate REST format
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(val) {
  const date = toDate(val);
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

export function isCallTime(val, now = new Date()) {
  const date = toDate(val);
  if (!date) return false;
  const minutesUntil = (date - now) / 1000 / 60;
  return minutesUntil <= 5 && minutesUntil > -60;
}

export function getTimeUntil(val, now = new Date()) {
  const date = toDate(val);
  if (!date) return null;
  const minutesUntil = Math.ceil((date - now) / 1000 / 60);
  if (minutesUntil <= 0) return "Starting now";
  if (minutesUntil === 1) return "Starting in 1 minute";
  return `Starting in ${minutesUntil} minutes`;
}
