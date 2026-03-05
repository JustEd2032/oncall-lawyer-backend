import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp(); // ADC works automatically on Cloud Run
}

export const db = admin.firestore();
