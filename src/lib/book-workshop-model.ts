import type { Artwork, Book } from "./model.ts";

export const WORKSHOP_STORAGE_KEY = "onbook.book-workshop.v1";
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_WORKSHOP_DRAFTS = 40;
export const workshopTypes = ["picture", "story", "information", "poetry", "comic", "theater"] as const;
export type WorkshopType = typeof workshopTypes[number];
export type WorkshopMode = "teacher" | "individual" | "team";
export type WorkshopStep = "prepare" | "outline" | "draft" | "edit" | "review" | "edition";
export const workshopSteps: WorkshopStep[] = ["prepare", "outline", "draft", "edit", "review", "edition"];
export const workshopArts: Artwork[] = ["coast", "forest", "night", "mail"];
export const workshopStyles = ["pencil", "watercolor", "paper", "outline"] as const;
export type WorkshopStyle = typeof workshopStyles[number];

export type WorkshopMember = { id: string; name: string; role: string };
export type WorkshopPage = {
  id: string; heading: string; plan: string; text: string; art: Artwork;
  imageDataUrl?: string; imageCredit: string; imagePrompt: string;
  sourceNote: string; contributors: string[];
};
export type WorkshopFeedback = { id: string; memberId: string; pageId: string; text: string; at: string };
export type WorkshopContribution = { id: string; memberId: string; pageId: string; summary: string; at: string };
export type WorkshopDraft = {
  id: string; revision: number; updatedAt: string; mode: WorkshopMode; step: WorkshopStep;
  title: string; topic: string; keywords: string; grade: number; type: WorkshopType;
  style: WorkshopStyle; desiredPages: number; authorName: string; teamName: string;
  members: WorkshopMember[]; activeMemberId: string;
  outline: { purpose: string; start: string; middle: string; end: string; characters: string; sources: string };
  pages: WorkshopPage[]; activePage: number; sourceQuestion: string;
  feedback: WorkshopFeedback[]; contributions: WorkshopContribution[];
  review: { text: boolean; rights: boolean; privacy: boolean; facts: boolean };
  editions: { id: string; revision: number; at: string }[];
};
export type WorkshopState = { schemaVersion: 1; activeId: string; drafts: WorkshopDraft[] };

const newId = () => crypto.randomUUID();
export const freshWorkshopReview = (): WorkshopDraft["review"] => ({ text: false, rights: false, privacy: false, facts: false });

export function createWorkshopPage(): WorkshopPage {
  return { id: newId(), heading: "", plan: "", text: "", art: "coast", imageCredit: "", imagePrompt: "", sourceNote: "", contributors: [] };
}

export function createWorkshopDraft(mode: WorkshopMode = "individual", sourceQuestion = ""): WorkshopDraft {
  const first = { id: newId(), name: mode === "teacher" ? "선생님" : "작가 1", role: "글·그림" };
  const members = mode === "team" ? [first, { id: newId(), name: "작가 2", role: "읽고 의견 주기" }] : [first];
  return {
    id: newId(), revision: 1, updatedAt: new Date().toISOString(), mode, step: "prepare",
    title: "", topic: "", keywords: "", grade: 3, type: "picture", style: "pencil", desiredPages: 4,
    authorName: "", teamName: "", members, activeMemberId: first.id,
    outline: { purpose: "", start: "", middle: "", end: "", characters: "", sources: "" },
    pages: Array.from({ length: 4 }, createWorkshopPage), activePage: 0, sourceQuestion: sourceQuestion.slice(0, 500),
    feedback: [], contributions: [], review: freshWorkshopReview(), editions: [],
  };
}

export function makeWorkshopState(): WorkshopState {
  const draft = createWorkshopDraft();
  return { schemaVersion: 1, activeId: draft.id, drafts: [draft] };
}

/** Content edits require review again. Navigation and review ticks use their own non-content update. */
export function reviseWorkshopDraft(draft: WorkshopDraft, patch: Partial<WorkshopDraft>): WorkshopDraft {
  return { ...draft, ...patch, id: draft.id, revision: draft.revision + 1, updatedAt: new Date().toISOString(), review: freshWorkshopReview() };
}

export function reviseWorkshopPage(draft: WorkshopDraft, pageId: string, patch: Partial<WorkshopPage>): WorkshopDraft {
  if (!draft.pages.some(page => page.id === pageId)) return draft;
  return reviseWorkshopDraft(draft, { pages: draft.pages.map(page => page.id === pageId ? {
    ...page, ...patch, id: page.id,
    contributors: [...new Set([...page.contributors, draft.activeMemberId])],
  } : page) });
}

/** Resizing always creates another draft: excluded pages remain in the original. */
export function forkWorkshopDraft(draft: WorkshopDraft, pageCount = draft.pages.length): WorkshopDraft {
  if (!Number.isInteger(pageCount) || pageCount < 4 || pageCount > 24) throw new Error("Page count must be between 4 and 24.");
  const copy = structuredClone(draft);
  return {
    ...copy, id: newId(), title: draft.title ? `${draft.title} (복사본)` : "", revision: 1,
    updatedAt: new Date().toISOString(), desiredPages: pageCount,
    pages: Array.from({ length: pageCount }, (_, i) => copy.pages[i] ?? createWorkshopPage()),
    activePage: Math.min(copy.activePage, pageCount - 1), review: freshWorkshopReview(), editions: [], step: "draft",
    feedback: copy.feedback.filter(item => copy.pages.slice(0, pageCount).some(page => page.id === item.pageId)),
    contributions: copy.contributions.filter(item => copy.pages.slice(0, pageCount).some(page => page.id === item.pageId)),
  };
}

export function addWorkshopDraft(state: WorkshopState, draft: WorkshopDraft): WorkshopState {
  if (state.drafts.length >= MAX_WORKSHOP_DRAFTS) throw new Error("초안 보관함이 가득 찼습니다. JSON으로 백업해 주세요.");
  if (state.drafts.some(item => item.id === draft.id)) throw new Error("Duplicate draft ID.");
  return { ...state, activeId: draft.id, drafts: [draft, ...state.drafts] };
}

const structure: Record<WorkshopType, [string, string, string]> = {
  picture: ["인물과 장소를 보여 주어요", "달라지는 일을 보여 주어요", "마지막 장면과 여운을 남겨요"],
  story: ["인물의 바람과 시작 사건", "시도·어려움·선택", "변화와 결말"],
  information: ["알아볼 질문과 범위", "근거를 확인한 설명과 예", "알게 된 점과 남은 질문"],
  poetry: ["첫 시: 소리와 장면", "다른 시: 느낌과 이미지", "마지막 시와 시인의 말"],
  comic: ["등장인물과 첫 칸", "칸마다 사건·대사·표정", "마지막 칸과 여운"],
  theater: ["등장인물과 첫 상황", "해설·대사·갈등의 변화", "마지막 대사와 함께 읽는 말"],
};

/** A deterministic planning scaffold, never presented as generated prose or an AI response. */
export function prepareScenePlans(draft: WorkshopDraft): WorkshopDraft {
  const hints = structure[draft.type];
  return reviseWorkshopDraft(draft, { pages: draft.pages.map((page, index) => {
    if (page.plan.trim()) return page;
    const part = index === 0 ? 0 : index === draft.pages.length - 1 ? 2 : 1;
    const userPlan = [draft.outline.start, draft.outline.middle, draft.outline.end][part];
    return { ...page, plan: `${hints[part]}${userPlan.trim() ? `\n나의 구상: ${userPlan.trim()}` : ""}` };
  }), step: "draft" });
}

export function makeIllustrationPrompt(draft: WorkshopDraft, page: WorkshopPage): string {
  const styles: Record<WorkshopStyle, string> = {
    pencil: "넓은 흰 여백, 가는 색연필 선, 부드러운 파스텔 색, 종이 질감",
    watercolor: "밝은 수채화, 번짐이 부드러운 색, 충분한 흰 여백",
    paper: "색종이를 겹친 질감, 단순하고 둥근 형태, 차분한 색",
    outline: "선명한 외곽선, 넓은 여백, 색칠할 수 있는 단순한 형태",
  };
  return [
    `초등 ${draft.grade}학년 읽기책 삽화. ${styles[draft.style]}.`,
    `책의 주제: ${draft.topic.trim() || "직접 입력할 주제"}. 키워드: ${draft.keywords.trim() || "미정"}.`,
    `모든 장면의 인물·소품·색 유지: ${draft.outline.characters.trim() || "인물의 모습과 반복 소품을 먼저 정하세요"}.`,
    `이 장면: ${page.plan.trim() || page.text.trim() || "장면 설명을 입력하세요"}`,
    "배경과 행동을 표현하고 그림 속 글자·로고·워터마크는 넣지 않기. 기존 캐릭터·특정 작가 모방 없이 독자적인 구성.",
  ].join("\n").slice(0, 4000);
}

export function isAllowedImageDataUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 40) return false;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  const bytes = match[2].length / 4 * 3 - (match[2].endsWith("==") ? 2 : match[2].endsWith("=") ? 1 : 0);
  if (bytes <= 0 || bytes > MAX_IMAGE_BYTES) return false;
  try {
    const prefix = atob(match[2].slice(0, 24));
    if (match[1] === "png") return prefix.startsWith("\x89PNG\r\n\x1a\n");
    if (match[1] === "jpeg") return prefix.startsWith("\xff\xd8\xff");
    return prefix.startsWith("RIFF") && prefix.slice(8, 12) === "WEBP";
  } catch { return false; }
}

export function workshopPageText(page: WorkshopPage): string {
  return [page.heading.trim(), page.text.trim()].filter(Boolean).join("\n\n");
}

export function workshopPublicationIssues(draft: WorkshopDraft): string[] {
  const issues: string[] = [];
  if (!draft.title.trim()) issues.push("제목을 적어 주세요.");
  if (draft.pages.length < 4 || draft.pages.length > 24) issues.push("책은 4~24장으로 구성해 주세요.");
  if (draft.mode === "team" && !draft.teamName.trim()) issues.push("팀 이름을 적어 주세요.");
  if (draft.mode === "team" && (draft.members.length < 2 || draft.members.some(member => !member.name.trim()))) issues.push("함께 만든 사람의 이름 또는 별명을 확인해 주세요.");
  const blanks = draft.pages.flatMap((page, i) => page.text.trim() ? [] : [i + 1]);
  if (blanks.length) issues.push(`${blanks.join(", ")}장 본문이 비어 있어요.`);
  const missingImageCredits = draft.pages.flatMap((page, i) => page.imageDataUrl && !page.imageCredit.trim() ? [i + 1] : []);
  if (missingImageCredits.length) issues.push(`${missingImageCredits.join(", ")}장 그림의 만든 사람·사용 허락을 적어 주세요.`);
  if (draft.type === "information" && !draft.outline.sources.trim() && !draft.pages.some(page => page.sourceNote.trim())) issues.push("정보책에서 참고한 자료의 제목·출처를 적어 주세요.");
  if (!draft.review.text || !draft.review.rights || !draft.review.privacy || (draft.type === "information" && !draft.review.facts)) issues.push("검토 항목을 확인해 주세요.");
  return issues;
}

export function createWorkshopEdition(draft: WorkshopDraft): Book {
  const issues = workshopPublicationIssues(draft);
  if (issues.length) throw new Error(issues.join(" "));
  const credit = draft.mode === "team" ? `${draft.teamName} · ${draft.members.map(member => member.name).join(", ")}` : draft.authorName.trim() || (draft.mode === "teacher" ? "선생님이 만든 책" : "나의 책");
  return {
    id: `workshop-${draft.id}-r${draft.revision}`, title: draft.title.trim(), en: draft.title.trim(),
    subtitle: credit, subtitleEn: credit, tag: "우리 책", tagEn: "Our book", art: draft.pages[0].art, color: "sage",
    gradeBand: `${draft.grade}학년`, revision: draft.revision,
    pages: draft.pages.map((page, index) => {
      const notes = [
        page.imageCredit.trim() ? `그림 출처: ${page.imageCredit.trim()}` : "",
        page.sourceNote.trim() ? `자료 출처: ${page.sourceNote.trim()}` : "",
        index === draft.pages.length - 1 && draft.outline.sources.trim() ? `책의 참고자료: ${draft.outline.sources.trim()}` : "",
      ].filter(Boolean);
      const content = [workshopPageText(page), ...notes].join("\n\n");
      return { text: content, en: content, art: page.art, ...(page.imageDataUrl ? { imageDataUrl: page.imageDataUrl } : {}) };
    }),
  };
}

export function createIllustrationBrief(draft: WorkshopDraft) {
  return {
    schemaVersion: 1, status: "prepared_not_generated", generationExecuted: false,
    draftId: draft.id, revision: draft.revision, title: draft.title,
    grade: draft.grade, bookType: draft.type, style: draft.style,
    characterSpecification: draft.outline.characters,
    note: "검토용 그림 제작 요청 묶음입니다. 이미지 생성·외부 전송·과금은 실행하지 않았습니다. 승인과 연결을 확인하기 전 자동 실행하지 마세요.",
    pages: draft.pages.map((page, index) => ({
      page: index + 1, pageId: page.id, heading: page.heading, text: page.text, scenePlan: page.plan,
      prompt: page.imagePrompt.trim() || makeIllustrationPrompt(draft, page),
      imageStatus: page.imageDataUrl ? "user_supplied" : "built_in_sample",
      sampleArt: page.art, imageCredit: page.imageCredit, sourceNote: page.sourceNote,
    })),
  };
}

function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function text(value: unknown, limit = 6000): value is string { return typeof value === "string" && value.length <= limit; }
function id(value: unknown): value is string { return text(value, 100) && value.length > 0; }
function integer(value: unknown, min: number, max: number): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max; }
function date(value: unknown): boolean { return text(value, 50) && Number.isFinite(Date.parse(value)); }

export function isWorkshopDraft(value: unknown): value is WorkshopDraft {
  if (!object(value) || !id(value.id) || !integer(value.revision, 1, Number.MAX_SAFE_INTEGER) || !date(value.updatedAt)
    || !["teacher", "individual", "team"].includes(value.mode as string) || !workshopSteps.includes(value.step as WorkshopStep)
    || !text(value.title, 120) || !text(value.topic, 500) || !text(value.keywords, 300) || !integer(value.grade, 1, 6)
    || !workshopTypes.includes(value.type as WorkshopType) || !workshopStyles.includes(value.style as WorkshopStyle)
    || !integer(value.desiredPages, 4, 24) || !text(value.authorName, 80) || !text(value.teamName, 80)
    || !text(value.sourceQuestion, 500) || !object(value.outline) || !["purpose", "start", "middle", "end", "characters", "sources"].every(key => text(value.outline && (value.outline as Record<string, unknown>)[key], 4000))
    || !object(value.review) || !["text", "rights", "privacy", "facts"].every(key => typeof (value.review as Record<string, unknown>)[key] === "boolean")
    || !Array.isArray(value.members) || value.members.length < 1 || value.members.length > 8
    || !value.members.every(member => object(member) && id(member.id) && text(member.name, 80) && text(member.role, 100))) return false;
  const members = value.members as WorkshopMember[];
  const memberIds = new Set(members.map(member => member.id));
  if (memberIds.size !== members.length || !memberIds.has(value.activeMemberId as string)
    || !Array.isArray(value.pages) || value.pages.length < 4 || value.pages.length > 24
    || !integer(value.activePage, 0, value.pages.length - 1)) return false;
  if (!value.pages.every(page => object(page) && id(page.id) && text(page.heading, 120) && text(page.plan, 4000)
    && text(page.text) && workshopArts.includes(page.art as Artwork) && text(page.imageCredit, 500)
    && text(page.imagePrompt, 4000) && text(page.sourceNote, 2000)
    && (page.imageDataUrl === undefined || isAllowedImageDataUrl(page.imageDataUrl))
    && Array.isArray(page.contributors) && page.contributors.every(member => memberIds.has(member)))) return false;
  const pageIds = new Set((value.pages as WorkshopPage[]).map(page => page.id));
  if (pageIds.size !== value.pages.length) return false;
  for (const field of ["feedback", "contributions"] as const) {
    const entries = value[field];
    if (!Array.isArray(entries) || entries.length > 300 || !entries.every(entry => object(entry) && id(entry.id)
      && memberIds.has(entry.memberId as string) && pageIds.has(entry.pageId as string) && date(entry.at)
      && text(entry[field === "feedback" ? "text" : "summary"], 1000))) return false;
  }
  return Array.isArray(value.editions) && value.editions.length <= 300 && value.editions.every(edition => object(edition)
    && id(edition.id) && integer(edition.revision, 1, Number.MAX_SAFE_INTEGER) && date(edition.at));
}

export function isWorkshopState(value: unknown): value is WorkshopState {
  if (!object(value) || value.schemaVersion !== 1 || !id(value.activeId) || !Array.isArray(value.drafts)
    || value.drafts.length < 1 || value.drafts.length > MAX_WORKSHOP_DRAFTS || !value.drafts.every(isWorkshopDraft)) return false;
  return new Set(value.drafts.map(draft => draft.id)).size === value.drafts.length && value.drafts.some(draft => draft.id === value.activeId);
}
