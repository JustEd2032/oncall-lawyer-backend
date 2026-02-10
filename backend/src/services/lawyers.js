import { db } from "./firestore.js";

export async function createLawyerProfile(lawyerId, data) {
  await db.collection("lawyers").doc(lawyerId).set({
    ...data,
    available: true
  });

  return { id: lawyerId };
}

export async function listAvailableLawyers() {
  const snapshot = await db
    .collection("lawyers")
    .where("available", "==", true)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
