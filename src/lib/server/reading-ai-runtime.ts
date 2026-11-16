import "server-only";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildReadingAiRequest, parseReadingAiResponse, ReadingAiError, validateReadingAiInput, type ReadingAiInput } from "./reading-ai";

export const PILOT_MODEL = "gpt-6-luna";
export const PILOT_APPROVAL_ID = "reading-text-development-2026-11-16";
export const PILOT_MAX_CALLS = 10;
export const PILOT_MAX_MICROS = 1_000_000;
export const PILOT_COOKIE = "reading_ai_pilot";
const MAX_REQUEST_BYTES = 40 * 1024;
const MAX_RESPONSE_BYTES = 128 * 1024;
const DAY_MS = 24 * 60 * 60 * 1000;

export class PilotError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) { super(code); this.name = "PilotError"; this.status = status; this.code = code; }
}

export type PilotConfig = { approvedAt: string; expiresAt: string; sessionSecret: string; apiKey: string };
export type PilotUsage = {
  inputTokens: number | null; outputTokens: number | null; totalTokens: number | null;
  cachedInputTokens: number | null; serviceTier: string | null; estimatedUsd: number | null;
};
export type PilotReservation = { inputTokenUpperBound: number; maxOutputTokens: number; reservedMicros: number };
type PilotCall = PilotReservation & {
  id: string; operation: ReadingAiInput["operation"]; fingerprint: string; createdAt: string;
  status: "reserved" | "completed" | "failed" | "unknown"; completedAt?: string; code?: string; usage?: PilotUsage;
};
type PilotLedger = {
  version: 1; approvalId: string; provider: "openai"; model: typeof PILOT_MODEL;
  approvedAt: string; expiresAt: string; maxCalls: number; maxMicros: number;
  reservedMicros: number; halted: boolean; calls: PilotCall[];
};

function approvalRequired(): never { throw new PilotError(503, "AI_APPROVAL_REQUIRED"); }

export function pilotConfig(env: Record<string, string | undefined>, now: number): PilotConfig {
  if (env.NODE_ENV !== "development" || env.VERCEL || env.READING_AI_PILOT_ENABLED !== "true") approvalRequired();
  const approvedAt = env.READING_AI_PILOT_APPROVED_AT ?? "";
  const expiresAt = env.READING_AI_PILOT_EXPIRES_AT ?? "";
  const start = Date.parse(approvedAt), end = Date.parse(expiresAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > now || end <= now || end <= start || end - start > DAY_MS) approvalRequired();
  const sessionSecret = env.READING_AI_PILOT_SESSION_SECRET ?? "";
  if (!/^[a-f0-9]{64}$/.test(sessionSecret)) approvalRequired();
  return { approvedAt, expiresAt, sessionSecret, apiKey: env.OPENAI_API_KEY?.trim() ?? "" };
}

export function assertLocalPilotRequest(request: Request) {
  const url = new URL(request.url);
  const browserHost = request.headers.get("host");
  // Next can normalize the internal URL to localhost even when the browser used 127.0.0.1.
  // Both internal aliases must be loopback; the browser's Host and Origin must still match exactly.
  const allowedBrowserHosts = ["127.0.0.1:3100", "localhost:3100"];
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname) || url.port !== "3100" ||
      browserHost === null || !allowedBrowserHosts.includes(browserHost) ||
      request.headers.get("origin") !== `http://${browserHost}` ||
      request.headers.get("sec-fetch-site") !== "same-origin" || request.headers.has("forwarded")) {
    throw new PilotError(403, "AI_LOCAL_ONLY");
  }
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedFor = request.headers.get("x-forwarded-for");
  if ((forwardedHost && forwardedHost !== browserHost) || (forwardedProto && forwardedProto !== "http") ||
      (forwardedFor && !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(forwardedFor.trim()))) {
    throw new PilotError(403, "AI_LOCAL_ONLY");
  }
  if (request.method !== "POST" || request.headers.get("content-type")?.split(";", 1)[0].trim() !== "application/json") {
    throw new PilotError(415, "AI_INPUT_INVALID");
  }
}

export async function readPilotJson(message: Request | Response, maximum: number): Promise<unknown> {
  const declared = message.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maximum)) throw new PilotError(413, "AI_BODY_TOO_LARGE");
  if (!message.body) throw new PilotError(400, "AI_INPUT_INVALID");
  const reader = message.body.getReader(), chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > maximum) { await reader.cancel(); throw new PilotError(413, "AI_BODY_TOO_LARGE"); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new PilotError(400, "AI_INPUT_INVALID"); }
}

function sessionValue(config: PilotConfig) {
  return createHmac("sha256", config.sessionSecret).update(`${PILOT_APPROVAL_ID}:${config.approvedAt}:${config.expiresAt}`).digest("hex");
}

function assertPilotSession(request: Request, config: PilotConfig) {
  const values = (request.headers.get("cookie") ?? "").split(";").map((part) => part.trim()).filter((part) => part.startsWith(`${PILOT_COOKIE}=`));
  const candidate = values.length === 1 ? values[0].slice(PILOT_COOKIE.length + 1) : "";
  if (!/^[a-f0-9]{64}$/.test(candidate) || !timingSafeEqual(Buffer.from(candidate), Buffer.from(sessionValue(config)))) {
    throw new PilotError(403, "AI_PILOT_SESSION_REQUIRED");
  }
}

export function pilotReservation(body: ReturnType<typeof buildReadingAiRequest>): PilotReservation {
  // UTF-8 byte bound, doubled plus framing allowance; cached input is charged at the full input rate here.
  const inputTokenUpperBound = Buffer.byteLength(JSON.stringify(body), "utf8") * 2 + 4096;
  if (inputTokenUpperBound >= 272_000) throw new PilotError(413, "AI_BODY_TOO_LARGE");
  const maxOutputTokens = body.max_output_tokens;
  // USD/1M tokens -> millionths of a USD. Official standard rates checked 2026-11-16.
  const reservedMicros = Math.ceil(inputTokenUpperBound * 0.10 + maxOutputTokens * 0.50);
  return { inputTokenUpperBound, maxOutputTokens, reservedMicros };
}

function validInteger(value: unknown): value is number { return Number.isSafeInteger(value) && (value as number) >= 0; }

function validateLedger(value: unknown, config: PilotConfig): PilotLedger {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PilotError(503, "AI_PILOT_LEDGER_INVALID");
  const ledger = value as PilotLedger;
  if (ledger.version !== 1 || ledger.approvalId !== PILOT_APPROVAL_ID || ledger.provider !== "openai" || ledger.model !== PILOT_MODEL ||
      ledger.approvedAt !== config.approvedAt || ledger.expiresAt !== config.expiresAt || ledger.maxCalls !== PILOT_MAX_CALLS ||
      ledger.maxMicros !== PILOT_MAX_MICROS || typeof ledger.halted !== "boolean" || !validInteger(ledger.reservedMicros) ||
      !Array.isArray(ledger.calls) || ledger.calls.length > PILOT_MAX_CALLS || ledger.reservedMicros > PILOT_MAX_MICROS) {
    throw new PilotError(503, "AI_PILOT_LEDGER_INVALID");
  }
  const ids = new Set<string>();
  for (const call of ledger.calls) {
    if (!call || typeof call !== "object" || typeof call.id !== "string" || ids.has(call.id) ||
        !["questions", "story-outlines"].includes(call.operation) || !["reserved", "completed", "failed", "unknown"].includes(call.status) ||
        typeof call.fingerprint !== "string" || !/^[a-f0-9]{64}$/.test(call.fingerprint) || !validInteger(call.reservedMicros) || call.reservedMicros <= 0 ||
        !validInteger(call.inputTokenUpperBound) || !validInteger(call.maxOutputTokens) || !Number.isFinite(Date.parse(call.createdAt))) {
      throw new PilotError(503, "AI_PILOT_LEDGER_INVALID");
    }
    ids.add(call.id);
  }
  if (ledger.calls.reduce((sum, call) => sum + call.reservedMicros, 0) !== ledger.reservedMicros) throw new PilotError(503, "AI_PILOT_LEDGER_INVALID");
  return ledger;
}

/** Local pilot only: durable reservations, exclusive file lock, atomic replacement; no automatic stale-lock removal. */
export class PilotLedgerStore {
  private readonly directory: string;
  constructor(directory: string) { this.directory = directory; }

  private async change<T>(config: PilotConfig, operation: (ledger: PilotLedger) => T): Promise<T> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const lockPath = path.join(this.directory, "ledger.lock");
    let lock;
    try { lock = await open(lockPath, "wx", 0o600); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new PilotError(409, "AI_PILOT_BUSY");
      throw new PilotError(503, "AI_PILOT_LEDGER_UNAVAILABLE");
    }
    let temporary: string | undefined;
    try {
      const ledgerPath = path.join(this.directory, "ledger.json");
      let ledger: PilotLedger;
      try { ledger = validateLedger(JSON.parse(await readFile(ledgerPath, "utf8")), config); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new PilotError(503, "AI_PILOT_LEDGER_INVALID");
        ledger = { version: 1, approvalId: PILOT_APPROVAL_ID, provider: "openai", model: PILOT_MODEL, approvedAt: config.approvedAt, expiresAt: config.expiresAt,
          maxCalls: PILOT_MAX_CALLS, maxMicros: PILOT_MAX_MICROS, reservedMicros: 0, halted: false, calls: [] };
      }
      const result = operation(ledger);
      temporary = path.join(this.directory, `ledger-${randomUUID()}.tmp`);
      await writeFile(temporary, JSON.stringify(ledger, null, 2), { flag: "wx", mode: 0o600 });
      await rename(temporary, ledgerPath);
      temporary = undefined;
      return result;
    } finally {
      if (temporary) await unlink(temporary).catch(() => {});
      await lock.close();
      await unlink(lockPath);
    }
  }

  async reserve(config: PilotConfig, operation: ReadingAiInput["operation"], fingerprint: string, reservation: PilotReservation, now: number) {
    return this.change(config, (ledger) => {
      if (ledger.halted) throw new PilotError(503, "AI_PILOT_REVIEW_REQUIRED");
      if (!validInteger(reservation.reservedMicros) || reservation.reservedMicros <= 0 || ledger.calls.length >= PILOT_MAX_CALLS ||
          ledger.reservedMicros + reservation.reservedMicros > PILOT_MAX_MICROS) throw new PilotError(429, "AI_PILOT_LIMIT_REACHED");
      if (ledger.calls.some((call) => call.fingerprint === fingerprint && call.status !== "completed")) throw new PilotError(409, "AI_PILOT_REVIEW_REQUIRED");
      const call: PilotCall = { ...reservation, id: randomUUID(), operation, fingerprint, createdAt: new Date(now).toISOString(), status: "reserved" };
      ledger.calls.push(call);
      ledger.reservedMicros += reservation.reservedMicros;
      return { ...call, callsUsed: ledger.calls.length, totalReservedUsd: ledger.reservedMicros / 1_000_000 };
    });
  }

  async finish(config: PilotConfig, id: string, status: "completed" | "failed" | "unknown", now: number, usage?: PilotUsage, code?: string) {
    await this.change(config, (ledger) => {
      const call = ledger.calls.find((item) => item.id === id);
      if (!call || call.status !== "reserved") throw new PilotError(503, "AI_PILOT_LEDGER_INVALID");
      call.status = status;
      call.completedAt = new Date(now).toISOString();
      if (usage) call.usage = usage;
      if (code) call.code = code;
      if (usage && ((usage.serviceTier !== null && usage.serviceTier !== "default") ||
          (usage.estimatedUsd !== null && Math.ceil(usage.estimatedUsd * 1_000_000) > call.reservedMicros))) ledger.halted = true;
      // Keep the entire reservation and call count even on failure, timeout, or unknown billing.
    });
  }
}

function providerUsage(value: unknown): PilotUsage {
  const response = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const usage = response.usage && typeof response.usage === "object" ? response.usage as Record<string, unknown> : {};
  const details = usage.input_tokens_details && typeof usage.input_tokens_details === "object" ? usage.input_tokens_details as Record<string, unknown> : {};
  const count = (number: unknown) => validInteger(number) ? number : null;
  const inputTokens = count(usage.input_tokens), outputTokens = count(usage.output_tokens);
  const serviceTier = typeof response.service_tier === "string" ? response.service_tier.slice(0, 40) : null;
  return { inputTokens, outputTokens, totalTokens: count(usage.total_tokens), cachedInputTokens: count(details.cached_tokens), serviceTier,
    estimatedUsd: inputTokens !== null && outputTokens !== null && (serviceTier === null || serviceTier === "default") ? (inputTokens * 0.10 + outputTokens * 0.50) / 1_000_000 : null };
}

export type PilotDependencies = {
  env?: Record<string, string | undefined>; now?: () => number;
  fetchImpl?: typeof fetch; ledgerDirectory?: string;
};

const publicMessages: Record<string, string> = {
  AI_APPROVAL_REQUIRED: "AI 기능은 승인된 로컬 개발 검증에서만 사용할 수 있어요.",
  AI_LOCAL_ONLY: "이 로컬 화면에서 다시 요청해 주세요.",
  AI_PILOT_SESSION_REQUIRED: "로컬 검증 세션을 다시 시작해 주세요.",
  AI_PILOT_LIMIT_REACHED: "승인된 AI 검증 한도에 도달했어요.",
  AI_PILOT_REVIEW_REQUIRED: "이전 요청의 사용 기록을 먼저 확인해야 해요.",
  AI_PILOT_BUSY: "사용 기록을 처리하고 있어요. 잠시 후 확인해 주세요.",
  AI_INPUT_INVALID: "학년과 입력 내용을 확인해 주세요.",
  AI_BODY_TOO_LARGE: "입력 내용이 너무 길어요.",
};

export async function handleReadingAiPost(request: Request, dependencies: PilotDependencies = {}): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  try {
    const now = dependencies.now ?? Date.now;
    const config = pilotConfig(dependencies.env ?? process.env, now());
    assertLocalPilotRequest(request);
    const value = await readPilotJson(request, MAX_REQUEST_BYTES);
    if (Date.parse(config.expiresAt) <= now()) approvalRequired();
    if (value && typeof value === "object" && !Array.isArray(value) && (value as Record<string, unknown>).operation === "pilot-session") {
      if (Object.keys(value).length !== 1) throw new PilotError(400, "AI_INPUT_INVALID");
      const maxAge = Math.max(1, Math.floor((Date.parse(config.expiresAt) - now()) / 1000));
      return Response.json({ ready: true, scope: "local-development-text-pilot", expiresAt: config.expiresAt }, { headers: {
        ...headers, "Set-Cookie": `${PILOT_COOKIE}=${sessionValue(config)}; HttpOnly; SameSite=Strict; Path=/api/reading-ai; Max-Age=${maxAge}`,
      } });
    }
    assertPilotSession(request, config);
    const input = validateReadingAiInput(value);
    if (!config.apiKey || /[\r\n]/.test(config.apiKey)) throw new PilotError(503, "AI_PILOT_UNAVAILABLE");
    const body = { ...buildReadingAiRequest(input, PILOT_MODEL), background: false as const, stream: false as const, service_tier: "default" as const };
    const serialized = JSON.stringify(body);
    const store = new PilotLedgerStore(dependencies.ledgerDirectory ?? path.join(process.cwd(), ".local", "ai-pilot"));
    const reservation = await store.reserve(config, input.operation, createHash("sha256").update(serialized).digest("hex"), pilotReservation(body), now());
    let usage: PilotUsage | undefined, finished = false;
    try {
      if (Date.parse(config.expiresAt) <= now()) approvalRequired();
      const response = await (dependencies.fetchImpl ?? fetch)("https://api.openai.com/v1/responses", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
        body: serialized, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok) {
        await response.body?.cancel();
        await store.finish(config, reservation.id, "failed", now(), undefined, "AI_PROVIDER_FAILED");
        finished = true;
        throw new PilotError(502, "AI_PROVIDER_FAILED");
      }
      const payload = await readPilotJson(response, MAX_RESPONSE_BYTES);
      usage = providerUsage(payload);
      const result = parseReadingAiResponse(input, payload);
      await store.finish(config, reservation.id, "completed", now(), usage);
      finished = true;
      return Response.json({ result, usage: { ...usage, callsUsed: reservation.callsUsed, reservedUsd: reservation.reservedMicros / 1_000_000,
        totalReservedUsd: reservation.totalReservedUsd, maxCalls: PILOT_MAX_CALLS, maxUsd: 1 } }, { headers });
    } catch (error) {
      if (!finished) await store.finish(config, reservation.id, "unknown", now(), usage, error instanceof ReadingAiError ? error.code : "AI_RESULT_UNKNOWN").catch(() => {});
      if (error instanceof PilotError) throw error;
      throw new PilotError(502, error instanceof ReadingAiError ? error.code : "AI_RESULT_UNKNOWN");
    }
  } catch (error) {
    const status = error instanceof PilotError ? error.status : error instanceof ReadingAiError ? 400 : 503;
    const code = error instanceof PilotError || error instanceof ReadingAiError ? error.code : "AI_PILOT_UNAVAILABLE";
    return Response.json({ code, error: publicMessages[code] ?? "요청 결과를 확인하지 못했어요. 사용 기록을 확인한 뒤 다시 진행해 주세요." }, { status, headers });
  }
}
