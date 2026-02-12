import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAGIU2h7y1vKUox1PimdksubKkg9OQK28w",
  authDomain: "oncall-lawyer-api-dev.firebaseapp.com",
  projectId: "oncall-lawyer-api-dev",
  storageBucket: "oncall-lawyer-api-dev.firebasestorage.app",
  messagingSenderId: "610204915442",
  appId: "1:610204915442:web:f2640a2bc8c35b66d9a26b",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
