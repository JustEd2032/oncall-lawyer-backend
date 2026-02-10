import { db } from "./firestore.js";

export async function createUser(userId, data) {
  const userRef = db.collection("users").doc(userId);

  await userRef.set({
    ...data,
    createdAt: new Date()
  });

  return { id: userId };
}

export async function getUser(userId) {
  const doc = await db.collection("users").doc(userId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}
