import type {Book, Question} from "./model";
import type {ReportTemplate} from "./report-templates";

export const LEARNING_NOTEBOOK_KEY = "onbook:learning-notebook:v1";
export const MAX_NOTEBOOK_RECORDS = 100;
export const MAX_NOTEBOOK_ANSWER = 6000;
export type NotebookGrade = "1–2" | "3–4" | "5–6";
export type NotebookMode = "writing" | "oral" | "paper";
export type NotebookRecord = {
  id: string; bookId: string; bookRevision: number; bookTitle: string; bookTitleEn: string;
  bookCoverage: "full" | "excerpt" | "metadata";
  template: ReportTemplate; label: string; gradeBand: NotebookGrade; recordingMode: NotebookMode;
  readingRange: string; answers: Record<string, string>; images: Record<string, string>;
  questionLinks: {fieldId: string; questionId: string; questionRevision: number}[];
  createdAt: string; updatedAt: string; revision: number;
};
export type LearningNotebook = {version: 1; records: NotebookRecord[]; activeRecordId: string | null};
export const initialLearningNotebook = (): LearningNotebook => ({version: 1, records: [], activeRecordId: null});

export function createNotebookRecord(book: Book, template: ReportTemplate, gradeBand: NotebookGrade = "3–4", recordingMode: NotebookMode = "writing"): NotebookRecord {
  const now = new Date().toISOString();
  const answers: Record<string, string> = {};
  if (template.fields.some(field => field.id === "book")) answers.book = `${book.title}${book.source?.author ? ` · ${book.source.author}` : ""} · v${book.revision}`;
  return {id: `note-${crypto.randomUUID()}`, bookId: book.id, bookRevision: book.revision,
    bookTitle: book.title, bookTitleEn: book.en || book.title, bookCoverage: book.source?.coverage ?? "full",
    template: structuredClone(template), label: template.title.ko, gradeBand, recordingMode,
    readingRange: "", answers, images: {}, questionLinks: [], createdAt: now, updatedAt: now, revision: 1};
}

export function addNotebookRecord(state: LearningNotebook, record: NotebookRecord): LearningNotebook {
  if (state.records.length >= MAX_NOTEBOOK_RECORDS || state.records.some(item => item.id === record.id)) return state;
  return {...state, records: [record, ...state.records], activeRecordId: record.id};
}

function changeRecord(state: LearningNotebook, id: string, change: (record: NotebookRecord) => NotebookRecord): LearningNotebook {
  const index = state.records.findIndex(record => record.id === id);
  if (index < 0) return state;
  const previous = state.records[index];
  const changed = change(previous);
  if (changed === previous) return state;
  return {...state, records: state.records.map((record, position) => position === index ? {...changed, revision: previous.revision + 1, updatedAt: new Date().toISOString()} : record)};
}

export function updateNotebookAnswer(state: LearningNotebook, id: string, fieldId: string, value: string): LearningNotebook {
  if (typeof value !== "string" || value.length > MAX_NOTEBOOK_ANSWER) return state;
  return changeRecord(state, id, record => record.template.fields.some(field => field.id === fieldId) && record.answers[fieldId] !== value
    ? {...record, answers: {...record.answers, [fieldId]: value}} : record);
}

export function updateNotebookSettings(state: LearningNotebook, id: string, patch: Partial<Pick<NotebookRecord, "label" | "gradeBand" | "recordingMode" | "readingRange">>): LearningNotebook {
  if (patch.label !== undefined && (typeof patch.label !== "string" || patch.label.length > 160)) return state;
  if (patch.readingRange !== undefined && (typeof patch.readingRange !== "string" || patch.readingRange.length > 400)) return state;
  if (patch.gradeBand !== undefined && !["1–2", "3–4", "5–6"].includes(patch.gradeBand)) return state;
  if (patch.recordingMode !== undefined && !["writing", "oral", "paper"].includes(patch.recordingMode)) return state;
  const safe = Object.fromEntries(Object.entries(patch).filter(([key]) => ["label", "gradeBand", "recordingMode", "readingRange"].includes(key)));
  return changeRecord(state, id, record => ({...record, ...safe}));
}

export function importNotebookQuestion(state: LearningNotebook, id: string, fieldId: string, question: Question): LearningNotebook {
  return changeRecord(state, id, record => {
    if (question.bookId !== record.bookId || !record.template.fields.some(field => field.id === fieldId) || !question.text.trim()) return record;
    const current = record.answers[fieldId] ?? "";
    const answer = current.trim() ? `${current}\n\n${question.text}` : question.text;
    if (answer.length > MAX_NOTEBOOK_ANSWER) return record;
    return {...record, answers: {...record.answers, [fieldId]: answer}, questionLinks: [...record.questionLinks.filter(link => link.fieldId !== fieldId || link.questionId !== question.id), {fieldId, questionId: question.id, questionRevision: question.revision}]};
  });
}

export function isNotebookImage(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2_800_000) return false;
  return /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(value) || /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value);
}

export function updateNotebookImage(state: LearningNotebook, id: string, fieldId: string, value: string | null): LearningNotebook {
  if (value !== null && !isNotebookImage(value)) return state;
  return changeRecord(state, id, record => {
    if (!record.template.fields.some(field => field.id === fieldId && field.kind === "drawing")) return record;
    const images = {...record.images};
    if (value === null) delete images[fieldId]; else images[fieldId] = value;
    return {...record, images};
  });
}

export function deleteNotebookRecord(state: LearningNotebook, id: string): LearningNotebook {
  const records = state.records.filter(record => record.id !== id);
  return records.length === state.records.length ? state : {...state, records, activeRecordId: state.activeRecordId === id ? null : state.activeRecordId};
}

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const shortText = (value: unknown, limit = 1000): value is string => typeof value === "string" && value.length <= limit;
const revision = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;
const bilingual = (value: unknown): boolean => object(value) && shortText(value.ko, 2000) && shortText(value.en, 2000);
const identifier = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,180}$/.test(value) && !["constructor", "prototype", "__proto__"].includes(value);
const date = (value: unknown): boolean => typeof value === "string" && value.length < 40 && Number.isFinite(Date.parse(value));

export function validateLearningNotebook(value: unknown): value is LearningNotebook {
  if (!object(value) || value.version !== 1 || !Array.isArray(value.records) || value.records.length > MAX_NOTEBOOK_RECORDS) return false;
  const ids = new Set<string>();
  for (const record of value.records) {
    if (!object(record) || !identifier(record.id) || ids.has(record.id) || !identifier(record.bookId) || !revision(record.bookRevision) || !revision(record.revision)) return false;
    ids.add(record.id);
    if (!shortText(record.bookTitle) || !shortText(record.bookTitleEn) || !shortText(record.label, 160) || !shortText(record.readingRange, 400) || !date(record.createdAt) || !date(record.updatedAt)) return false;
    if (!["full", "excerpt", "metadata"].includes(String(record.bookCoverage)) || !["1–2", "3–4", "5–6"].includes(String(record.gradeBand)) || !["writing", "oral", "paper"].includes(String(record.recordingMode))) return false;
    const template = record.template;
    if (!object(template) || typeof template.id !== "string" || !/^FORM-(0[1-9]|1[0-9]|20)$/.test(template.id) || !revision(template.revision) || !bilingual(template.title) || !bilingual(template.description)) return false;
    if (!["select", "before", "during", "inquiry", "discuss", "after", "perform", "create", "reflect"].includes(String(template.stage)) || !Array.isArray(template.audience) || !template.audience.length || template.audience.some(item => !["student", "teacher", "group", "family"].includes(item))) return false;
    if (!Array.isArray(template.fields) || !template.fields.length || template.fields.length > 30) return false;
    const fields = new Set<string>(); const drawings = new Set<string>();
    for (const field of template.fields) {
      if (!object(field) || !identifier(field.id) || fields.has(field.id) || !bilingual(field.label) || !bilingual(field.prompt) || !["short", "long", "drawing", "table"].includes(String(field.kind)) || !Number.isInteger(field.rows) || (field.rows as number) < 1 || (field.rows as number) > 12) return false;
      fields.add(field.id); if (field.kind === "drawing") drawings.add(field.id);
    }
    if (!object(record.answers) || Object.entries(record.answers).some(([key, answer]) => !fields.has(key) || !shortText(answer, MAX_NOTEBOOK_ANSWER))) return false;
    if (!object(record.images) || Object.entries(record.images).some(([key, image]) => !drawings.has(key) || !isNotebookImage(image))) return false;
    if (!Array.isArray(record.questionLinks) || record.questionLinks.length > 1000 || record.questionLinks.some(link => !object(link) || !fields.has(String(link.fieldId)) || !identifier(link.questionId) || !revision(link.questionRevision))) return false;
  }
  return value.activeRecordId === null || (typeof value.activeRecordId === "string" && ids.has(value.activeRecordId));
}
