import assert from "node:assert/strict";
import test from "node:test";
import { AuthError, AUTH_MAX_BODY_BYTES, assertAuthMutation, authAllowedOrigins, authUserFromClaims, canAccessReadingRoute, readingRole, readAuthBody, requireRecentGoogleSignIn, safeAuthNext, type VerifiedAuthClaims } from "../src/lib/auth-policy.ts";
import { createLoginSession, readLoginSession, type SessionAuthAdapter } from "../src/lib/server/auth-core.ts";

const now = Date.UTC(2026, 10, 16, 10);
const googleClaims = (extra: VerifiedAuthClaims = {}): VerifiedAuthClaims => ({ uid: "reading-user", email: "reader@example.test", email_verified: true, name: "독서 친구", firebase: { sign_in_provider: "google.com" }, auth_time: Math.floor(now / 1000), exp: Math.floor(now / 1000) + 3600, ...extra });
const validToken = `${"a".repeat(40)}.${"b".repeat(40)}.${"c".repeat(40)}`;

test("reading grants roles only from its verified namespaced claim", () => {
  assert.equal(readingRole({ role: "admin", admin: true, homework_role: "admin" }), "member");
  assert.equal(readingRole({ reading_role: "admin" }), "admin");
  assert.equal(readingRole({ reading_role: "teacher" }), "teacher");
  assert.equal(readingRole({ reading_role: ["admin"] }), "member");
  assert.equal(canAccessReadingRoute("teacher", "admin"), false);
  assert.equal(canAccessReadingRoute("member", "teach"), false);
  assert.equal(canAccessReadingRoute("student", "library"), true);
  assert.equal(canAccessReadingRoute("admin", "admin"), true);
});

test("login destinations reject external, traversal and encoded escape paths", () => {
  for (const value of ["https://evil.test", "//evil.test", "/app/../../admin", "/app/%2e%2e/admin", "/app/%2f%2fevil.test", "/app/\\evil", "/application", " /app", "/app\n", null]) assert.equal(safeAuthNext(value), "/app");
  assert.equal(safeAuthNext("/app/library?filter=korean#books"), "/app/library?filter=korean#books");
  assert.equal(safeAuthNext("/app?from=login"), "/app?from=login");
});

test("only verified Google accounts can exchange a recently authenticated token", () => {
  assert.equal(requireRecentGoogleSignIn(googleClaims(), now).uid, "reading-user");
  for (const patch of [{ email_verified: false }, { firebase: { sign_in_provider: "password" } }, { uid: "" }, { email: "" }]) assert.throws(() => requireRecentGoogleSignIn(googleClaims(patch), now), AuthError);
  for (const auth_time of [Math.floor(now / 1000) - 301, Math.floor(now / 1000) + 61, "today", NaN]) assert.throws(() => requireRecentGoogleSignIn(googleClaims({ auth_time }), now), /AUTH_RECENT_SIGN_IN_REQUIRED/);
});

test("profile serialization strips untrusted data and does not expose token claims", () => {
  const user = authUserFromClaims(googleClaims({ name: "  독서\n친구  ", picture: "javascript:alert(1)", secret_claim: "private" }));
  assert.equal(user.displayName, "독서친구");
  assert.equal(user.photoURL, null);
  assert.deepEqual(Object.keys(user).sort(), ["displayName", "email", "photoURL", "role", "uid"]);
});

test("production auth accepts only configured exact HTTPS origins", () => {
  const origins = authAllowedOrigins({ NODE_ENV: "production", READING_APP_ORIGIN: "https://reading.example", VERCEL_URL: "reading-one.vercel.app" });
  assert.deepEqual([...origins], ["https://reading.example", "https://reading-one.vercel.app"]);
  assert.equal(origins.has("http://localhost:3100"), false);
  assert.equal(authAllowedOrigins({ NODE_ENV: "production", READING_APP_ORIGIN: "https://evil.test/path" }).size, 0);
  assert.equal(authAllowedOrigins({ NODE_ENV: "development" }).has("http://localhost:3100"), true);
});

test("login and logout reject cross-origin, missing-origin and non-JSON requests", () => {
  const allowed = new Set(["https://reading.example"]);
  const make = (overrides: Record<string, string> = {}) => new Request("https://reading.example/api/auth/session", { method: "POST", headers: { origin: "https://reading.example", host: "reading.example", "sec-fetch-site": "same-origin", "x-reading-auth": "1", "content-type": "application/json", ...overrides }, body: "{}" });
  assert.doesNotThrow(() => assertAuthMutation(make(), allowed));
  const rejectedHeaders: Record<string, string>[] = [{ origin: "https://evil.test" }, { origin: "" }, { "sec-fetch-site": "cross-site" }, { host: "evil.test" }, { "x-reading-auth": "" }];
  for (const headers of rejectedHeaders) assert.throws(() => assertAuthMutation(make(headers), allowed), /AUTH_ORIGIN_REJECTED/);
  assert.throws(() => assertAuthMutation(make({ "content-type": "text/plain" }), allowed), /AUTH_JSON_REQUIRED/);
});

test("request parser limits streaming bodies and rejects non-object JSON", async () => {
  const request = (body: string, headers?: HeadersInit) => new Request("https://reading.example", { method: "POST", body, headers });
  assert.deepEqual(await readAuthBody(request('{"idToken":"test"}')), { idToken: "test" });
  await assert.rejects(readAuthBody(request("x".repeat(AUTH_MAX_BODY_BYTES + 1))), /AUTH_BODY_TOO_LARGE/);
  await assert.rejects(readAuthBody(request("{}", { "content-length": String(AUTH_MAX_BODY_BYTES + 1) })), /AUTH_BODY_TOO_LARGE/);
  for (const body of ["[]", "null", '"token"', "{bad"]) await assert.rejects(readAuthBody(request(body)), /AUTH_INPUT_INVALID/);
});

test("session creation checks revocation and uses server role, never user input", async () => {
  const calls: unknown[] = [];
  const auth: SessionAuthAdapter = {
    async verifyIdToken(token, revoked) { calls.push([token, revoked]); return googleClaims({ reading_role: "teacher" }); },
    async createSessionCookie(token, options) { calls.push([token, options]); return "signed-cookie"; },
    async verifySessionCookie() { throw new Error("not called"); },
  };
  const result = await createLoginSession(validToken, auth, now);
  assert.equal(result.session.user.role, "teacher");
  assert.equal(result.session.expiresAt, now + 5 * 24 * 60 * 60 * 1000);
  assert.deepEqual(calls[0], [validToken, true]);
  assert.deepEqual(calls[1], [validToken, { expiresIn: 432000000 }]);
});

test("invalid or old tokens never create a session cookie", async () => {
  let issued = false;
  const auth: SessionAuthAdapter = {
    async verifyIdToken() { return googleClaims({ auth_time: Math.floor(now / 1000) - 1000 }); },
    async createSessionCookie() { issued = true; return "cookie"; },
    async verifySessionCookie() { return googleClaims(); },
  };
  await assert.rejects(createLoginSession("invalid", auth, now), /AUTH_INPUT_INVALID/);
  await assert.rejects(createLoginSession(validToken, auth, now), /AUTH_RECENT_SIGN_IN_REQUIRED/);
  assert.equal(issued, false);
});

test("a revoked or forged ID token never reaches cookie issuance", async () => {
  let issued = false;
  const auth: SessionAuthAdapter = {
    async verifyIdToken(_token, checkRevoked) { assert.equal(checkRevoked, true); throw new Error("invalid signature or revoked"); },
    async createSessionCookie() { issued = true; return "cookie"; },
    async verifySessionCookie() { return googleClaims(); },
  };
  await assert.rejects(createLoginSession(validToken, auth, now));
  assert.equal(issued, false);
});

test("session recovery rejects revoked, expired and non-Google sessions", async () => {
  let claims = googleClaims();
  let revoked = false;
  const auth: SessionAuthAdapter = {
    async verifyIdToken() { return claims; },
    async createSessionCookie() { return "cookie"; },
    async verifySessionCookie(_cookie, checkRevoked) { assert.equal(checkRevoked, true); if (revoked) throw new Error("revoked"); return claims; },
  };
  assert.equal((await readLoginSession("cookie", auth, now))?.user.uid, "reading-user");
  claims = googleClaims({ exp: Math.floor(now / 1000) });
  assert.equal(await readLoginSession("cookie", auth, now), null);
  claims = googleClaims({ firebase: { sign_in_provider: "custom" } });
  assert.equal(await readLoginSession("cookie", auth, now), null);
  revoked = true;
  assert.equal(await readLoginSession("cookie", auth, now), null);
  assert.equal(await readLoginSession(undefined, auth, now), null);
});
