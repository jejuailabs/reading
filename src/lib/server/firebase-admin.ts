import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { AuthError } from "../auth-policy";

const ADMIN_APP_NAME = "onbook-reading-auth";

export function isReadingAuthConfigured(): boolean {
  const env = process.env;
  if ((env.NODE_ENV === "production" || env.VERCEL) && env.FIREBASE_AUTH_EMULATOR_HOST) return false;
  return env.READING_AUTH_ENABLED === "true" && Boolean(env.FIREBASE_ADMIN_PROJECT_ID && env.FIREBASE_ADMIN_CLIENT_EMAIL && env.FIREBASE_ADMIN_PRIVATE_KEY && env.READING_ALLOWED_FIREBASE_PROJECT_ID) &&
    env.FIREBASE_ADMIN_PROJECT_ID === env.READING_ALLOWED_FIREBASE_PROJECT_ID &&
    env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === env.READING_ALLOWED_FIREBASE_PROJECT_ID;
}

export function getReadingAdminAuth() {
  if (!isReadingAuthConfigured()) throw new AuthError(503, "AUTH_NOT_CONFIGURED");
  // A named app isolates reading from any other Firebase app in this process.
  const existing = getApps().find(app => app.name === ADMIN_APP_NAME);
  if (existing && existing.options.projectId !== process.env.READING_ALLOWED_FIREBASE_PROJECT_ID) throw new AuthError(503, "AUTH_NOT_CONFIGURED");
  const app = existing ?? initializeApp({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  }, ADMIN_APP_NAME);
  return getAuth(app);
}
