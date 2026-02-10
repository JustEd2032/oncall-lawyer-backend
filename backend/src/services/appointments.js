import { db } from "./firestore.js";

export async function createAppointment(data) {
  const ref = db.collection("appointments").doc();

  await ref.set({
    ...data,
    status: "pending",
    createdAt: new Date()
  });

  return { id: ref.id };
}

export async function updateAppointmentStatus(id, status) {
  await db.collection("appointments").doc(id).update({ status });
}

export async function getAppointmentsByUser(userId) {
  const snapshot = await db
    .collection("appointments")
    .where("clientId", "==", userId)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
