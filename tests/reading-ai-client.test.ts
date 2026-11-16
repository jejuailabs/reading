import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import ts from "typescript";

/** A tiny hook scheduler tests request lifecycle only; all fetches are in-memory mocks. */
function harness() {
  const slots: unknown[] = [];
  let cursor = 0;
  const effects: (() => void)[] = [];
  const responses: {resolve:(response:Response)=>void; signal:AbortSignal}[] = [];
  let calls = 0;
  const react = {
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value: unknown) => {slots[index] = typeof value === "function" ? value(slots[index]) : value;}];
    },
    useRef(initial: unknown) {const index = cursor++; if (!(index in slots)) slots[index] = {current:initial}; return slots[index];},
    useEffect(effect: () => void | (() => void), deps: unknown[]) {
      const index = cursor++;
      const previous = slots[index] as {deps:unknown[];cleanup?:()=>void} | undefined;
      if (!previous || deps.some((value, position) => value !== previous.deps[position])) {
        const next = {deps,cleanup:undefined as undefined | (() => void)}; slots[index] = next;
        effects.push(() => {previous?.cleanup?.(); next.cleanup = effect() || undefined;});
      }
    },
  };
  const source = readFileSync(new URL("../src/components/reading-ai.tsx",import.meta.url),"utf8") + "\nexport {useAiRequest as testRequestHook};\n";
  const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const exports: Record<string,unknown> = {};
  runInNewContext(compiled, {exports,AbortController,fetch:(_url: string,options:RequestInit) => {
    calls++;
    const input = JSON.parse(options.body as string);
    if (input.operation === "pilot-session") return Promise.resolve(Response.json({ready:true}));
    return new Promise<Response>(resolve => responses.push({resolve,signal:options.signal as AbortSignal}));
  },require:(name:string) => {
    if(name === "react") return react;
    if(name === "react/jsx-runtime") return {};
    if(name === "./provider") return {useReading:()=>({t:(ko:string)=>ko})};
    if(name === "./icons") return {};
    throw new Error(`Unexpected dependency: ${name}`);
  }}, {timeout:1000});
  type Hook = {result:unknown;pending:boolean;error:string;run:(input:unknown)=>Promise<void>};
  const render = (key:string):Hook => {cursor=0;return (exports.testRequestHook as (key:string)=>Hook)(key);};
  return {render,flush:()=>{while(effects.length)effects.shift()!();},responses,calls:()=>calls};
}
const turn = () => new Promise<void>(resolve => setImmediate(resolve));

test("explicit requests suppress duplicate clicks and hide late results after a prompt change", async () => {
  const h = harness();
  let hook = h.render("record-1:field-a:scene-1"); h.flush();
  assert.equal(h.calls(),0);
  const first = hook.run({operation:"questions"});
  void hook.run({operation:"questions"});
  await turn();
  assert.equal(h.calls(),2); // One mocked session plus one mocked operation.
  hook = h.render("record-1:field-b:scene-1");
  h.responses[0].resolve(Response.json({result:{coaching:"old field"}}));
  await first;
  assert.equal(h.render("record-1:field-b:scene-1").result,null);
  h.flush();
  hook = h.render("record-1:field-b:scene-1");
  const second = hook.run({operation:"questions"}); await turn();
  h.responses[1].resolve(Response.json({result:{coaching:"new field"}})); await second;
  assert.equal((h.render("record-1:field-b:scene-1").result as {coaching:string}).coaching,"new field");
  assert.equal(h.render("record-1:field-b:scene-2").result,null);
  h.flush();
});

test("a changed source aborts a pending request and does not retry it automatically", async () => {
  const h = harness();
  const hook = h.render("old-scene"); h.flush();
  const running = hook.run({operation:"questions"}); await turn();
  h.render("new-scene"); h.flush();
  assert.equal(h.responses[0].signal.aborted,true);
  h.responses[0].resolve(Response.json({result:{coaching:"late"}})); await running;
  assert.equal(h.render("new-scene").result,null);
  assert.equal(h.calls(),2);
});
