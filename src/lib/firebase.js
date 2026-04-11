/**
 * Firebase client initialisation.
 *
 * Reads configuration exclusively from environment variables (never hardcoded).
 * Guards against duplicate initialisation that can occur during Vite HMR in development.
 *
 * Offline strategy: when Firebase is unavailable, liveReports.js falls back
 * to localStorage + BroadcastChannel automatically — no extra configuration needed.
 */
import { getApp, initializeApp } from "firebase/app";

import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const REQUIRED_KEYS = ["apiKey", "authDomain", "projectId", "appId"];

export const isFirebaseConfigured = REQUIRED_KEYS.every((key) => {
  const value = firebaseConfig[key];
  return typeof value === "string" && value.trim().length > 0;
});

let firebaseApp = null;
let firestoreDb = null;

if (isFirebaseConfigured) {
  try {
    // initializeApp throws if an app with the same name already exists.
    // This can happen during Vite HMR — retrieve the existing instance instead.
    firebaseApp = initializeApp(firebaseConfig);
  } catch {
    firebaseApp = getApp();
  }
  firestoreDb = getFirestore(firebaseApp);
}

export const db = firestoreDb;

export const realtimeCollections = {
  reports: import.meta.env.VITE_FIREBASE_REPORTS_COLLECTION || "crowdsenseReports",
};
