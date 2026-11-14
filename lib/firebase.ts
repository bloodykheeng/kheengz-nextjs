import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

// Firebase web app. Development reads project kheengz-dev from .env.development, production
// kheengz-6f97b from .env.production (the API's FIREBASE_* service account is the same project).
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// One app per page load: hot reload and repeated imports reuse the existing instance.
const firebaseApp: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export default firebaseApp;

/**
 * Starts Google Analytics in the browser only, where it is supported (never during server rendering,
 * and not in browsers that block it). Call from a client component once the page has loaded.
 */
export async function startAnalytics(): Promise<void> {
  if (typeof window === "undefined") return;
  const { getAnalytics, isSupported } = await import("firebase/analytics");
  if (await isSupported()) getAnalytics(firebaseApp);
}
