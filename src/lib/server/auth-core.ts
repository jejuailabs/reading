import { AUTH_SESSION_SECONDS, AuthError, authUserFromClaims, requireRecentGoogleSignIn, type AuthSession, type VerifiedAuthClaims } from "../auth-policy.ts";

export type SessionAuthAdapter = {
  verifyIdToken(token: string, checkRevoked: boolean): Promise<VerifiedAuthClaims>;
  createSessionCookie(token: string, options: { expiresIn: number }): Promise<string>;
  verifySessionCookie(cookie: string, checkRevoked: boolean): Promise<VerifiedAuthClaims>;
};

export async function createLoginSession(idToken: unknown, auth: SessionAuthAdapter, now = Date.now()): Promise<{ cookie: string; session: AuthSession }> {
  if (typeof idToken !== "string" || idToken.length < 100 || idToken.length > 14 * 1024 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(idToken)) {
    throw new AuthError(400, "AUTH_INPUT_INVALID");
  }
  const claims = await auth.verifyIdToken(idToken, true);
  const user = requireRecentGoogleSignIn(claims, now);
  const cookie = await auth.createSessionCookie(idToken, { expiresIn: AUTH_SESSION_SECONDS * 1000 });
  return { cookie, session: { user, expiresAt: now + AUTH_SESSION_SECONDS * 1000 } };
}

export async function readLoginSession(cookie: string | undefined, auth: SessionAuthAdapter, now = Date.now()): Promise<AuthSession | null> {
  if (!cookie || cookie.length > 14 * 1024) return null;
  try {
    const claims = await auth.verifySessionCookie(cookie, true);
    if (typeof claims.exp !== "number" || !Number.isFinite(claims.exp) || claims.exp * 1000 <= now) return null;
    return { user: authUserFromClaims(claims), expiresAt: claims.exp * 1000 };
  } catch { return null; }
}
