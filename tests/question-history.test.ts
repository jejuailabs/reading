import test from "node:test";
import assert from "node:assert/strict";
import {addQuestion,makeInitialState,reviseQuestion,reviseQuestionText,parsePrototypeState,MAX_QUESTION_HISTORY} from "../src/lib/model.ts";

const originalText = "바람은 왜 편지를 남겼을까?";
const changedText = "바람이 편지를 남긴 까닭을 어떤 장면에서 찾을 수 있을까?";
const reason = "친구와 읽으며 바람의 앞선 행동을 다시 보았다.";
const initial = () => addQuestion(makeInitialState(),{text:originalText,bookId:"wind-post",page:0});

test("explicit question revision preserves its original, evidence link, answer and other questions", () => {
  let state = initial();
  const id = state.questions[0].id;
  state = reviseQuestion(state,id,{answer:"편지를 함께 읽은 장면이 단서일 것 같다.",shared:true});
  state = addQuestion(state,{text:"친구는 무엇을 느꼈을까?",bookId:"another-book",page:2});
  const before = structuredClone(state);
  const revised = reviseQuestionText(state,id,changedText,reason);
  const current = revised.questions.find(question => question.id === id)!;
  const previous = before.questions.find(question => question.id === id)!;
  assert.deepEqual(state,before);
  assert.equal(current.text,changedText);
  assert.equal(current.revision,previous.revision + 1);
  assert.equal(current.answer,previous.answer);
  assert.equal(current.bookId,"wind-post");
  assert.equal(current.page,0);
  assert.equal(current.shared,true);
  assert.deepEqual(current.history![0],previous.history![0]);
  assert.equal(current.history![1].reason,reason);
  assert.equal(current.history![1].revision,current.revision);
  assert.deepEqual(revised.questions[0],state.questions[0]);
  assert.equal(JSON.stringify(revised.events).includes(originalText),false);
  assert.equal(JSON.stringify(revised.events).includes(changedText),false);
  assert.equal(JSON.stringify(revised.events).includes(reason),false);
});

test("answer autosaves and sharing do not create question-history entries", () => {
  let state = initial();
  const id = state.questions[0].id;
  const originalHistory = structuredClone(state.questions[0].history);
  for(const answer of ["단", "단서", "단서를 찾는 중"]){state=reviseQuestion(state,id,{answer});}
  state=reviseQuestion(state,id,{shared:true});
  assert.deepEqual(state.questions[0].history,originalHistory);
  const revised=reviseQuestionText(state,id,changedText,reason);
  assert.equal(revised.questions[0].history!.length,2);
  assert.equal(revised.questions[0].history![0].revision,1);
  assert.ok(revised.questions[0].history![1].revision > 2);
  assert.ok(parsePrototypeState(JSON.stringify(revised)));
});

test("blank, oversized, unchanged, missing and sample-question edits are rejected", () => {
  const state=initial(), id=state.questions[0].id;
  for(const [text,why] of [[" \n ",reason],["가".repeat(501),reason],[changedText,"가".repeat(301)],[originalText,reason]]) {
    assert.equal(reviseQuestionText(state,id,text,why),state);
  }
  assert.equal(reviseQuestionText(state,"missing",changedText,reason),state);
  const sample={...state,questions:[{...state.questions[0],origin:"sample" as const}]};
  assert.equal(reviseQuestionText(sample,id,changedText,reason),sample);
  const optionalReason=reviseQuestionText(state,id,changedText,"");
  assert.equal(optionalReason.questions[0].history!.at(-1)!.reason,"");
});

test("legacy questions restore unchanged and preserve their old text on the first new edit", () => {
  let state=initial();const id=state.questions[0].id;
  state=reviseQuestion(state,id,{answer:"이미 적어 둔 생각"});
  const {history:_history,...legacyQuestion}=state.questions[0];
  const legacy={...state,questions:[legacyQuestion]};
  const restored=parsePrototypeState(JSON.stringify(legacy));
  assert.ok(restored);
  assert.equal(restored.questions[0].history,undefined);
  const revised=reviseQuestionText(restored,id,changedText,reason);
  assert.equal(revised.questions[0].history![0].text,originalText);
  assert.equal(revised.questions[0].history![0].revision,legacyQuestion.revision);
  assert.equal(revised.questions[0].history!.length,2);
  assert.equal(revised.questions[0].answer,"이미 적어 둔 생각");
  assert.deepEqual(parsePrototypeState(JSON.stringify(revised)),revised);
});

test("historical validation rejects damaged entries without accepting partial history", () => {
  const base=initial();
  const state=reviseQuestionText(base,base.questions[0].id,changedText,reason);
  const question=state.questions[0], first=question.history![0], last=question.history![1];
  const badHistory:unknown[]=[[],null,[first,{...last,text:""}],[first,{...last,text:"가".repeat(501)}],[first,{...last,reason:"가".repeat(301)}],
    [first,{...last,at:"not-a-date"}],[first,{...last,revision:first.revision}],[first,{...last,revision:question.revision+1}],
    [first,{...last,text:"현재 질문과 다른 문자열"}],[first,{...last,reason:null}]];
  for(const history of badHistory)assert.equal(parsePrototypeState(JSON.stringify({...state,questions:[{...question,history}]})),null);
});

test("history capacity never truncates or replaces the original question", () => {
  let state=initial();const id=state.questions[0].id;
  for(let index=1;index<MAX_QUESTION_HISTORY;index++)state=reviseQuestionText(state,id,`질문을 다시 생각한 기록 ${index}`,"");
  assert.equal(state.questions[0].history!.length,MAX_QUESTION_HISTORY);
  assert.equal(state.questions[0].history![0].text,originalText);
  assert.equal(reviseQuestionText(state,id,"한도를 넘긴 수정",reason),state);
  assert.ok(parsePrototypeState(JSON.stringify(state)));
});
