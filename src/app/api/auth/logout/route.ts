import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AuthError, assertAuthMutation, authAllowedOrigins } from "@/lib/auth-policy";
import { authCookieOptions } from "@/lib/server/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertAuthMutation(request, authAllowedOrigins(process.env));
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, private" } });
    response.cookies.set(AUTH_SESSION_COOKIE, "", { ...authCookieOptions(), maxAge: 0, expires: new Date(0) });
    // Do not revoke shared Firebase account tokens: that would log the user out of unrelated projects.
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof AuthError ? error.code : "AUTH_SIGN_OUT_FAILED" }, { status: error instanceof AuthError ? error.status : 400, headers: { "Cache-Control": "no-store" } });
  }
}
