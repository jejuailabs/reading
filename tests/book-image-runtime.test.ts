import assert from "node:assert/strict";
import {createHash,randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {mkdir,mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {tmpdir} from "node:os";
import path from "node:path";
import test,{after,afterEach} from "node:test";
import {runInNewContext} from "node:vm";
import ts from "typescript";

type Runtime=typeof import("../src/lib/server/book-image-runtime.ts");
type TextRuntime=typeof import("../src/lib/server/reading-ai-runtime.ts");
type Core=typeof import("../src/lib/server/reading-ai.ts");
type Route=typeof import("../src/app/api/book-image/route.ts");
const builtins=createRequire(import.meta.url),effects={network:0,environment:0};
function load<T>(relative:string,dependencies:Record<string,unknown>={}):T{
  const code=ts.transpileModule(readFileSync(new URL(relative,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const exports={};
  runInNewContext(code,{exports,Request,Response,URL,Buffer,AbortSignal,
    process:Object.defineProperty({},"env",{get(){effects.environment++;throw Error("Real environment access forbidden");}}),
    fetch:()=>{effects.network++;throw Error("Real network forbidden");},
    require:(name:string)=>{if(name==="server-only")return {};if(Object.hasOwn(dependencies,name))return dependencies[name];if(["node:crypto","node:fs/promises","node:path"].includes(name))return builtins(name);throw Error("Unexpected dependency");},
  },{timeout:1000,filename:relative});return exports as T;
}
const core=load<Core>("../src/lib/server/reading-ai.ts");
const textRuntime=load<TextRuntime>("../src/lib/server/reading-ai-runtime.ts",{"./reading-ai":core});
const runtime=load<Runtime>("../src/lib/server/book-image-runtime.ts",{"./reading-ai-runtime":textRuntime});
const route=load<Route>("../src/app/api/book-image/route.ts",{"@/lib/server/book-image-runtime":runtime});
const temporaryRoot=await mkdtemp(path.join(tmpdir(),"reading-image-pilot-test-"));let number=0;
const directory=()=>path.join(temporaryRoot,`case-${number++}`);
const NOW=Date.parse("2026-11-16T04:00:00.000Z");
const env={NODE_ENV:"development",READING_IMAGE_PILOT_ENABLED:"true",READING_IMAGE_PILOT_APPROVED_AT:"2026-11-16T03:00:00.000Z",READING_IMAGE_PILOT_EXPIRES_AT:"2026-11-17T03:00:00.000Z",READING_IMAGE_PILOT_SESSION_SECRET:"b".repeat(64),OPENAI_API_KEY:"synthetic-not-a-provider-key"};
const hash=(value:string)=>createHash("sha256").update(value).digest("hex");
const codeIs=(code:string)=>(error:unknown)=>Boolean(error&&typeof error==="object"&&"code" in error&&error.code===code);
function request(value:unknown,cookie="",headers:Record<string,string>={}){return new Request("http://127.0.0.1:3100/api/book-image",{method:"POST",headers:{host:"127.0.0.1:3100",origin:"http://127.0.0.1:3100","sec-fetch-site":"same-origin","content-type":"application/json",cookie,...headers},body:JSON.stringify(value)});}
function dependencies(fetchImpl?:typeof fetch){return {env:{...env},now:()=>NOW,ledgerDirectory:directory(),fetchImpl};}
const input=(prompt="A fictional child finds a letter by the sea.")=>({operation:"generate-image",prompt,idempotencyKey:randomUUID()});
async function session(deps:ReturnType<typeof dependencies>){const response=await runtime.handleBookImagePost(request({operation:"image-session"}),deps);assert.equal(response.status,200);const cookie=response.headers.get("set-cookie")!;assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);assert.match(cookie,/Path=\/api\/book-image/);return cookie.split(";",1)[0];}
// Deliberately synthetic JPEG framing: tests contract/transport, not image visual quality.
function provider(){return Response.json({data:[{b64_json:Buffer.from([255,216,255,217]).toString("base64")}],output_format:"jpeg",quality:"medium",size:"1024x1024",usage:{input_tokens:100,input_tokens_details:{text_tokens:100,image_tokens:0},output_tokens:1062,total_tokens:1162}});}
afterEach(()=>{assert.equal(effects.network,0);assert.equal(effects.environment,0);});
after(async()=>{const target=path.resolve(temporaryRoot),base=path.resolve(tmpdir());assert.ok(target.startsWith(base+path.sep)&&path.basename(target).startsWith("reading-image-pilot-test-"));await rm(target,{recursive:true,force:true});});

test("image approval is independent, defaults off, and GET never reads environment or exposes key state",async()=>{
  let calls=0;const transport:typeof fetch=async()=>{calls++;return provider();};
  for(const change of [{READING_IMAGE_PILOT_ENABLED:undefined,READING_AI_PILOT_ENABLED:"true"},{NODE_ENV:"production"},{VERCEL:"1"},{READING_IMAGE_PILOT_EXPIRES_AT:new Date(NOW-1).toISOString()},{READING_IMAGE_PILOT_EXPIRES_AT:new Date(NOW+2*86400000).toISOString()},{READING_IMAGE_PILOT_SESSION_SECRET:""}]){
    const deps=dependencies(transport);Object.assign(deps.env,change);const response=await runtime.handleBookImagePost(request({operation:"image-session"}),deps);
    assert.equal(response.status,503);const body=await response.json();assert.equal(body.code,"IMAGE_APPROVAL_REQUIRED");assert.deepEqual(Object.keys(body).sort(),["code","error"]);await assert.rejects(readFile(path.join(deps.ledgerDirectory,"ledger.json")),/ENOENT/);
  }
  const disabled={NODE_ENV:"development",READING_IMAGE_PILOT_ENABLED:"false"};Object.defineProperty(disabled,"OPENAI_API_KEY",{get(){throw Error("Disabled path read key");}});
  assert.throws(()=>runtime.imagePilotConfig(disabled,NOW),codeIs("IMAGE_APPROVAL_REQUIRED"));
  assert.equal((await route.GET()).status,503);assert.equal(calls,0);
});

test("remote origin, missing image cookie, and text-pilot cookies cannot create an image",async()=>{
  let calls=0;const deps=dependencies(async()=>{calls++;return provider();});
  const badHeaders:Record<string,string>[]=[{origin:"https://outside.example"},{"sec-fetch-site":"cross-site"},{"x-forwarded-for":"203.0.113.4"}];
  for(const headers of badHeaders) assert.equal((await runtime.handleBookImagePost(request({operation:"image-session"},"",headers),deps)).status,403);
  assert.equal((await runtime.handleBookImagePost(request(input(),`reading_ai_pilot=${"a".repeat(64)}`),deps)).status,403);
  assert.equal(calls,0);
});

test("closed input and fixed request prevent model, quality, batch, and prompt-size escalation",()=>{
  const valid=runtime.validateImageInput(input("가".repeat(2000)));const body=runtime.buildBookImageRequest(valid);
  assert.equal(body.model,"gpt-image-1.5");assert.equal(body.n,1);assert.equal(body.quality,"medium");assert.equal(body.size,"1024x1024");assert.equal(body.output_format,"jpeg");assert.equal(body.output_compression,80);assert.equal(body.moderation,"auto");assert.equal(body.stream,false);
  assert.throws(()=>runtime.validateImageInput(input("가".repeat(2001))),codeIs("IMAGE_INPUT_INVALID"));
  assert.throws(()=>runtime.validateImageInput({...input(),model:"another-model"}),codeIs("IMAGE_INPUT_INVALID"));
  assert.throws(()=>runtime.validateImageInput({...input(),n:2}),codeIs("IMAGE_INPUT_INVALID"));
  const reservation=runtime.imageReservation(body);assert.equal(reservation.reservedMicros,(Buffer.byteLength(JSON.stringify(body),"utf8")*2+4096)*5+34000);
});

test("reservation exists before synthetic transport, success stores only usage, and duplicates never call again",async()=>{
  let calls=0;const deps=dependencies();deps.fetchImpl=async(url,init)=>{
    calls++;assert.equal(url,"https://api.openai.com/v1/images/generations");assert.equal(init?.redirect,"error");
    const ledger=JSON.parse(await readFile(path.join(deps.ledgerDirectory,"ledger.json"),"utf8"));assert.equal(ledger.calls[0].status,"reserved");assert.ok(ledger.reservedMicros>34000);
    const body=JSON.parse(String(init?.body));assert.equal(body.n,1);assert.equal(body.model,"gpt-image-1.5");return provider();
  };
  const cookie=await session(deps),value=input();const response=await runtime.handleBookImagePost(request(value,cookie),deps);assert.equal(response.status,200);
  const body=await response.json();assert.match(body.result.dataUrl,/^data:image\/jpeg;base64,/);assert.equal(body.usage.callsUsed,1);
  const saved=await readFile(path.join(deps.ledgerDirectory,"ledger.json"),"utf8");const ledger=JSON.parse(saved);assert.equal(ledger.calls[0].status,"completed");assert.equal(ledger.reservedMicros,ledger.calls[0].reservedMicros);
  for(const secret of [value.prompt,env.OPENAI_API_KEY,body.result.dataUrl])assert.ok(!saved.includes(secret));
  assert.equal((await runtime.handleBookImagePost(request(value,cookie),deps)).status,409);
  assert.equal((await runtime.handleBookImagePost(request({...value,prompt:"A different scene"},cookie),deps)).status,409);assert.equal(calls,1);
});

test("unknown outcomes retain reservations, block the same prompt, and never retry automatically",async()=>{
  let calls=0;const deps=dependencies(async()=>{calls++;throw Error("synthetic timeout");}),cookie=await session(deps),value=input();
  const response=await runtime.handleBookImagePost(request(value,cookie),deps);assert.equal(response.status,502);
  const ledger=JSON.parse(await readFile(path.join(deps.ledgerDirectory,"ledger.json"),"utf8"));assert.equal(ledger.calls[0].status,"unknown");assert.ok(ledger.reservedMicros>0);
  assert.equal((await runtime.handleBookImagePost(request({...value,idempotencyKey:randomUUID()},cookie),deps)).status,409);assert.equal(calls,1);
});

test("eight-call and one-dollar limits are independent and persisted",async()=>{
  const config=runtime.imagePilotConfig(env,NOW),store=new runtime.ImagePilotLedger(directory());
  for(let i=0;i<8;i++)await store.reserve(config,hash(`id-${i}`),hash(`prompt-${i}`),{inputTokenUpperBound:10000,reservedMicros:84000},NOW);
  await assert.rejects(store.reserve(config,hash("id-9"),hash("prompt-9"),{inputTokenUpperBound:10000,reservedMicros:84000},NOW),codeIs("IMAGE_LIMIT_REACHED"));
  const budget=new runtime.ImagePilotLedger(directory());await budget.reserve(config,hash("first"),hash("first-prompt"),{inputTokenUpperBound:100000,reservedMicros:600000},NOW);
  await assert.rejects(budget.reserve(config,hash("second"),hash("second-prompt"),{inputTokenUpperBound:100000,reservedMicros:500000},NOW),codeIs("IMAGE_LIMIT_REACHED"));
});

test("simultaneous reservations cannot exceed budget; stale locks and corrupted ledgers are not reset",async()=>{
  const config=runtime.imagePilotConfig(env,NOW),folder=directory(),store=new runtime.ImagePilotLedger(folder);
  const outcomes=await Promise.allSettled([0,1].map(i=>store.reserve(config,hash(`parallel-${i}`),hash(`scene-${i}`),{inputTokenUpperBound:100000,reservedMicros:600000},NOW)));
  assert.equal(outcomes.filter(item=>item.status==="fulfilled").length,1);
  assert.equal(JSON.parse(await readFile(path.join(folder,"ledger.json"),"utf8")).reservedMicros,600000);
  await writeFile(path.join(folder,"ledger.json"),"{corrupted");await assert.rejects(store.reserve(config,hash("next"),hash("next-scene"),{inputTokenUpperBound:1000,reservedMicros:39000},NOW),codeIs("IMAGE_LEDGER_INVALID"));
  assert.equal(await readFile(path.join(folder,"ledger.json"),"utf8"),"{corrupted");
  const locked=directory();await mkdir(locked);await writeFile(path.join(locked,"ledger.lock"),"");await assert.rejects(new runtime.ImagePilotLedger(locked).reserve(config,hash("lock"),hash("scene"),{inputTokenUpperBound:1000,reservedMicros:39000},NOW),codeIs("IMAGE_BUSY"));
});

test("provider failures and unexpected image payloads retain one reservation without fallback",async()=>{
  const results=[()=>new Response("synthetic failure",{status:503}),()=>Response.json({data:[{url:"https://example.com/image.jpg"}]}),()=>Response.json({data:[{b64_json:"/9j/2Q=="},{b64_json:"/9j/2Q=="}]}),()=>Response.json({data:[{b64_json:"/9j/2Q=="}],quality:"high"})];
  for(const result of results){let calls=0;const deps=dependencies(async()=>{calls++;return result();}),cookie=await session(deps);assert.equal((await runtime.handleBookImagePost(request(input(),cookie),deps)).status,502);const ledger=JSON.parse(await readFile(path.join(deps.ledgerDirectory,"ledger.json"),"utf8"));assert.equal(ledger.calls.length,1);assert.ok(["failed","unknown"].includes(ledger.calls[0].status));assert.ok(ledger.reservedMicros>0);assert.equal(calls,1);}
});
