import { db } from "./firestore.js";

export async function createLawyerProfile(lawyerId, data) {
  await db.collection("lawyers").doc(lawyerId).set({
    ...data,
    available: true
  });

  return { id: lawyerId };
}

export async function getLawyerById(lawyerId) {
  const doc = await db.collection("lawyers").doc(lawyerId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function listAvailableLawyers() {
  const snapshot = await db
    .collection("lawyers")
    .where("available", "==", true)
    .limit(50)   // paginate via startAfter() in a future iteration
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

