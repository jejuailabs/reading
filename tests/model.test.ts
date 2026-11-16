import assert from "node:assert/strict";
import test from "node:test";
import {
  addQuestion,
  attachBook,
  editPage,
  makeInitialState,
  publishProject,
  restoreState,
  reviseQuestion,
  setActivityEnabled,
} from "../src/lib/model.ts";

test("a new question stays private and retains its book and first-page evidence", () => {
  const original = makeInitialState();
  const before = structuredClone(original);
  const next = addQuestion(original, {
    text: "  바람은 왜 편지를 남겼을까?  ",
    bookId: "wind-post",
    page: 0,
  });

  assert.equal(next.questions.length, 1);
  const question = next.questions[0];
  assert.equal(question.text, "바람은 왜 편지를 남겼을까?");
  assert.equal(question.shared, false);
  assert.equal(question.origin, "mine");
  assert.equal(question.bookId, "wind-post");
  assert.equal(question.page, 0);
  assert.equal(question.answer, "");
  assert.deepEqual(original, before);

  const standalone = addQuestion(makeInitialState(), {text: "오늘 가장 궁금한 것은?"});
  assert.equal(standalone.questions[0].bookId, null);
  assert.equal(standalone.questions[0].page, null);
});

test("empty or excessive questions do not create records or clear a draft", () => {
  const state = {...makeInitialState(), questionDraft: "아직 생각하는 중"};
  const before = structuredClone(state);

  for (const text of ["", " \n\t ", "가".repeat(501)]) {
    assert.deepEqual(addQuestion(state, {text}), before);
  }
});

test("editing a page changes only the new draft and preserves the original state", () => {
  const original = makeInitialState();
  const before = structuredClone(original);
  const next = editPage(original, 1, {text: "우리 모둠은 편지를 숲으로 가져갔어요."});

  assert.deepEqual(original, before);
  assert.equal(next.project.pages[1].text, "우리 모둠은 편지를 숲으로 가져갔어요.");
  assert.equal(next.project.revision, before.project.revision + 1);
  assert.deepEqual(next.project.pages[0], before.project.pages[0]);
  assert.deepEqual(next.project.pages[2], before.project.pages[2]);
  assert.equal(next.project.pages[1].en, before.project.pages[1].en);
});

test("a published edition is a snapshot independent of later draft editing", () => {
  const draft = editPage(makeInitialState(), 0, {text: "발행할 첫 문장"});
  const published = publishProject(draft);
  const edition = structuredClone(published.published[0]);
  const revised = editPage(published, 0, {text: "발행 뒤에 고친 문장"});

  assert.equal(draft.published.length, 0);
  assert.notStrictEqual(published.published[0].pages, published.project.pages);
  assert.notStrictEqual(published.published[0].pages[0], published.project.pages[0]);
  assert.equal(edition.revision, draft.project.revision);
  assert.equal(revised.project.pages[0].text, "발행 뒤에 고친 문장");
  assert.deepEqual(revised.published[0], edition);

  const republished = publishProject(revised);
  assert.notEqual(republished.published[0].id, edition.id);
  assert.equal(republished.published[0].pages[0].text, "발행 뒤에 고친 문장");
  assert.deepEqual(republished.published[1], edition);
});

test("unlinking journey activities preserves questions, answers, drafts and editions", () => {
  let state = addQuestion(makeInitialState(), {text: "편지를 누구에게 보낼까?"});
  state = reviseQuestion(state, state.questions[0].id, {answer: "아직 만나지 못한 친구에게"});
  state = publishProject(editPage(state, 2, {text: "함께 쓴 마지막 장면"}));
  const before = structuredClone(state);

  const unlinked = setActivityEnabled(setActivityEnabled(state, "question", false), "studio", false);
  assert.equal(unlinked.enabled.question, false);
  assert.equal(unlinked.enabled.studio, false);
  assert.deepEqual(unlinked.questions, before.questions);
  assert.deepEqual(unlinked.project, before.project);
  assert.deepEqual(unlinked.published, before.published);
  assert.deepEqual(state, before);

  const relinked = setActivityEnabled(unlinked, "question", true);
  assert.deepEqual(relinked.questions, before.questions);
});

test("changing the journey book resets its evidence while retaining existing work", () => {
  let state = addQuestion(makeInitialState(), {text: "바람은 어디에서 왔을까?", bookId: "wind-post", page: 1});
  state = reviseQuestion(state, state.questions[0].id, {answer: "바다 쪽에서 왔다고 생각해요."});
  state.positions["wind-post"] = 2;
  state.evidence = {read: "self_report", question: "paper"};
  const before = structuredClone(state);
  const next = attachBook(state, "another-edition");

  assert.equal(next.journeyBookId, "another-edition");
  assert.deepEqual(next.evidence, {});
  assert.deepEqual(next.questions, before.questions);
  assert.deepEqual(next.project, before.project);
  assert.deepEqual(next.positions, before.positions);
  assert.equal(next.questions[0].bookId, "wind-post");
  assert.deepEqual(state, before);
});

test("restore rejects invalid saved data and preserves a valid saved draft", () => {
  const fallback = makeInitialState();
  const invalidValues = [
    null,
    "",
    "{broken json",
    "null",
    JSON.stringify({...fallback, schemaVersion: 2}),
    JSON.stringify({...fallback, project: {...fallback.project, pages: []}}),
    JSON.stringify({...fallback, project: {...fallback.project, pages: [null]}}),
    JSON.stringify({...fallback, questions: [{id: "broken", text: 12}]}),
  ];
  invalidValues.forEach((raw, index) => {
    assert.deepEqual(restoreState(raw), fallback, `invalid saved state case ${index}`);
  });

  let valid = addQuestion(fallback, {text: "다시 열어도 남아 있을까?", bookId: "wind-post", page: 0});
  valid = editPage(valid, 0, {text: "저장한 초안"});
  assert.deepEqual(restoreState(JSON.stringify(valid)), valid);
});

test("restore rejects corrupted nested fields used by reading, editing and journey screens", () => {
  const fallback = makeInitialState();
  const question = addQuestion(fallback, {text: "어떤 장면일까?"}).questions[0];
  const book = publishProject(fallback).published[0];
  const corruptions = {
    "null completion evidence": {...fallback, evidence: null},
    "invalid completion evidence": {...fallback, evidence: {read: "verified"}},
    "non-text question draft": {...fallback, questionDraft: null},
    "non-text cast member": {...fallback, cast: {narrator: {name: "해설"}}},
    "non-text reflection": {...fallback, theaterReflection: []},
    "invalid activity switch": {...fallback, enabled: {...fallback.enabled, read: "yes"}},
    "negative reading position": {...fallback, positions: {"wind-post": -1}},
    "invalid question origin": {...fallback, questions: [{...question, origin: "unknown"}]},
    "negative source page": {...fallback, questions: [{...question, page: -1}]},
    "missing edition metadata": {...fallback, published: [{id: book.id, title: book.title, en: book.en, pages: book.pages}]},
    "invalid artwork": {...fallback, published: [{...book, art: ["coast"]}]},
    "page outside draft": {...fallback, project: {...fallback.project, activePage: fallback.project.pages.length}},
    "invalid archived project": {...fallback, projectArchive: [{...fallback.project, pages: [null]}]},
    "null archive": {...fallback, projectArchive: null},
    "invalid event": {...fallback, events: [{type: "question.created", at: "not-a-date", resource: question.id}]},
  };

  for (const [description, data] of Object.entries(corruptions)) {
    assert.deepEqual(restoreState(JSON.stringify(data)), fallback, description);
  }
});

test("restore keeps legacy schema-v1 work when the optional archive is absent", () => {
  let saved = addQuestion(makeInitialState(), {text: "예전 질문도 남아 있을까?"});
  saved = publishProject(editPage(saved, 1, {text: "이전에 저장한 원고"}));
  const {projectArchive: _archive, ...legacy} = saved;
  const restored = restoreState(JSON.stringify({...legacy, role: "unknown", mapView: "unknown"}));

  assert.deepEqual(restored.questions, saved.questions);
  assert.deepEqual(restored.project, saved.project);
  assert.deepEqual(restored.published, saved.published);
  assert.deepEqual(restored.projectArchive, []);
  assert.equal(restored.role, "student");
  assert.equal(restored.mapView, "map");
});
