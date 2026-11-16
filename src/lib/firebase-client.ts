"use client";

import { getApps, initializeApp } from "firebase/app";
import { browserPopupRedirectResolver, getAuth, initializeAuth, inMemoryPersistence, type Auth } from "firebase/auth";
import { firebaseWebConfig } from "./firebase-config";
import { AuthError } from "./auth-policy";

let readingAuth: Auth | null = null;

/** Auth is initialized only after an explicit Google-login click. No analytics or database connection. */
export function getReadingFirebaseAuth(): Auth {
  if (readingAuth) return readingAuth;
  if (!firebaseWebConfig.apiKey || !firebaseWebConfig.authDomain || !firebaseWebConfig.projectId || !firebaseWebConfig.appId) {
    throw new AuthError(503, "AUTH_NOT_CONFIGURED");
  }
  const existingApp = getApps().find(item => item.name === "onbook-reading-client");
  const app = existingApp ?? initializeApp(firebaseWebConfig, "onbook-reading-client");
  readingAuth = existingApp ? getAuth(app) : initializeAuth(app, { persistence: inMemoryPersistence, popupRedirectResolver: browserPopupRedirectResolver });
  readingAuth.languageCode = "ko";
  return readingAuth;
}

export function existingReadingFirebaseAuth(): Auth | null { return readingAuth; }
