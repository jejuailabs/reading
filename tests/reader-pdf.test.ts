import test from "node:test";
import assert from "node:assert/strict";
import {readerPdfPages,pdfImageDimensions,uploadedPdfImage} from "../src/lib/reader-pdf.ts";
import {createImportedBook,textPages} from "../src/lib/book-intake.ts";
import {makeInitialState} from "../src/lib/model.ts";
import {makeWorkshopState,WORKSHOP_STORAGE_KEY} from "../src/lib/book-workshop-model.ts";
import {initialLearningNotebook,LEARNING_NOTEBOOK_KEY} from "../src/lib/learning-notebook.ts";
import {collectWorkspaceBackup,READING_STORAGE_KEY} from "../src/lib/workspace-backup.ts";

const imported=()=>createImportedBook({title:"PDF 원문",pages:textPages("\f첫 문장\f\f끝 문장\f"),source:{kind:"pdf",author:"나",rights:"own",coverage:"full",note:""}});
test("PDF boundaries keep blank first, middle and last source pages without adding invented images",async()=>{
  const book=imported();assert.deepEqual(book.pages.map(p=>p.text),["","첫 문장","","끝 문장",""]);
  let loads=0;const pages=await readerPdfPages(book,"ko",async()=>{loads++;return "unused";});
  assert.equal(loads,0);assert.equal(pages.length,5);assert.deepEqual(pages.map(p=>p.blank===true),[true,false,true,false,true]);
  assert.ok(pages.every(p=>!p.imageDataUrl));
});
test("reader export includes only displayed built-in art, deduplicates it and freezes the book before image loading",async()=>{
  const book=imported();delete book.source;book.pages=[{text:"원고",en:"Draft",art:"coast"},{text:"다음",en:"Next",art:"coast"}];
  let finish!:(value:string)=>void;let calls=0;
  const pending=readerPdfPages(book,"ko",async()=>{calls++;return new Promise<string>(resolve=>{finish=resolve;});});
  book.pages[0].text="changed";finish("data:image/jpeg;base64,preview");
  const pages=await pending;assert.equal(calls,1);assert.equal(pages[0].text,"원고");assert.ok(pages.every(p=>p.imageDataUrl));
  book.collection="aesop";calls=0;await readerPdfPages(book,"ko",async()=>{calls++;return "unused";});assert.equal(calls,0);
});
test("uploaded image pages become PDF-only copies without changing original data",async()=>{
  const book=imported();book.pages=[{text:"",en:"",art:"forest",imageDataUrl:"data:image/png;base64,uploaded"}];
  const original=book.pages[0].imageDataUrl;
  const pages=await readerPdfPages(book,"ko",async()=>{throw new Error("must not load sample art");},async()=>"data:image/jpeg;base64,pdfcopy");
  assert.equal(pages[0].imageDataUrl,"data:image/jpeg;base64,pdfcopy");assert.equal(pages[0].blank,undefined);
  assert.equal(book.pages[0].imageDataUrl,original);
});
test("24 image scenes use one cached conversion per source, with at most one in-flight decode",async()=>{
  const book=imported();book.pages=Array.from({length:24},(_,index)=>({text:String(index),en:"",art:"forest",imageDataUrl:`data:image/png;base64,source${index%3}`}));
  const original=JSON.stringify(book);let active=0,peak=0,calls=0;
  const pages=await readerPdfPages(book,"ko",async()=>{throw new Error("must not load sample");},async source=>{
    active++;peak=Math.max(peak,active);calls++;await Promise.resolve();active--;return `data:image/jpeg;base64,converted${source.slice(-1)}`;
  });
  assert.equal(pages.length,24);assert.equal(calls,3);assert.equal(peak,1);assert.equal(JSON.stringify(book),original);
  assert.ok(pages.every((page,index)=>page.imageDataUrl===`data:image/jpeg;base64,converted${index%3}`));
});
test("PDF copies fit a 1600px edge without upscaling and reject remote image sources",async()=>{
  assert.deepEqual(pdfImageDimensions(4000,3000),{width:1600,height:1200});
  assert.deepEqual(pdfImageDimensions(3000,4000),{width:1200,height:1600});
  assert.deepEqual(pdfImageDimensions(800,600),{width:800,height:600});
  assert.throws(()=>pdfImageDimensions(0,400));assert.throws(()=>pdfImageDimensions(10000,10000));
  await assert.rejects(uploadedPdfImage("https://example.com/image.png"));
});
test("full backup includes unopened legacy workshops and notebooks, prefers saved IDB, and rejects corrupted data",async()=>{
  const state=makeInitialState(),workshop=makeWorkshopState(),notebook=initialLearningNotebook();
  const legacy:Record<string,string>={[WORKSHOP_STORAGE_KEY]:JSON.stringify(workshop),[LEARNING_NOTEBOOK_KEY]:JSON.stringify(notebook)};
  const result=await collectWorkspaceBackup(state,async()=>null,key=>legacy[key]??null);
  assert.deepEqual(Object.keys(result.stores).sort(),[READING_STORAGE_KEY,WORKSHOP_STORAGE_KEY,LEARNING_NOTEBOOK_KEY].sort());
  assert.deepEqual(result.stores[WORKSHOP_STORAGE_KEY],workshop);
  const idb=await collectWorkspaceBackup(state,async key=>key===WORKSHOP_STORAGE_KEY?{value:workshop}:null,key=>key===WORKSHOP_STORAGE_KEY?"broken":legacy[key]??null);
  assert.deepEqual(idb.stores[WORKSHOP_STORAGE_KEY],workshop);
  await assert.rejects(collectWorkspaceBackup(state,async()=>null,()=>"broken"));
  await assert.rejects(collectWorkspaceBackup(state,async()=>null,()=>"{}"));
});
