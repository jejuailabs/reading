export type Locale = "ko" | "en";
export type Theme = "light" | "dark";
export type Role = "student" | "teacher" | "admin";
export type Activity = "read" | "question" | "discuss" | "theater" | "studio";
export type Artwork = "coast" | "forest" | "night" | "mail";
export type StoryPage = { text: string; en: string; art: Artwork; imageDataUrl?: string };
export type BookSource = {kind: "text" | "pdf" | "images" | "paper" | "link"; author: string; url?: string; rights: "own" | "permission" | "reference"; coverage: "full" | "excerpt" | "metadata"; note: string};
export type Bookmark = {id: string; bookId: string; bookRevision: number; page: number; label: string; createdAt: string};
export type ReaderMode = "both" | "text" | "pictures";
export type Book = {
  id: string; title: string; en: string; subtitle: string; subtitleEn: string;
  tag: string; tagEn: string; art: Artwork; color: string; pages: StoryPage[]; revision: number;
  collection?: "korean" | "aesop";
  gradeBand?: string;
  retelling?: boolean;
  source?: BookSource;
  guide?: {kind: "notice" | "infer" | "wonder"; text: string; en: string}[];
};
export type QuestionHistoryEntry = {text: string; reason: string; at: string; revision: number};
export const MAX_QUESTION_HISTORY = 100;
export type Question = { id: string; text: string; answer: string; bookId: string | null; page: number | null; shared: boolean; revision: number; origin: "mine" | "sample"; history?: QuestionHistoryEntry[] };
export type Project = { id: string; title: string; pages: StoryPage[]; activePage: number; revision: number; sourceQuestionId: string | null; kind: "student" | "teacher" };
export type LocalEvent = { id: string; type: string; at: string; resource: string };
export type PrototypeState = {
  schemaVersion: 1; locale: Locale; theme: Theme; role: Role;
  mapView: "map" | "list"; positions: Record<string, number>; readerModes: Record<string,ReaderMode>;
  questions: Question[]; questionDraft: string;
  enabled: Record<Activity, boolean>; evidence: Partial<Record<Activity, "self_report" | "paper">>;
  project: Project; projectArchive: Project[]; published: Book[]; imported: Book[]; bookmarks: Bookmark[]; journeyBookId: string;
  cast: Record<string, string>; theaterReflection: string; events: LocalEvent[];
};

export const activities: Activity[] = ["read", "question", "discuss", "theater", "studio"];
export const initialProject: Project = {
  id: "story-demo", title: "바람이 남긴 다음 편지", activePage: 0, revision: 1, sourceQuestionId: null, kind: "student",
  pages: [
    {text: "다음 날 아침, 우체통에 새로운 편지가 들어 있었어요. 봉투에는 ‘아직 만나지 못한 친구에게’라고 적혀 있었지요.", en: "The next morning, a new letter arrived. It said, ‘To a friend I have not met yet.’", art: "mail"},
    {text: "우리는 편지를 받을 친구를 상상했어요. 바닷가에 사는 친구일까요, 숲속을 좋아하는 친구일까요?", en: "We imagined who would receive it. A friend by the sea, or a friend who loves the forest?", art: "forest"},
    {text: "여기에 우리 모둠만의 다음 이야기를 적어 보세요.", en: "Write your group's next scene here.", art: "coast"},
  ],
};

export function makeInitialState(): PrototypeState {
  return {schemaVersion: 1, locale: "ko", theme: "light", role: "student", mapView: "map", positions: {}, readerModes: {},
    questions: [], questionDraft: "", enabled: {read: true, question: true, discuss: true, theater: true, studio: true}, evidence: {},
    project: structuredClone(initialProject), projectArchive: [], published: [], imported: [], bookmarks: [], journeyBookId: "wind-post", cast: {narrator: "함께 읽기", child: "모둠 1", wind: "모둠 2"}, theaterReflection: "", events: []};
}

export function recordEvent(state: PrototypeState, type: string, resource: string): PrototypeState {
  return {...state, events: [{id: crypto.randomUUID(), type, resource, at: new Date().toISOString()}, ...state.events].slice(0, 100)};
}

export function addQuestion(state: PrototypeState, input: {text: string; bookId?: string | null; page?: number | null}): PrototypeState {
  const text = input.text.trim();
  if (!text || text.length > 500) return state;
  const question: Question = {id: crypto.randomUUID(), text, answer: "", bookId: input.bookId ?? null, page: input.page ?? null, shared: false, revision: 1, origin: "mine",
    history: [{text, reason: "", at: new Date().toISOString(), revision: 1}]};
  return recordEvent({...state, questions: [question, ...state.questions], questionDraft: ""}, "question.created", question.id);
}

export function reviseQuestion(state: PrototypeState, id: string, changes: Partial<Pick<Question, "answer" | "shared">>): PrototypeState {
  return recordEvent({...state, questions: state.questions.map(q => q.id === id ? {...q, ...changes, revision: q.revision + 1} : q)}, "question.revised", id);
}

/** Only an explicit change to a learner's own question adds a growth-history entry. */
export function reviseQuestionText(state: PrototypeState, id: string, text: string, reason: string): PrototypeState {
  if (typeof text !== "string" || typeof reason !== "string" || text.length > 500 || reason.length > 300) return state;
  const nextText = text.trim();
  const question = state.questions.find(item => item.id === id);
  if (!question || question.origin !== "mine" || !nextText || nextText === question.text || !Number.isSafeInteger(question.revision + 1) || (question.history?.length ?? 1) >= MAX_QUESTION_HISTORY) return state;
  const at = new Date().toISOString();
  const history = question.history?.length ? question.history : [{text: question.text, reason: "", at, revision: question.revision}];
  const revision = question.revision + 1;
  const changed: Question = {...question, text: nextText, revision, history: [...history, {text: nextText, reason: reason.trim(), at, revision}]};
  return recordEvent({...state, questions: state.questions.map(item => item.id === id ? changed : item)}, "question.text_revised", id);
}

export function editPage(state: PrototypeState, index: number, patch: Partial<StoryPage>): PrototypeState {
  if (!state.project.pages[index]) return state;
  return {...state, project: {...state.project, revision: state.project.revision + 1, pages: state.project.pages.map((p, i) => i === index ? {...p, ...patch} : p)}};
}

export function publishProject(state: PrototypeState): PrototypeState {
  const book: Book = {id: `draft-edition-${crypto.randomUUID()}`, title: state.project.title, en: state.project.title,
    subtitle: "우리의 생각을 엮은 책", subtitleEn: "A story made from our ideas", tag: "우리 책", tagEn: "Our book", art: state.project.pages[0].art, color: "sage",
    pages: structuredClone(state.project.pages), revision: state.project.revision};
  return recordEvent({...state, published: [book, ...state.published]}, "edition.snapshot_created", book.id);
}

export function attachBook(state: PrototypeState, bookId: string): PrototypeState {
  return recordEvent({...state, journeyBookId: bookId, evidence: {}}, "journey.book_changed", bookId);
}

export function setActivityEnabled(state: PrototypeState, key: Activity, enabled: boolean): PrototypeState {
  return recordEvent({...state, enabled: {...state.enabled, [key]: enabled}}, enabled ? "journey.activity_linked" : "journey.activity_unlinked", key);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isIndex(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isRevision(value: unknown): value is number {
  return isIndex(value) && value > 0;
}

function isArtwork(value: unknown): value is Artwork {
  return value === "coast" || value === "forest" || value === "night" || value === "mail";
}

export function isSafeImage(value: unknown): value is string {
  return typeof value === "string" && value.length <= 2_800_000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(value);
}

function isPage(value: unknown): value is StoryPage {
  return isObject(value) && typeof value.text === "string" && typeof value.en === "string" && isArtwork(value.art)
    && (value.imageDataUrl === undefined || isSafeImage(value.imageDataUrl));
}

function isProject(value: unknown): value is Project {
  return isObject(value) && typeof value.id === "string" && typeof value.title === "string"
    && isRevision(value.revision) && (value.kind === "student" || value.kind === "teacher")
    && (value.sourceQuestionId === null || typeof value.sourceQuestionId === "string")
    && Array.isArray(value.pages) && value.pages.length > 0 && value.pages.every(isPage)
    && isIndex(value.activePage) && value.activePage < value.pages.length;
}

function isQuestion(value: unknown): value is Question {
  if (!isObject(value) || typeof value.id !== "string" || typeof value.text !== "string" || !value.text.trim() || value.text.length > 500
    || typeof value.answer !== "string" || typeof value.shared !== "boolean" || !isRevision(value.revision)
    || (value.origin !== "mine" && value.origin !== "sample")
    || (value.bookId !== null && typeof value.bookId !== "string") || (value.page !== null && !isIndex(value.page))) return false;
  // Old schema-v1 questions have no history. Do not fabricate their original creation time on restore.
  if (value.history === undefined) return true;
  if (!Array.isArray(value.history) || !value.history.length || value.history.length > MAX_QUESTION_HISTORY) return false;
  let previousRevision = 0;
  for (const entry of value.history) {
    if (!isObject(entry) || typeof entry.text !== "string" || !entry.text.trim() || entry.text.length > 500
      || typeof entry.reason !== "string" || entry.reason.length > 300 || typeof entry.at !== "string" || entry.at.length > 40 || !Number.isFinite(Date.parse(entry.at))
      || !isRevision(entry.revision) || entry.revision <= previousRevision || entry.revision > value.revision) return false;
    previousRevision = entry.revision;
  }
  return value.history[value.history.length - 1].text === value.text;
}

function isBook(value: unknown): value is Book {
  return isObject(value) && typeof value.id === "string" && typeof value.title === "string"
    && typeof value.en === "string" && typeof value.subtitle === "string" && typeof value.subtitleEn === "string"
    && typeof value.tag === "string" && typeof value.tagEn === "string" && typeof value.color === "string"
    && isArtwork(value.art) && isRevision(value.revision)
    && Array.isArray(value.pages) && value.pages.length > 0 && value.pages.length <= 200 && value.pages.every(isPage)
    && (value.source === undefined || (isObject(value.source) && ["text","pdf","images","paper","link"].includes(String(value.source.kind))
      && ["own","permission","reference"].includes(String(value.source.rights)) && ["full","excerpt","metadata"].includes(String(value.source.coverage))
      && typeof value.source.author === "string" && typeof value.source.note === "string"
      && (value.source.url === undefined || (typeof value.source.url === "string" && /^https?:\/\//i.test(value.source.url)))));
}

function isBookmark(value: unknown): value is Bookmark {
  return isObject(value) && typeof value.id === "string" && typeof value.bookId === "string" && isRevision(value.bookRevision)
    && isIndex(value.page) && typeof value.label === "string" && typeof value.createdAt === "string";
}

export function toggleBookmark(state: PrototypeState, book: Book, page: number): PrototypeState {
  if (!Number.isInteger(page) || page < 0 || page >= book.pages.length) return state;
  const exists = state.bookmarks.some(item => item.bookId === book.id && item.bookRevision === book.revision && item.page === page);
  const bookmarks = exists ? state.bookmarks.filter(item => !(item.bookId === book.id && item.bookRevision === book.revision && item.page === page))
    : [...state.bookmarks, {id: crypto.randomUUID(), bookId: book.id, bookRevision: book.revision, page, label: `${page + 1}`, createdAt: new Date().toISOString()}];
  return recordEvent({...state, bookmarks}, exists ? "bookmark.removed" : "bookmark.created", book.id);
}

function isEvent(value: unknown): value is LocalEvent {
  return isObject(value) && typeof value.id === "string" && typeof value.type === "string"
    && typeof value.resource === "string" && typeof value.at === "string" && Number.isFinite(Date.parse(value.at));
}

function isPositions(value: unknown): value is PrototypeState["positions"] {
  return isObject(value) && Object.values(value).every(isIndex);
}

function isEnabled(value: unknown): value is PrototypeState["enabled"] {
  if (!isObject(value)) return false;
  return activities.every(activity => typeof value[activity] === "boolean");
}

function isEvidence(value: unknown): value is PrototypeState["evidence"] {
  return isObject(value) && Object.entries(value).every(([key, evidence]) =>
    activities.some(activity => activity === key) && (evidence === "self_report" || evidence === "paper"));
}

function isCast(value: unknown): value is PrototypeState["cast"] {
  return isObject(value) && Object.values(value).every(name => typeof name === "string");
}

export function parsePrototypeState(raw: string | null): PrototypeState | null {
  const fallback = makeInitialState();
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!isObject(data) || data.schemaVersion !== 1
      || !Array.isArray(data.questions) || !data.questions.every(isQuestion)
      || !isProject(data.project) || !Array.isArray(data.published) || !data.published.every(isBook)
      || !isPositions(data.positions) || !isEnabled(data.enabled) || !isEvidence(data.evidence)
      || !isCast(data.cast) || !Array.isArray(data.events) || !data.events.every(isEvent)
      || typeof data.questionDraft !== "string" || typeof data.theaterReflection !== "string"
      || typeof data.journeyBookId !== "string") return null;

    // Earlier schema-v1 saves predate the project archive. Keep their valid work.
    const archive = data.projectArchive === undefined ? [] : data.projectArchive;
    if (!Array.isArray(archive) || !archive.every(isProject)) return null;
    const imported = data.imported ?? [];
    const bookmarks = data.bookmarks ?? [];
    if (!Array.isArray(imported) || !imported.every(isBook) || !Array.isArray(bookmarks) || !bookmarks.every(isBookmark)) return null;
    const readerModes=data.readerModes??{};
    if(!isObject(readerModes)||Object.values(readerModes).some(mode=>!["both","text","pictures"].includes(String(mode))))return null;
    const enabled = {...fallback.enabled};
    for (const activity of activities) enabled[activity] = data.enabled[activity];

    return {
      schemaVersion: 1,
      locale: data.locale === "en" ? "en" : "ko",
      theme: data.theme === "dark" ? "dark" : "light",
      role: data.role === "teacher" || data.role === "admin" ? data.role : "student",
      mapView: data.mapView === "list" ? "list" : "map",
      positions: data.positions,
      readerModes: readerModes as Record<string,ReaderMode>,
      questions: data.questions,
      questionDraft: data.questionDraft,
      enabled,
      evidence: data.evidence,
      project: data.project,
      projectArchive: archive,
      published: data.published,
      imported,
      bookmarks,
      journeyBookId: data.journeyBookId,
      cast: {...fallback.cast, ...data.cast},
      theaterReflection: data.theaterReflection,
      events: data.events,
    };
  } catch { return null; }
}

export function restoreState(raw: string | null): PrototypeState {
  return parsePrototypeState(raw) ?? makeInitialState();
}
