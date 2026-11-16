import test from "node:test";
import assert from "node:assert/strict";
import {scopedStorageKey,workspaceHref,workspaceMode} from "../src/lib/workspace-routing.ts";

test("activity links remain in the demo or authenticated workspace",()=>{
  for(const mode of ["demo","app"] as const){
    assert.equal(workspaceHref("/",mode),`/${mode}`);
    assert.equal(workspaceHref("/learn/heungbu?form=FORM-09",mode),`/${mode}/learn/heungbu?form=FORM-09`);
    assert.equal(workspaceHref("/inquiry?book=wind-post#mine",mode),`/${mode}/inquiry?book=wind-post#mine`);
  }
  assert.equal(workspaceMode("/app/library"),"app");
  assert.equal(workspaceMode("/application"),"demo");
});

test("explicit destinations and external URLs are not double-prefixed",()=>{
  for(const href of ["/demo/library","/app/library","/login?next=%2Fapp","/api/auth/session","https://example.com/book","#questions"]){
    assert.equal(workspaceHref(href,"app"),href);
  }
});

test("all account stores are isolated from demo and other users",()=>{
  for(const key of ["onbook:reading:local:v2","onbook:workshop:v1","onbook:learning:v1"]){
    assert.equal(scopedStorageKey(key,"demo"),key);
    assert.notEqual(scopedStorageKey(key,"user-one"),key);
    assert.notEqual(scopedStorageKey(key,"user-one"),scopedStorageKey(key,"user-two"));
  }
  assert.notEqual(scopedStorageKey("c","a:b"),scopedStorageKey("b:c","a"));
});
