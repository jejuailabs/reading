// Run after `npm run build`. All requests go to a temporary loopback server;
// synthetic credentials and malformed tokens never authenticate a real account.
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { parseEnv } from "node:util";

const port = 3117;
const origin = "https://reading-runtime.invalid";
const localEnv = existsSync(".env.local") ? parseEnv(readFileSync(".env.local", "utf8")) : {};
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? localEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
assert.ok(projectId, "Build-time Firebase project configuration is required");
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const env = { ...process.env, NODE_ENV: "production", READING_AUTH_ENABLED: "true", READING_APP_ORIGIN: origin,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId, READING_ALLOWED_FIREBASE_PROJECT_ID: projectId,
  FIREBASE_ADMIN_PROJECT_ID: projectId, FIREBASE_ADMIN_CLIENT_EMAIL: `offline-runtime-check@${projectId}.iam.gserviceaccount.com`, FIREBASE_ADMIN_PRIVATE_KEY: privateKey };
delete env.FIREBASE_AUTH_EMULATOR_HOST;
delete env.VERCEL;
delete env.VERCEL_URL;
delete env.VERCEL_PROJECT_PRODUCTION_URL;
const server = spawn(process.execPath, ["--no-experimental-require-module", path.resolve("node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
let serverOutput = "";
server.stdout.on("data", chunk => { serverOutput += chunk; });
server.stderr.on("data", chunk => { serverOutput += chunk; });
function request(route, { method = "GET", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: "127.0.0.1", port, path: route, method, headers: { host: new URL(origin).host, ...headers }, timeout: 15000 }, response => {
      let text = "";
      response.setEncoding("utf8");
      response.on("data", chunk => { text += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, text }));
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("Loopback request timed out")));
    if (body) req.write(body);
    req.end();
  });
}
try {
  await new Promise((resolve, reject) => {
    const deadline = setTimeout(() => { clearInterval(poll); reject(new Error("Production server did not start")); }, 30000);
    const poll = setInterval(() => {
      if (server.exitCode !== null) { clearTimeout(deadline); clearInterval(poll); reject(new Error("Production server exited")); }
      else if (serverOutput.includes("Ready in")) { clearTimeout(deadline); clearInterval(poll); resolve(); }
    }, 100);
  });
  for (const route of ["/", "/demo", "/demo/library", "/login"]) {
    const result = await request(route);
    assert.equal(result.status, 200, `${route} must render without native require(esm)`);
    console.log(`PASS ${route}: 200`);
  }
  const session = await request("/api/auth/session");
  assert.equal(session.status, 200);
  assert.deepEqual(JSON.parse(session.text), { session: null, enabled: true });
  assert.match(session.headers["cache-control"], /no-store/);
  console.log("PASS configured auth session: anonymous, enabled, no-store");
  const protectedPage = await request("/app");
  assert.equal(protectedPage.status, 307);
  assert.equal(protectedPage.headers.location, "/login?next=%2Fapp");
  console.log("PASS protected account page: login redirect");
  const headers = { origin, "content-type": "application/json", "x-reading-auth": "1", "sec-fetch-site": "same-origin" };
  const malformed = await request("/api/auth/session", { method: "POST", headers, body: JSON.stringify({ idToken: "invalid" }) });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.headers["set-cookie"], undefined);
  console.log("PASS Admin SDK initialization and malformed-token rejection: 400, no cookie");
  const crossOrigin = await request("/api/auth/session", { method: "POST", headers: { ...headers, origin: "https://untrusted.invalid" }, body: "{}" });
  assert.equal(crossOrigin.status, 403);
  assert.equal(crossOrigin.headers["set-cookie"], undefined);
  console.log("PASS cross-origin rejection: 403, no cookie");
  const logout = await request("/api/auth/logout", { method: "POST", headers, body: "{}" });
  assert.equal(logout.status, 200);
  assert.ok(logout.headers["set-cookie"]?.some(cookie => /reading_session=;/.test(cookie) && /Max-Age=0/.test(cookie) && /HttpOnly/.test(cookie) && /Secure/.test(cookie)));
  console.log("PASS logout: secure HttpOnly cookie removed");
  assert.doesNotMatch(serverOutput, /ERR_REQUIRE_ESM|Failed to load external module/);
  console.log("PASS production auth runtime with synchronous ESM loading disabled (9 checks)");
} finally {
  server.kill();
}
