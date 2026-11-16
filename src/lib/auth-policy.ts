export type ReadingRole = "member" | "student" | "teacher" | "admin";
export type AuthUser = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: ReadingRole;
};
export type AuthSession = { user: AuthUser; expiresAt: number };
export type VerifiedAuthClaims = Record<string, unknown>;

export const AUTH_SESSION_COOKIE = "reading_session";
export const AUTH_SESSION_SECONDS = 60 * 60 * 24 * 5;
export const AUTH_RECENT_SECONDS = 5 * 60;
export const AUTH_MAX_BODY_BYTES = 16 * 1024;

export class AuthError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) {
    super(code);
    this.name = "AuthError";
    this.status = status;
    this.code = code;
  }
}

/** Only an app-specific, server-verified custom claim can grant a reading role. */
export function readingRole(claims: VerifiedAuthClaims): ReadingRole {
  const role = claims.reading_role;
  return role === "student" || role === "teacher" || role === "admin" ? role : "member";
}

export function safeAuthNext(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048 || /[\\\u0000-\u0020\u007f]/.test(value)) return "/app";
  if (value !== "/app" && !value.startsWith("/app/") && !value.startsWith("/app?") && !value.startsWith("/app#")) return "/app";
  try {
    const url = new URL(value, "https://reading.invalid");
    if (url.origin !== "https://reading.invalid" || (url.pathname !== "/app" && !url.pathname.startsWith("/app/"))) return "/app";
    if (/%2f|%5c|%2e|%00|%0a|%0d/i.test(url.pathname)) return "/app";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return "/app"; }
}

export function canAccessReadingRoute(role: ReadingRole, route: string): boolean {
  if (route === "admin") return role === "admin";
  if (route === "teach") return role === "teacher" || role === "admin";
  return true;
}

export function authUserFromClaims(claims: VerifiedAuthClaims): AuthUser {
  const firebase = claims.firebase as Record<string, unknown> | undefined;
  if (firebase?.sign_in_provider !== "google.com" || claims.email_verified !== true ||
      typeof claims.uid !== "string" || !claims.uid || claims.uid.length > 128 ||
      typeof claims.email !== "string" || !claims.email || claims.email.length > 320) {
    throw new AuthError(401, "AUTH_GOOGLE_REQUIRED");
  }
  let photoURL: string | null = null;
  if (typeof claims.picture === "string") {
    try {
      const url = new URL(claims.picture);
      if (url.protocol === "https:" && (url.hostname === "googleusercontent.com" || url.hostname.endsWith(".googleusercontent.com"))) photoURL = url.href;
    } catch { /* Profile images are optional. */ }
  }
  const displayName = typeof claims.name === "string" ? claims.name.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 120) : "";
  return { uid: claims.uid, email: claims.email, displayName: displayName || "독서 친구", photoURL, role: readingRole(claims) };
}

export function requireRecentGoogleSignIn(claims: VerifiedAuthClaims, now = Date.now()): AuthUser {
  const user = authUserFromClaims(claims);
  const authTime = claims.auth_time;
  const nowSeconds = Math.floor(now / 1000);
  if (typeof authTime !== "number" || !Number.isFinite(authTime) || authTime > nowSeconds + 60 || nowSeconds - authTime > AUTH_RECENT_SECONDS) {
    throw new AuthError(401, "AUTH_RECENT_SIGN_IN_REQUIRED");
  }
  return user;
}

export function authAllowedOrigins(env: Record<string, string | undefined>): Set<string> {
  const origins = new Set<string>();
  for (const candidate of [env.READING_APP_ORIGIN, env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined, env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined]) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash) origins.add(url.origin);
    } catch { /* Invalid configuration never expands the allowlist. */ }
  }
  if (env.NODE_ENV !== "production" && !env.VERCEL) {
    origins.add("http://localhost:3100");
    origins.add("http://127.0.0.1:3100");
  }
  return origins;
}

export function assertAuthMutation(request: Request, allowedOrigins: Set<string>) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const host = request.headers.get("host") ?? new URL(request.url).host;
  if (!origin || !allowedOrigins.has(origin) || new URL(origin).host !== host ||
      (fetchSite !== null && fetchSite !== "same-origin") || request.headers.get("x-reading-auth") !== "1") {
    throw new AuthError(403, "AUTH_ORIGIN_REJECTED");
  }
  if (request.method !== "POST" || request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new AuthError(415, "AUTH_JSON_REQUIRED");
  }
}

export async function readAuthBody(request: Request): Promise<Record<string, unknown>> {
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > AUTH_MAX_BODY_BYTES)) throw new AuthError(413, "AUTH_BODY_TOO_LARGE");
  if (!request.body) throw new AuthError(400, "AUTH_INPUT_INVALID");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > AUTH_MAX_BODY_BYTES) { await reader.cancel(); throw new AuthError(413, "AUTH_BODY_TOO_LARGE"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
    return parsed as Record<string, unknown>;
  } catch { throw new AuthError(400, "AUTH_INPUT_INVALID"); }
}

export function authErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    "auth/popup-closed-by-user": "로그인 창을 닫았어요. 준비되면 다시 눌러 주세요.",
    "auth/cancelled-popup-request": "열려 있는 Google 로그인 창에서 계속해 주세요.",
    "auth/popup-blocked": "로그인 창이 차단됐어요. 이 사이트의 팝업을 허용한 뒤 다시 눌러 주세요.",
    "auth/network-request-failed": "연결을 확인한 뒤 다시 로그인해 주세요.",
    "auth/account-exists-with-different-credential": "이 이메일은 다른 로그인 방식으로 등록되어 있어요. 관리자에게 문의해 주세요.",
    "auth/unauthorized-domain": "이 주소의 Google 로그인이 아직 연결되지 않았어요. 관리자에게 문의해 주세요.",
    "auth/operation-not-allowed": "Google 로그인을 연결하는 중이에요. 잠시 후 다시 이용해 주세요.",
    "AUTH_NOT_CONFIGURED": "Google 로그인 연결을 준비하고 있어요. 잠시 후 다시 이용해 주세요.",
    "AUTH_RECENT_SIGN_IN_REQUIRED": "로그인 확인 시간이 지났어요. Google 계정을 다시 선택해 주세요.",
    "AUTH_GOOGLE_REQUIRED": "확인된 Google 계정으로 로그인해 주세요.",
    "AUTH_ORIGIN_REJECTED": "로그인 요청을 확인할 수 없어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.",
    "AUTH_WORKSPACE_SAVE_FAILED": "작업을 저장하지 못했어요. 현재 화면에서 작업을 백업한 뒤 다시 로그인해 주세요.",
  };
  return messages[code] ?? "로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.";
}
