// Public web configuration only. Never import admin credentials into a client module.
// No SDK initialization, Analytics, network access or billing is enabled by this file.
export const firebaseWebConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function requireLocalPrototype() {
  if (process.env.NEXT_PUBLIC_DATA_MODE && process.env.NEXT_PUBLIC_DATA_MODE !== "local") {
    throw new Error("Firebase connection is not implemented or approved. Keep NEXT_PUBLIC_DATA_MODE=local.");
  }
}
