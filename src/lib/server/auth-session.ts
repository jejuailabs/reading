import "server-only";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE, type AuthSession } from "../auth-policy";
import { readLoginSession } from "./auth-core";
import { getReadingAdminAuth, isReadingAuthConfigured } from "./firebase-admin";

export async function getAuthSession(): Promise<AuthSession | null> {
  if (!isReadingAuthConfigured()) return null;
  const cookie = (await cookies()).get(AUTH_SESSION_COOKIE)?.value;
  if (!cookie) return null;
  return readLoginSession(cookie, getReadingAdminAuth());
}

export const authCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL),
  sameSite: "lax" as const,
  path: "/",
  priority: "high" as const,
});
