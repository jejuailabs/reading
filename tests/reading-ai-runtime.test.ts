import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after, afterEach } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

type Runtime = typeof import("../src/lib/server/reading-ai-runtime.ts");
type Core = typeof import("../src/lib/server/reading-ai.ts");
type Route = typeof import("../src/app/api/reading-ai/route.ts");
const requireBuiltin = createRequire(import.meta.url);
const effects = { network: 0, environment: 0 };

function load<Module>(relative: string, dependencies: Record<string, unknown> = {}): Module {
  const source = readFileSync(new URL(relative, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  const processSentinel = Object.defineProperty({}, "env", { get() { effects.environment++; throw Error("Real environment access forbidden"); } });
  runInNewContext(code, {
    exports, Response, Request, URL, Buffer, AbortSignal,
    process: processSentinel,
    fetch: () => { effects.network++; throw Error("Real transport forbidden"); },
    require: (name: string) => {
      if (name === "server-only") return {};
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      if (["node:crypto", "node:fs/promises", "node:path"].includes(name)) return requireBuiltin(name);
      throw Error("Unexpected runtime dependency");
    },
  }, { timeout: 1000, filename: relative });
  return exports as Module;
}

const core = load<Core>("../src/lib/server/reading-ai.ts");
const runtime = load<Runtime>("../src/lib/server/reading-ai-runtime.ts", { "./reading-ai": core });
const temporaryRoot = await mkdtemp(path.join(tmpdir(), "reading-ai-pilot-test-"));
let directoryNumber = 0;
const directory = () => path.join(temporaryRoot, `case-${directoryNumber++}`);
const NOW = Date.parse("2026-11-16T03:00:00.000Z");
const env = {
  NODE_ENV: "development", READING_AI_PILOT_ENABLED: "true",
  READING_AI_PILOT_APPROVED_AT: "2026-11-16T02:00:00.000Z",
  READING_AI_PILOT_EXPIRES_AT: "2026-11-17T02:00:00.000Z",
  READING_AI_PILOT_SESSION_SECRET: "a".repeat(64), OPENAI_API_KEY: "test-only-not-a-provider-key",
};
const input = { operation: "questions", gradeBand: "3-4", locale: "en", sourceText: "The child walked home and showed the letter to a friend.", studentQuestion: "Why did the child show the letter?" };

function request(value: unknown, cookie = "", headers: Record<string, string> = {}, url = "http://127.0.0.1:3100/api/reading-ai") {
  return new Request(url, { method: "POST", headers: {
    host: "127.0.0.1:3100", origin: "http://127.0.0.1:3100", "sec-fetch-site": "same-origin", "content-type": "application/json", cookie, ...headers,
  }, body: JSON.stringify(value) });
}

function dependencies(ledgerDirectory = directory(), fetchImpl?: typeof fetch) {
  return { env: { ...env }, now: () => NOW, ledgerDirectory, fetchImpl };
}

async function session(deps: ReturnType<typeof dependencies>) {
  const response = await runtime.handleReadingAiPost(request({ operation: "pilot-session" }), deps);
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie")!;
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\/api\/reading-ai/);
  const body = await response.json();
  assert.deepEqual(Object.keys(body).sort(), ["expiresAt", "ready", "scope"]);
  return cookie.split(";", 1)[0];
}

function providerResponse() {
  return Response.json({
    status: "completed", service_tier: "default", usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150, input_tokens_details: { cached_tokens: 0 } },
    output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify({
      operation: "questions", coaching: "Look closely at what the child did.", evidenceQuote: "showed the letter to a friend",
      evidencePrompt: "Which action might help you think about your question?",
      questionStarters: [{ kind: "literal", text: "Who saw the letter?" }, { kind: "inferential", text: "What clues could help explain that choice?" }],
      teacherReviewNote: "Discuss the child's own interpretation before sharing this draft.",
    }) }] }],
  });
}

const fingerprint = (value: string) => createHash("sha256").update(value).digest("hex");
const codeIs = (code: string) => (error: unknown) => error !== null && typeof error === "object" && "code" in error && error.code === code;

afterEach(() => { assert.equal(effects.network, 0); assert.equal(effects.environment, 0); });
after(async () => {
  const target = path.resolve(temporaryRoot), base = path.resolve(tmpdir());
  assert.equal(target.startsWith(base + path.sep), true);
  assert.equal(path.basename(target).startsWith("reading-ai-pilot-test-"), true);
  await rm(target, { recursive: true, force: true });
});

test("production, hosted, disabled and expired configurations fail before transport or environment disclosure", async () => {
  for (const changes of [
    { NODE_ENV: "production" }, { VERCEL: "1" }, { READING_AI_PILOT_ENABLED: "false" },
    { READING_AI_PILOT_EXPIRES_AT: new Date(NOW - 1).toISOString() },
    { READING_AI_PILOT_EXPIRES_AT: new Date(NOW + 2 * 86400000).toISOString() },
  ]) {
    const deps = dependencies();
    Object.assign(deps.env, changes);
    const response = await runtime.handleReadingAiPost(request({ operation: "pilot-session" }), deps);
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.code, "AI_APPROVAL_REQUIRED");
    assert.deepEqual(Object.keys(body).sort(), ["code", "error"]);
  }
});

test("origin, host, Fetch Metadata and forwarded remote addresses cannot initialize a local session", async () => {
  const invalidHeaders: Record<string, string>[] = [
    { origin: "http://localhost:3100" }, { origin: "null" }, { host: "remote.example" },
    { "sec-fetch-site": "cross-site" }, { "sec-fetch-site": "none" },
    { "x-forwarded-for": "203.0.113.1" }, { "x-forwarded-host": "remote.example" }, { "x-forwarded-host": "localhost:3100" }, { forwarded: "for=remote" },
  ];
  for (const changes of invalidHeaders) {
    const response = await runtime.handleReadingAiPost(request({ operation: "pilot-session" }, "", changes), dependencies());
    assert.equal(response.status, 403);
  }
  const remote = await runtime.handleReadingAiPost(request({ operation: "pilot-session" }, "", {}, "http://remote.example:3100/api/reading-ai"), dependencies());
  assert.equal(remote.status, 403);
});

test("Next's internal loopback alias may differ while browser Host and Origin remain exactly paired", async () => {
  const pairs = [
    { internalUrl: "http://localhost:3100/api/reading-ai", host: "127.0.0.1:3100" },
    { internalUrl: "http://127.0.0.1:3100/api/reading-ai", host: "localhost:3100" },
  ];
  for (const pair of pairs) {
    const headers = { host: pair.host, origin: `http://${pair.host}`, "x-forwarded-host": pair.host, "x-forwarded-proto": "http", "x-forwarded-for": "127.0.0.1" };
    const response = await runtime.handleReadingAiPost(request({ operation: "pilot-session" }, "", headers, pair.internalUrl), dependencies());
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly/);
    const mismatched = await runtime.handleReadingAiPost(request({ operation: "pilot-session" }, "", { ...headers, origin: "https://external.example" }, pair.internalUrl), dependencies());
    assert.equal(mismatched.status, 403);
  }
});

test("session initialization is independent of key presence and a signed cookie is needed for generation", async () => {
  const deps = dependencies();
  deps.env.OPENAI_API_KEY = "";
  await session(deps);
  for (const cookie of ["", `${runtime.PILOT_COOKIE}=${"b".repeat(64)}`]) {
    const response = await runtime.handleReadingAiPost(request(input, cookie), deps);
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, "AI_PILOT_SESSION_REQUIRED");
  }
});

test("request byte limits, input validation and approval expiry stop before any paid reservation", async () => {
  const deps = dependencies();
  const cookie = await session(deps);
  const tooLarge = await runtime.handleReadingAiPost(request({ ...input, sourceText: "가".repeat(20000) }, cookie), deps);
  assert.equal(tooLarge.status, 413);
  const invalid = await runtime.handleReadingAiPost(request({ ...input, approved: true }, cookie), deps);
  assert.equal(invalid.status, 400);
  let nowCalls = 0;
  const expired = await runtime.handleReadingAiPost(request(input, cookie), { ...deps, now: () => nowCalls++ ? Date.parse(env.READING_AI_PILOT_EXPIRES_AT) + 1 : NOW });
  assert.equal(expired.status, 503);
  await assert.rejects(readFile(path.join(deps.ledgerDirectory, "ledger.json")), { code: "ENOENT" });
});

test("one injected transport call uses the fixed standard model and records only usage metadata", async () => {
  let calls = 0;
  const deps = dependencies(directory(), async (url, init) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/responses");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, "gpt-6-luna");
    assert.equal(body.store, false);
    assert.equal(body.background, false);
    assert.equal(body.stream, false);
    assert.equal(body.service_tier, "default");
    assert.equal(body.tools, undefined);
    assert.equal(init?.redirect, "error");
    return providerResponse();
  });
  const cookie = await session(deps);
  const response = await runtime.handleReadingAiPost(request(input, cookie), deps);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.result.operation, "questions");
  assert.equal(body.usage.callsUsed, 1);
  assert.equal(body.usage.inputTokens, 100);
  assert.equal(body.usage.reservedUsd > body.usage.estimatedUsd, true);
  assert.equal(calls, 1);
  const saved = await readFile(path.join(deps.ledgerDirectory, "ledger.json"), "utf8");
  assert.equal(saved.includes(input.sourceText), false);
  assert.equal(saved.includes(input.studentQuestion), false);
  assert.equal(saved.includes(env.OPENAI_API_KEY), false);
  assert.equal(JSON.parse(saved).calls[0].status, "completed");
});

test("unknown transport outcomes keep their reservation and cannot silently retry the same request", async () => {
  let calls = 0;
  const deps = dependencies(directory(), async () => { calls++; throw Error("simulated unknown transport outcome"); });
  const cookie = await session(deps);
  const response = await runtime.handleReadingAiPost(request(input, cookie), deps);
  assert.equal(response.status, 502);
  assert.equal((await response.json()).code, "AI_RESULT_UNKNOWN");
  const first = JSON.parse(await readFile(path.join(deps.ledgerDirectory, "ledger.json"), "utf8"));
  assert.equal(first.calls.length, 1);
  assert.equal(first.calls[0].status, "unknown");
  assert.equal(first.reservedMicros > 0, true);
  const repeated = await runtime.handleReadingAiPost(request(input, cookie), deps);
  assert.equal(repeated.status, 409);
  assert.equal(calls, 1);
  const second = JSON.parse(await readFile(path.join(deps.ledgerDirectory, "ledger.json"), "utf8"));
  assert.equal(second.reservedMicros, first.reservedMicros);
});

test("worksheet hints share the existing guarded budget and do not log raw worksheet context", async () => {
  const worksheetContext = {formTitle:"Private worksheet title",fieldLabel:"A learner's focus",fieldPrompt:"Find a clue for the current prompt."};
  let calls = 0;
  const deps = dependencies(directory(), async (_url, init) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    const submitted = JSON.parse(body.input[0].content[0].text);
    assert.deepEqual(submitted.worksheetContext,worksheetContext);
    assert.equal(submitted.operation,"questions");
    assert.equal(body.max_output_tokens,1600);
    return providerResponse();
  });
  const cookie = await session(deps);
  const response = await runtime.handleReadingAiPost(request({...input,worksheetContext},cookie),deps);
  assert.equal(response.status,200);
  const result = await response.json();
  assert.equal(result.usage.maxCalls,10);
  assert.equal(result.usage.maxUsd,1);
  assert.equal(result.usage.callsUsed,1);
  assert.equal(calls,1);
  const saved = await readFile(path.join(deps.ledgerDirectory,"ledger.json"),"utf8");
  for(const value of Object.values(worksheetContext)) assert.equal(saved.includes(value),false);
  assert.equal(JSON.parse(saved).calls[0].operation,"questions");
});

test("provider failures and malformed generated output also retain calls and reservations", async () => {
  for (const makeResponse of [() => new Response("untrusted provider detail", { status: 429 }), () => Response.json({ status: "incomplete" })]) {
    let calls = 0;
    const deps = dependencies(directory(), async () => { calls++; return makeResponse(); });
    const cookie = await session(deps);
    const response = await runtime.handleReadingAiPost(request(input, cookie), deps);
    assert.equal(response.status, 502);
    assert.equal((await response.text()).includes("untrusted provider detail"), false);
    const saved = JSON.parse(await readFile(path.join(deps.ledgerDirectory, "ledger.json"), "utf8"));
    assert.equal(saved.calls.length, 1);
    assert.equal(saved.reservedMicros > 0, true);
    assert.equal(calls, 1);
  }
});

test("durable ledger limits survive new store instances and never allow an eleventh call", async () => {
  const folder = directory(), config = runtime.pilotConfig(env, NOW);
  const reservation = { inputTokenUpperBound: 1000, maxOutputTokens: 1600, reservedMicros: 1000 };
  for (let index = 0; index < 10; index++) {
    await new runtime.PilotLedgerStore(folder).reserve(config, "questions", fingerprint(String(index)), reservation, NOW);
  }
  await assert.rejects(new runtime.PilotLedgerStore(folder).reserve(config, "questions", fingerprint("11"), reservation, NOW), codeIs("AI_PILOT_LIMIT_REACHED"));
  const saved = JSON.parse(await readFile(path.join(folder, "ledger.json"), "utf8"));
  assert.equal(saved.calls.length, 10);
  assert.equal(saved.reservedMicros, 10000);
});

test("the one-dollar cap and exclusive lock protect concurrent reservations", async () => {
  const config = runtime.pilotConfig(env, NOW), folder = directory();
  const store = new runtime.PilotLedgerStore(folder);
  await store.reserve(config, "questions", fingerprint("large"), { inputTokenUpperBound: 1000, maxOutputTokens: 1600, reservedMicros: 900000 }, NOW);
  await assert.rejects(store.reserve(config, "questions", fingerprint("over-budget"), { inputTokenUpperBound: 1000, maxOutputTokens: 1600, reservedMicros: 100001 }, NOW), codeIs("AI_PILOT_LIMIT_REACHED"));
  const concurrent = directory(), reservation = { inputTokenUpperBound: 1000, maxOutputTokens: 1600, reservedMicros: 1000 };
  for (let index = 0; index < 9; index++) await new runtime.PilotLedgerStore(concurrent).reserve(config, "questions", fingerprint(String(index)), reservation, NOW);
  const attempts = await Promise.allSettled(["last-a", "last-b"].map((id) => new runtime.PilotLedgerStore(concurrent).reserve(config, "questions", fingerprint(id), reservation, NOW)));
  assert.equal(attempts.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(JSON.parse(await readFile(path.join(concurrent, "ledger.json"), "utf8")).calls.length, 10);
});

test("corrupted ledgers and stale locks fail closed without resetting approval usage", async () => {
  const folder = directory(), config = runtime.pilotConfig(env, NOW), store = new runtime.PilotLedgerStore(folder);
  const reservation = { inputTokenUpperBound: 1000, maxOutputTokens: 1600, reservedMicros: 1000 };
  await store.reserve(config, "questions", fingerprint("initial"), reservation, NOW);
  await writeFile(path.join(folder, "ledger.json"), "{broken");
  await assert.rejects(store.reserve(config, "questions", fingerprint("corrupt"), reservation, NOW), codeIs("AI_PILOT_LEDGER_INVALID"));
  await writeFile(path.join(folder, "ledger.lock"), "test-lock");
  await assert.rejects(store.reserve(config, "questions", fingerprint("locked"), reservation, NOW), codeIs("AI_PILOT_BUSY"));
  assert.equal(await readFile(path.join(folder, "ledger.json"), "utf8"), "{broken");
});

test("the route keeps GET private and forwards POST only to the guarded runtime", async () => {
  let forwarded: Request | undefined;
  const route = load<Route>("../src/app/api/reading-ai/route.ts", {
    "@/lib/server/reading-ai-runtime": { handleReadingAiPost: async (value: Request) => { forwarded = value; return new Response(null, { status: 503 }); } },
  });
  const get = await route.GET();
  assert.equal(get.status, 503);
  assert.deepEqual(Object.keys(await get.json()).sort(), ["code", "error"]);
  const sent = request(input);
  assert.equal((await route.POST(sent)).status, 503);
  assert.equal(forwarded, sent);
});
