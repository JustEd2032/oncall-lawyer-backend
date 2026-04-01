import { useEffect, useState, useCallback } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { toDate } from "../utils/dateUtils";

const NOTIFY_MINUTES_BEFORE = 5;

export function useCallNotification(userId) {
  const [notification, setNotification] = useState(null);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    requestPermission();

    const checkAndNotify = (appointments) => {
      const now = new Date();

      // If no pending appointments in window — clear any existing notification
      const eligible = appointments.filter(appt => {
        if (appt.status !== "pending") return false;
        const scheduledAt = toDate(appt.scheduledAt);
        if (!scheduledAt) return false;
        const minutesUntil = (scheduledAt - now) / 1000 / 60;
        return minutesUntil <= NOTIFY_MINUTES_BEFORE && minutesUntil > -60;
      });

      if (eligible.length === 0) {
        // No pending appointments coming up — clear notification
        setNotification(null);
        return;
      }

      // Show notification for first eligible appointment
      const appt = eligible[0];
      const scheduledAt = toDate(appt.scheduledAt);
      const minutesUntil = (scheduledAt - now) / 1000 / 60;

      const message = minutesUntil > 0
        ? `Your call starts in ${Math.ceil(minutesUntil)} minute(s)`
        : "Your call is starting now";

      setNotification({
        appointmentId: appt.id,
        roomUrl: appt.roomUrl || null,
        message,
      });

      if (Notification.permission === "granted") {
        new Notification("OnCallLawyer — Call Starting", {
          body: message,
          icon: "/vite.svg",
        });
      }
    };

    // Only listen to pending appointments
    const clientQuery = query(
      collection(db, "appointments"),
      where("clientId", "==", userId),
      where("status", "==", "pending")
    );

    const lawyerQuery = query(
      collection(db, "appointments"),
      where("lawyerId", "==", userId),
      where("status", "==", "pending")
    );

    const unsubClient = onSnapshot(clientQuery, (snapshot) => {
      const appts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      checkAndNotify(appts);
    });

    const unsubLawyer = onSnapshot(lawyerQuery, (snapshot) => {
      const appts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      checkAndNotify(appts);
    });

    return () => {
      unsubClient();
      unsubLawyer();
    };
  }, [userId, requestPermission]);

  const dismissNotification = () => setNotification(null);

  return { notification, dismissNotification };
}
