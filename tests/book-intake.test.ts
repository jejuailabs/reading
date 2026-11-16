import test from "node:test";
import assert from "node:assert/strict";
import {createImportedBook,textPages,safeBookUrl} from "../src/lib/book-intake.ts";
import {makeInitialState,parsePrototypeState,toggleBookmark} from "../src/lib/model.ts";
import {validateWorkspaceBackup,READING_STORAGE_KEY} from "../src/lib/workspace-backup.ts";
test("input separates scenes without executing markup and rejects oversized or missing manuscripts",()=>{
  assert.equal(textPages("첫 장면\n---\n둘째 장면").length,2);
  assert.equal(textPages("<script>doNotExecute()</script>")[0].text,"<script>doNotExecute()</script>");
  assert.throws(()=>textPages(" "));assert.throws(()=>textPages("가".repeat(200001)));
  assert.throws(()=>safeBookUrl("javascript:alert(1)"));assert.throws(()=>safeBookUrl("https://user:secret@example.com"));
});
test("metadata-only books are distinct from a permitted manuscript and retain source scope",()=>{
  const source={kind:"paper" as const,author:"저자",rights:"reference" as const,coverage:"metadata" as const,note:"종이책 12~20쪽"};
  const book=createImportedBook({title:"책",pages:[{text:"",en:"",art:"forest"}],source});
  assert.equal(book.source?.coverage,"metadata");assert.equal(book.pages[0].text,"");
  assert.throws(()=>createImportedBook({title:"책",pages:textPages("본문"),source:{...source,coverage:"full"}}));
});
test("online book registration requires a safe URL while paper-book references may omit it",()=>{
  const input={title:"온라인 책",pages:[{text:"",en:"",art:"forest" as const}],source:{kind:"link" as const,author:"저자",rights:"reference" as const,coverage:"metadata" as const,note:""}};
  assert.throws(()=>createImportedBook(input),/온라인 책 링크/);
  assert.throws(()=>createImportedBook({...input,source:{...input.source,url:"  "}}),/온라인 책 링크/);
  assert.throws(()=>createImportedBook({...input,source:{...input.source,url:"javascript:alert(1)"}}),/HTTP/);
  const book=createImportedBook({...input,source:{...input.source,url:" https://example.com/book "}});
  assert.equal(book.source?.url,"https://example.com/book");
  assert.equal(book.pages[0].text,"");
  assert.equal(createImportedBook({...input,source:{...input.source,kind:"paper"}}).source?.url,undefined);
});
test("bookmarks retain edition and are independent of last reading position",()=>{
  const book=createImportedBook({title:"책",pages:textPages("처음\n---\n다음"),source:{kind:"text",author:"나",rights:"own",coverage:"full",note:""}});
  const initial=makeInitialState();initial.imported=[book];
  const marked=toggleBookmark(initial,book,0);marked.positions[book.id]=1;
  const restored=parsePrototypeState(JSON.stringify(marked));assert.equal(restored?.bookmarks[0].page,0);assert.equal(restored?.positions[book.id],1);
  assert.equal(toggleBookmark(marked,book,0).bookmarks.length,0);
  assert.equal(toggleBookmark(marked,book,-1),marked);
});
test("backup validation rejects unknown stores and broken nested book content",()=>{
  const state=makeInitialState(); const data={format:"onbook-device-backup",version:1,createdAt:new Date().toISOString(),stores:{[READING_STORAGE_KEY]:state}};
  assert.equal(validateWorkspaceBackup(data),true);
  assert.equal(validateWorkspaceBackup({...data,stores:{secret:"not a workspace"}}),false);
  assert.equal(validateWorkspaceBackup({...data,stores:{[READING_STORAGE_KEY]:{...state,bookmarks:[{page:-1}]}}}),false);
});
