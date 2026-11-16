import test from "node:test";
import assert from "node:assert/strict";
import type {Book, Question} from "../src/lib/model.ts";
import {reportTemplates} from "../src/lib/report-templates.ts";
import {initialLearningNotebook, createNotebookRecord, addNotebookRecord, updateNotebookAnswer, updateNotebookSettings, importNotebookQuestion, updateNotebookImage, deleteNotebookRecord, validateLearningNotebook, MAX_NOTEBOOK_ANSWER} from "../src/lib/learning-notebook.ts";

const book: Book = {id:"test-book",title:"우리의 책",en:"Our Book",subtitle:"",subtitleEn:"",tag:"",tagEn:"",art:"forest",color:"sage",pages:[{text:"함께 책을 읽었다.",en:"We read together.",art:"forest"}],revision:3};
const template = reportTemplates.find(item => item.id === "FORM-09")!;
const question: Question = {id:"question-test",text:"왜 다른 길을 택했을까?",answer:"아직 생각 중",bookId:book.id,page:0,shared:false,revision:2,origin:"mine"};

test("a new notebook preserves edition and template snapshots without composing answers", () => {
  const mutable = structuredClone(template);
  const record = createNotebookRecord(book, mutable, "1–2", "oral");
  mutable.fields[0].label.ko = "changed";
  assert.equal(record.bookRevision, 3);
  assert.notEqual(record.template.fields[0].label.ko, "changed");
  assert.deepEqual(Object.keys(record.answers), template.fields.some(field => field.id === "book") ? ["book"] : []);
  assert.equal(record.readingRange, "");
  assert.equal(record.questionLinks.length, 0);
  assert.equal(validateLearningNotebook(addNotebookRecord(initialLearningNotebook(), record)), true);
});

test("multiple records retain independent responses and immutable source editions", () => {
  const first = createNotebookRecord(book, template);
  const second = createNotebookRecord(book, template);
  let state = addNotebookRecord(addNotebookRecord(initialLearningNotebook(), first), second);
  const field = template.fields[0].id;
  const originalAnswer = first.answers[field];
  state = updateNotebookAnswer(state, first.id, field, "나의 첫 생각");
  assert.equal(state.records.find(item => item.id === first.id)!.answers[field], "나의 첫 생각");
  assert.notEqual(state.records.find(item => item.id === second.id)!.answers[field], "나의 첫 생각");
  const changed = updateNotebookSettings(state, first.id, {readingRange:"종이책 12~18쪽", bookRevision:999} as Parameters<typeof updateNotebookSettings>[2]);
  assert.equal(changed.records.find(item => item.id === first.id)!.bookRevision, 3);
  assert.equal(changed.records.find(item => item.id === first.id)!.readingRange, "종이책 12~18쪽");
  assert.equal(first.answers[field], originalAnswer);
});

test("question import appends only a same-book question and preserves the student's source", () => {
  const record = createNotebookRecord(book, template);
  const field = template.fields[0].id;
  let state = addNotebookRecord(initialLearningNotebook(), record);
  state = updateNotebookAnswer(state, record.id, field, "내가 먼저 쓴 글");
  const imported = importNotebookQuestion(state, record.id, field, question);
  assert.equal(imported.records[0].answers[field], `내가 먼저 쓴 글\n\n${question.text}`);
  assert.deepEqual(imported.records[0].questionLinks, [{fieldId:field,questionId:question.id,questionRevision:2}]);
  assert.equal(question.answer, "아직 생각 중");
  assert.equal(importNotebookQuestion(state, record.id, field, {...question,bookId:"another-book"}), state);
  assert.equal(importNotebookQuestion(state, record.id, "not-declared", question), state);
  const full = updateNotebookAnswer(state, record.id, field, "가".repeat(MAX_NOTEBOOK_ANSWER));
  assert.equal(importNotebookQuestion(full, record.id, field, question), full);
});

test("backup validation rejects unsupported schemas, dangling selections and undeclared fields", () => {
  const state = addNotebookRecord(initialLearningNotebook(), createNotebookRecord(book, template));
  assert.equal(validateLearningNotebook(JSON.parse(JSON.stringify(state))), true);
  assert.equal(validateLearningNotebook({...state,version:2}), false);
  assert.equal(validateLearningNotebook({...state,activeRecordId:"missing"}), false);
  assert.equal(validateLearningNotebook({...state,records:[...state.records,...state.records]}), false);
  const undeclared = structuredClone(state); undeclared.records[0].answers.unknown = "unexpected";
  assert.equal(validateLearningNotebook(undeclared), false);
  const tooLong = structuredClone(state); tooLong.records[0].answers[template.fields[0].id] = "가".repeat(MAX_NOTEBOOK_ANSWER + 1);
  assert.equal(validateLearningNotebook(tooLong), false);
});

test("image attachments are confined to drawing fields and safe local image data", () => {
  const drawingTemplate = reportTemplates.find(item => item.fields.some(field => field.kind === "drawing"))!;
  const drawingField = drawingTemplate.fields.find(field => field.kind === "drawing")!;
  const otherField = drawingTemplate.fields.find(field => field.kind !== "drawing")!;
  const record = createNotebookRecord(book, drawingTemplate);
  const state = addNotebookRecord(initialLearningNotebook(), record);
  const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT1kAAAAASUVORK5CYII=";
  const withImage = updateNotebookImage(state, record.id, drawingField.id, pixel);
  assert.equal(validateLearningNotebook(withImage), true);
  assert.equal(updateNotebookImage(state, record.id, drawingField.id, "https://example.com/image.png"), state);
  assert.equal(updateNotebookImage(state, record.id, drawingField.id, "data:image/svg+xml,<svg/>"), state);
  assert.equal(updateNotebookImage(state, record.id, otherField.id, pixel), state);
  assert.deepEqual(updateNotebookImage(withImage, record.id, drawingField.id, null).records[0].images, {});
});

test("metadata books can keep manual page ranges and deleting a record preserves others", () => {
  const paperBook: Book = {...book,pages:[],source:{kind:"paper",author:"저자",rights:"reference",coverage:"metadata",note:"책장에 있는 책"}};
  const record = createNotebookRecord(paperBook, template, "5–6", "paper");
  const other = createNotebookRecord(book, template);
  let state = addNotebookRecord(addNotebookRecord(initialLearningNotebook(), other), record);
  state = updateNotebookSettings(state, record.id, {readingRange:"2장 15~24쪽"});
  assert.equal(validateLearningNotebook(state), true);
  assert.equal(state.records[0].bookCoverage, "metadata");
  const deleted = deleteNotebookRecord(state, record.id);
  assert.equal(deleted.records.length, 1);
  assert.equal(deleted.records[0].id, other.id);
  assert.equal(deleted.activeRecordId, null);
  assert.equal(deleteNotebookRecord(state, "missing"), state);
});
