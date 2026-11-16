import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_SESSION_SECONDS, AuthError, assertAuthMutation, authAllowedOrigins, readAuthBody } from "@/lib/auth-policy";
import { createLoginSession } from "@/lib/server/auth-core";
import { authCookieOptions, getAuthSession } from "@/lib/server/auth-session";
import { getReadingAdminAuth, isReadingAuthConfigured } from "@/lib/server/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private", Vary: "Cookie" };

export async function GET() {
  try { return NextResponse.json({ session: await getAuthSession(), enabled: isReadingAuthConfigured() }, { headers }); }
  catch { return NextResponse.json({ session: null, enabled: false, error: "AUTH_UNAVAILABLE" }, { status: 503, headers }); }
}

export async function POST(request: Request) {
  try {
    assertAuthMutation(request, authAllowedOrigins(process.env));
    if (!isReadingAuthConfigured()) throw new AuthError(503, "AUTH_NOT_CONFIGURED");
    const body = await readAuthBody(request);
    if (Object.keys(body).some(key => key !== "idToken")) throw new AuthError(400, "AUTH_INPUT_INVALID");
    const { cookie, session } = await createLoginSession(body.idToken, getReadingAdminAuth());
    const response = NextResponse.json({ session, enabled: true }, { headers });
    response.cookies.set(AUTH_SESSION_COOKIE, cookie, { ...authCookieOptions(), maxAge: AUTH_SESSION_SECONDS });
    return response;
  } catch (error) {
    // Never return SDK messages, provider tokens, project details or credentials.
    const status = error instanceof AuthError ? error.status : 401;
    const code = error instanceof AuthError ? error.code : "AUTH_SIGN_IN_FAILED";
    return NextResponse.json({ error: code }, { status, headers });
  }
}
