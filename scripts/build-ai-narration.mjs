import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNarrationRequest, narrationModelMetadata } from '../src/lib/server/narration-request.ts';

// Default: read-only dry run, no credentials or network.
// Actual execution: --execute-approved [--first-book-only], with a separately
// recorded explicit USER approval. No approval creation/bypass/retry/reset flag.
// tts-1-hd shuts down on 2027-01-06: a replacement requires new review/approval.
// This local CLI is not a production provider, HTTP endpoint, or cloud worker.
const ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const SOURCE = path.join(ROOT, 'artifacts/classics-audio/source.json');
const MANIFEST = path.join(ROOT, 'src/lib/classic-ai-audio.json');
const STATE = path.join(ROOT, '.local/ai-narration');
const APPROVAL = path.join(STATE, 'approval.json');
const LEDGER = path.join(STATE, 'ledger.json');
const LOCK = path.join(STATE, 'execution.lock');
const ENDPOINT = 'https://api.openai.com/v1/audio/speech';
const MODEL = 'tts-1-hd', VOICE = 'nova', SPEED = 0.95, FORMAT = 'mp3';
const PURPOSE = 'classic-korean-whole-book-narration';
const MAX_CALLS = 10, MAX_MICROS = 1_000_000, MICROS_PER_CHAR = 30;
const MAX_BYTES = 30 * 1024 * 1024, TIMEOUT_MS = 180_000;
const SHUTDOWN = Date.parse('2027-01-06T00:00:00Z');
const IDS = ['heungbu-nolbu','sun-moon-siblings','old-man-lump','rabbit-turtle-king','kind-brothers',
  'aesop-hare-tortoise','aesop-lion-mouse','aesop-fox-grapes','aesop-wind-sun','aesop-town-country-mouse'];
class Stop extends Error { constructor(code) { super(code); this.code = code; } }
function check(condition, code) { if (!condition) throw new Stop(code); }
function sha(value) { return createHash('sha256').update(value).digest('hex'); }
function usd(micros) { return Number((micros / 1_000_000).toFixed(6)); }
function code(error) { return error instanceof Stop ? error.code : 'UNEXPECTED_LOCAL_FAILURE'; }
async function stat(file) { try { return await fs.lstat(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
async function readJson(file, optional = false) {
  const info = await stat(file);
  if (!info && optional) return null;
  check(info?.isFile() && !info.isSymbolicLink() && info.size < 2 * 1024 * 1024, 'LOCAL_JSON_MISSING_OR_UNSAFE');
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { throw new Stop('LOCAL_JSON_INVALID'); }
}
async function safeDirectory(directory) {
  const relative = path.relative(ROOT, directory);
  check(!relative.startsWith('..') && !path.isAbsolute(relative), 'PATH_OUTSIDE_WORKSPACE');
  let current = ROOT;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    const info = await stat(current);
    if (!info) await fs.mkdir(current, { mode: 0o700 });
    else check(info.isDirectory() && !info.isSymbolicLink(), 'UNSAFE_OUTPUT_DIRECTORY');
  }
}
async function atomicJson(file, value) {
  await safeDirectory(path.dirname(file));
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`);
  const handle = await fs.open(temporary, 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(value, null, 2) + '\n'); await handle.sync(); }
  finally { await handle.close(); }
  await fs.rename(temporary, file);
}

async function prepare() {
  const source = await readJson(SOURCE);
  check(Array.isArray(source) && source.length === 10 && new Set(source.map(b => b.id)).size === 10 &&
    source.every(b => IDS.includes(b.id)), 'EXPECTED_TEN_EXPORTED_CLASSICS');
  check(narrationModelMetadata.model === MODEL && narrationModelMetadata.voice === VOICE &&
    narrationModelMetadata.speed === SPEED && narrationModelMetadata.responseFormat === FORMAT &&
    narrationModelMetadata.usdPerMillionCharacters === 30, 'BUILDER_CONFIGURATION_CHANGED');
  const jobs = IDS.map(id => {
    const exported = source.find(book => book.id === id);
    check(typeof exported.title === 'string' && exported.title.trim() && Array.isArray(exported.pages), 'EXPORTED_BOOK_INVALID');
    for (const page of exported.pages) check(typeof page.ko?.text === 'string' && page.ko.text.trim() &&
      page.ko.sha256 === sha(Buffer.from(page.ko.text, 'utf8')), 'EXPORTED_SCENE_HASH_MISMATCH');
    const input = exported.title + '\n\n' + exported.pages.map(page => page.ko.text).join('\n\n');
    const expected = buildNarrationRequest(id);
    const characters = [...input].length;
    const hash = sha(Buffer.from(input, 'utf8'));
    check(input === expected.body.input && hash === expected.metadata.sourceHash &&
      exported.pages.length === expected.metadata.pageCount, 'EXPORT_IS_STALE');
    check(characters > 0 && characters <= 4096 && characters === expected.metadata.characterCount, 'INPUT_CHARACTER_LIMIT');
    return { id, input, characters, sha256: hash, revision: expected.metadata.revision,
      cacheKey: expected.metadata.cacheKey, reservedMicros: characters * MICROS_PER_CHAR,
      src: `/audio/classics-ai/${id}/ko.mp3`, file: path.join(ROOT, 'public/audio/classics-ai', id, 'ko.mp3'),
      body: { model: MODEL, input, voice: VOICE, response_format: FORMAT, speed: SPEED } };
  });
  return { jobs, corpusSha256: sha(JSON.stringify(jobs.map(j => ({id:j.id,revision:j.revision,sha256:j.sha256,cacheKey:j.cacheKey})))) };
}
async function cacheState(jobs) {
  const manifest = await readJson(MANIFEST, true) ?? {version:1,provider:'openai',model:MODEL,books:{}};
  check(manifest.version === 1 && manifest.provider === 'openai' && manifest.model === MODEL &&
    manifest.books && typeof manifest.books === 'object' && !Array.isArray(manifest.books), 'MANIFEST_INVALID');
  check(Object.keys(manifest.books).every(id => IDS.includes(id)), 'MANIFEST_UNEXPECTED_BOOK');
  const cached = [], pending = [];
  for (const job of jobs) {
    const entry = manifest.books[job.id]?.ko, info = await stat(job.file);
    if (!entry && !info) { pending.push(job); continue; }
    check(entry && info?.isFile() && !info.isSymbolicLink() && info.size > 0 && info.size <= MAX_BYTES, 'EXISTING_AUDIO_INCOMPLETE_REVIEW_REQUIRED');
    check(entry.sha256 === job.sha256 && entry.characters === job.characters && entry.src === job.src &&
      entry.model === MODEL && entry.voice === VOICE && entry.speed === SPEED && entry.cacheKey === job.cacheKey &&
      Number.isFinite(entry.duration) && entry.duration > 0, 'EXISTING_AUDIO_SCOPE_CHANGED_REVIEW_REQUIRED');
    check(typeof entry.audioSha256 === 'string' && /^[a-f0-9]{64}$/.test(entry.audioSha256) &&
      sha(await fs.readFile(job.file)) === entry.audioSha256, 'EXISTING_AUDIO_FILE_HASH_MISMATCH');
    cached.push(job.id);
  }
  return {manifest,cached,pending};
}
function localOnly() {
  check(path.resolve(process.cwd()) === ROOT, 'RUN_FROM_READING_WORKSPACE');
  check(process.env.NODE_ENV !== 'production' && !['CI','VERCEL','GITHUB_ACTIONS','AWS_LAMBDA_FUNCTION_NAME','K_SERVICE','FUNCTION_TARGET'].some(k => process.env[k]), 'LOCAL_DEVELOPMENT_ONLY');
}
function verifyApproval(value, prepared) {
  check(value?.version === 1 && value.userApproved === true && value.approvedBy === 'user', 'EXPLICIT_TTS_APPROVAL_REQUIRED');
  check(typeof value.approvalId === 'string' && /^[a-z0-9-]{12,100}$/.test(value.approvalId) &&
    typeof value.approvalStatement === 'string' && value.approvalStatement.trim().length >= 10, 'USER_APPROVAL_RECORD_REQUIRED');
  check(value.environment === 'local-development' && value.purpose === PURPOSE && value.provider === 'openai' &&
    value.endpoint === ENDPOINT && value.model === MODEL && value.voice === VOICE && value.speed === SPEED &&
    value.responseFormat === FORMAT && value.locale === 'ko', 'APPROVAL_SCOPE_MISMATCH');
  check(value.corpusSha256 === prepared.corpusSha256 && JSON.stringify(value.bookIds) === JSON.stringify(IDS), 'APPROVAL_MANUSCRIPT_MISMATCH');
  check(value.maxRequests === MAX_CALLS && value.maxUsd === 1 && value.usdPerMillionCharacters === 30 &&
    value.automaticRetries === 0 && value.recurringCharges === false, 'APPROVAL_BILLING_SCOPE_MISMATCH');
  const start = Date.parse(value.approvedAt), end = Date.parse(value.expiresAt), now = Date.now();
  check(Number.isFinite(start) && Number.isFinite(end) && start <= now && end > now && end > start && end-start <= 86400000, 'APPROVAL_EXPIRED_OR_INVALID');
  return sha(JSON.stringify(value));
}
function verifyLedger(ledger, approval, fingerprint, prepared) {
  check(ledger.version === 1 && ledger.approvalId === approval.approvalId && ledger.approvalFingerprint === fingerprint &&
    ledger.corpusSha256 === prepared.corpusSha256 && ledger.model === MODEL && ledger.provider === 'openai' &&
    ledger.maxRequests === MAX_CALLS && ledger.maxMicros === MAX_MICROS && Array.isArray(ledger.calls), 'LEDGER_SCOPE_MISMATCH_NO_RESET');
  check(!ledger.halted && ledger.calls.every(call => call.status === 'completed'), 'LEDGER_HALTED_OR_UNRESOLVED_NO_RETRY');
  check(ledger.calls.every(call => IDS.includes(call.bookId) && Number.isInteger(call.characters) && call.characters > 0 &&
    call.characters <= 4096 && call.reservedMicros === call.characters * MICROS_PER_CHAR), 'LEDGER_RESERVATION_INVALID');
  check(new Set(ledger.calls.map(call => call.bookId)).size === ledger.calls.length && ledger.calls.length <= MAX_CALLS &&
    ledger.reservedMicros === ledger.calls.reduce((sum,c) => sum+c.reservedMicros,0) && ledger.reservedMicros <= MAX_MICROS, 'LEDGER_CUMULATIVE_LIMIT');
}
function probe(file) {
  try {
    const output = execFileSync(process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe', ['-v','error','-protocol_whitelist','file,pipe','-f','mp3',
      '-select_streams','a:0','-show_entries','stream=codec_name,codec_type:format=duration','-of','json',file],
      {encoding:'utf8',timeout:10000,windowsHide:true,stdio:['ignore','pipe','pipe']});
    const result = JSON.parse(output), duration = Number(result.format?.duration);
    check(result.streams?.[0]?.codec_name === 'mp3' && result.streams[0].codec_type === 'audio' && Number.isFinite(duration) && duration > 0, 'INVALID_AUDIO');
    return duration;
  } catch { throw new Stop('LOCAL_MP3_VALIDATION_FAILED'); }
}
async function speech(job, key) {
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(ENDPOINT, {method:'POST',redirect:'error',signal:controller.signal,
      headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(job.body)});
    check(response.ok, `PROVIDER_HTTP_${response.status}_NO_RETRY`);
    check(/^(audio\/(mpeg|mp3)|application\/octet-stream)(;|$)/i.test(response.headers.get('content-type') ?? '') && response.body, 'INVALID_PROVIDER_CONTENT');
    const reader = response.body.getReader(), chunks = []; let bytes = 0;
    for (;;) { const {value,done} = await reader.read(); if(done) break; bytes += value.byteLength;
      if(bytes > MAX_BYTES) { controller.abort(); throw new Stop('AUDIO_SIZE_LIMIT'); } chunks.push(Buffer.from(value)); }
    check(bytes > 0, 'EMPTY_AUDIO');
    const requestId = response.headers.get('x-request-id');
    return {bytes:Buffer.concat(chunks),requestId:requestId && /^[a-zA-Z0-9_-]{1,160}$/.test(requestId) ? requestId : null};
  } catch(error) { if(error instanceof Stop) throw error; throw new Stop(controller.signal.aborted ? 'TIMEOUT_UNKNOWN_CHARGE_NO_RETRY' : 'NETWORK_FAILURE_UNKNOWN_CHARGE_NO_RETRY'); }
  finally { clearTimeout(timeout); }
}

async function execute(prepared, firstOnly) {
  localOnly();
  const approval = await readJson(APPROVAL, true), fingerprint = verifyApproval(approval, prepared);
  await safeDirectory(STATE);
  let lock;
  try { lock = await fs.open(LOCK,'wx',0o600); } catch(error) { if(error.code === 'EEXIST') throw new Stop('EXECUTION_LOCK_EXISTS_NO_BYPASS'); throw error; }
  const runId = randomUUID();
  await lock.writeFile(JSON.stringify({runId,pid:process.pid,createdAt:new Date().toISOString()})); await lock.sync();
  try {
    const cache = await cacheState(prepared.jobs);
    const ledger = await readJson(LEDGER,true) ?? {version:1,approvalId:approval.approvalId,approvalFingerprint:fingerprint,
      corpusSha256:prepared.corpusSha256,provider:'openai',model:MODEL,maxRequests:MAX_CALLS,maxMicros:MAX_MICROS,
      reservedMicros:0,actualSuccessfulCharacters:0,estimatedSuccessfulMicros:0,halted:false,calls:[]};
    verifyLedger(ledger,approval,fingerprint,prepared);
    if(!cache.pending.length) { console.log(JSON.stringify({result:'CACHE_COMPLETE',requests:0,cached:cache.cached.length,keysRead:false})); return; }
    check(Date.now() < SHUTDOWN, 'MODEL_RETIRED_NEW_PROVIDER_REQUIRES_NEW_APPROVAL');
    check(!cache.pending.some(job => ledger.calls.some(call => call.bookId === job.id)), 'PREVIOUSLY_CHARGED_AUDIO_MISSING_NO_REGENERATION');
    check(ledger.calls.length + cache.pending.length <= MAX_CALLS && ledger.reservedMicros + cache.pending.reduce((n,j) => n+j.reservedMicros,0) <= MAX_MICROS, 'CUMULATIVE_BUDGET_EXCEEDED');
    try { execFileSync(process.platform === 'win32'?'ffprobe.exe':'ffprobe',['-version'],{stdio:'ignore',windowsHide:true,timeout:10000}); }
    catch { throw new Stop('FFPROBE_REQUIRED_BEFORE_BILLING'); }
    let key;
    for(const job of firstOnly ? cache.pending.slice(0,1) : cache.pending) {
      verifyApproval(approval,prepared);
      const call = {id:randomUUID(),bookId:job.id,sourceHash:job.sha256,cacheKey:job.cacheKey,characters:job.characters,
        reservedMicros:job.reservedMicros,status:'reserved',reservedAt:new Date().toISOString()};
      ledger.calls.push(call); ledger.reservedMicros += call.reservedMicros;
      await atomicJson(LEDGER,ledger); // Durable reservation BEFORE key access or HTTP.
      let temporary;
      try {
        if(!key) {
          const env = await import('@next/env');
          const load = env.loadEnvConfig ?? env.default?.loadEnvConfig;
          check(typeof load === 'function','NEXT_ENV_LOADER_UNAVAILABLE');
          const loaded = load(ROOT,true,{info(){},error(){throw new Stop('LOCAL_ENV_LOAD_FAILED');}});
          localOnly(); key = loaded.combinedEnv.OPENAI_API_KEY?.trim();
          check(typeof key === 'string' && key.length > 0,'OPENAI_API_KEY_MISSING');
        }
        const audio = await speech(job,key);
        await safeDirectory(path.dirname(job.file));
        temporary = path.join(path.dirname(job.file),`.ko.${call.id}.mp3`);
        const file = await fs.open(temporary,'wx',0o600);
        try { await file.writeFile(audio.bytes); await file.sync(); } finally { await file.close(); }
        const entry = {src:job.src,duration:probe(temporary),sha256:job.sha256,characters:job.characters,model:MODEL,voice:VOICE,speed:SPEED,
          cacheKey:job.cacheKey,audioSha256:sha(audio.bytes),revision:job.revision,generatedAt:new Date().toISOString(),disclosure:'AI가 만든 낭독 음성입니다.'};
        Object.assign(call,{status:'received',providerRequestId:audio.requestId,actualCharacters:job.characters,audioSha256:entry.audioSha256,duration:entry.duration});
        await atomicJson(LEDGER,ledger);
        check(!(await stat(job.file)),'EXISTING_AUDIO_WILL_NOT_BE_OVERWRITTEN');
        await fs.rename(temporary,job.file); temporary = undefined;
        cache.manifest.books[job.id] = {ko:entry}; await atomicJson(MANIFEST,cache.manifest);
        call.status = 'completed'; call.completedAt = new Date().toISOString();
        ledger.actualSuccessfulCharacters += job.characters; ledger.estimatedSuccessfulMicros += job.reservedMicros;
        await atomicJson(LEDGER,ledger);
        console.log(JSON.stringify({result:'SAVED',bookId:job.id,duration:entry.duration,characters:job.characters,cumulativeRequests:ledger.calls.length,reservedUsd:usd(ledger.reservedMicros)}));
      } catch(error) {
        Object.assign(call,{status:'failed_or_unknown',code:code(error),stoppedAt:new Date().toISOString()}); ledger.halted = true;
        await atomicJson(LEDGER,ledger); // Unknown/failed calls retain the full reservation.
        if(temporary) await fs.unlink(temporary).catch(()=>{});
        throw new Stop(call.code); // First failure ends the run. No retry/next book.
      }
    }
    console.log(JSON.stringify({result:firstOnly?'FIRST_BOOK_COMPLETE':'COMPLETE',cached:cache.cached.length,cumulativeRequests:ledger.calls.length,
      reservedUsd:usd(ledger.reservedMicros),successfulCharacters:ledger.actualSuccessfulCharacters,estimatedSuccessfulUsd:usd(ledger.estimatedSuccessfulMicros),invoiceVerified:false}));
  } finally { await lock.close(); const owner=await readJson(LOCK,true); if(owner?.runId===runId) await fs.unlink(LOCK); }
}

async function main() {
  const args = process.argv.slice(2);
  check(new Set(args).size===args.length && args.every(a=>['--dry-run','--execute-approved','--first-book-only','--help'].includes(a)), 'UNKNOWN_ARGUMENT_NO_BYPASS');
  check(!args.includes('--first-book-only') || args.includes('--execute-approved'),'FIRST_BOOK_FLAG_REQUIRES_APPROVED_EXECUTION');
  check(!(args.includes('--dry-run') && args.includes('--execute-approved')),'CONFLICTING_MODES');
  if(args.includes('--help')) { console.log('Default/--dry-run: no keys, network, locks or writes. --execute-approved [--first-book-only]: separately recorded user TTS approval required. Max 10 requests / US$1 cumulative; no retries, ledger resets, production use or model fallback. tts-1-hd retires 2027-01-06.'); return; }
  const prepared = await prepare(), cache = await cacheState(prepared.jobs);
  const cost = cache.pending.reduce((sum,job)=>sum+job.reservedMicros,0);
  check(cache.pending.length <= MAX_CALLS && cost <= MAX_MICROS,'PLANNED_SCOPE_EXCEEDS_HARD_LIMIT');
  if(!args.includes('--execute-approved')) {
    console.log(JSON.stringify({mode:'DRY_RUN_ONLY',keysRead:false,networkRequests:0,filesWritten:0,provider:'openai',endpoint:ENDPOINT,
      model:MODEL,voice:VOICE,responseFormat:FORMAT,speed:SPEED,totalBooks:prepared.jobs.length,totalCharacters:prepared.jobs.reduce((n,j)=>n+j.characters,0),
      cachedBooks:cache.cached,plannedRequests:cache.pending.length,estimatedAdditionalUsd:usd(cost),usdPerMillionCharacters:30,
      hardMaximumRequests:MAX_CALLS,hardMaximumUsd:1,shutdownDate:'2027-01-06',corpusSha256:prepared.corpusSha256,
      inputs:prepared.jobs.map(j=>({bookId:j.id,characters:j.characters,sha256:j.sha256,estimatedUsd:usd(j.reservedMicros),cached:cache.cached.includes(j.id)})),
      requiredApprovalFile:'.local/ai-narration/approval.json',
      approvalTemplate:{version:1,userApproved:false,approvedBy:'user',approvalId:'',approvalStatement:'',approvedAt:'',expiresAt:'',
        environment:'local-development',purpose:PURPOSE,provider:'openai',endpoint:ENDPOINT,model:MODEL,voice:VOICE,responseFormat:FORMAT,
        speed:SPEED,locale:'ko',corpusSha256:prepared.corpusSha256,bookIds:IDS,usdPerMillionCharacters:30,maxRequests:MAX_CALLS,maxUsd:1,automaticRetries:0,recurringCharges:false},
      environmentKeyContract:'.env.local / OPENAI_API_KEY; loaded through @next/env only after approval and reservation',pricingSources:narrationModelMetadata.sources},null,2));
    return;
  }
  await execute(prepared,args.includes('--first-book-only'));
}
main().catch(error=>{console.error(`AI_NARRATION_STOPPED: ${code(error)}`);process.exitCode=1;});
