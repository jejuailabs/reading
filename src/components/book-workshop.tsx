"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent } from "react";
import { downloadJson, useStoredState } from "@/lib/workspace-store";
import {
  WORKSHOP_STORAGE_KEY, MAX_IMAGE_BYTES, MAX_WORKSHOP_DRAFTS, workshopSteps, workshopTypes, workshopStyles, workshopArts,
  makeWorkshopState, createWorkshopDraft, createWorkshopPage, addWorkshopDraft, forkWorkshopDraft,
  reviseWorkshopDraft, reviseWorkshopPage, prepareScenePlans, makeIllustrationPrompt, isAllowedImageDataUrl,
  isWorkshopState, createWorkshopEdition, createIllustrationBrief, workshopPublicationIssues, workshopPageText,
  type WorkshopDraft, type WorkshopMode, type WorkshopStep, type WorkshopType, type WorkshopStyle, type WorkshopPage,
} from "@/lib/book-workshop-model";
import { recordEvent } from "@/lib/model";
import { useReading } from "./provider";
import { BookArtwork } from "./artwork";
import { Icon } from "./icons";
import { AiStoryPlanner } from "./reading-ai";
import { BookImageGenerator } from "./book-image-generator";
import type { StoryOutline } from "@/lib/server/reading-ai";

const typeNames: Record<WorkshopType, [string, string]> = {
  picture: ["그림책", "Picture book"], story: ["이야기책", "Storybook"], information: ["정보책", "Information book"],
  poetry: ["동시집", "Poetry collection"], comic: ["만화", "Comic"], theater: ["낭독극 대본", "Readers’ theater"],
};
const stepNames: Record<WorkshopStep, [string, string]> = {
  prepare: ["씨앗 고르기", "Begin"], outline: ["이야기 그리기", "Imagine"], draft: ["한 장씩 쓰기", "Write"],
  edit: ["그림 입히기", "Illustrate"], review: ["다시 읽기", "Read again"], edition: ["책으로 만나기", "Keep a book"],
};
const stepHints: Record<WorkshopStep, [string, string]> = {
  prepare: ["지금은 작은 생각 하나면 충분해요.", "One small idea is enough to begin."],
  outline: ["시작과 끝을 떠올리며 이야기의 길을 그려요.", "Imagine a path from the beginning to the end."],
  draft: ["잘 쓰기보다, 내 말로 한 장면부터.", "Start with one scene, in your own words."],
  edit: ["글 옆에 어울리는 그림 한 장을 놓아요.", "Place an illustration beside your words."],
  review: ["독자의 자리에서 우리 책을 읽어 봐요.", "Read your book through a reader’s eyes."],
  edition: ["함께 읽을 한 권이 생겼어요.", "A book to read together, and keep."],
};
const AI_IMAGE_CREDIT = "AI-generated illustration · OpenAI / gpt-image-1.5";
const modeNames: Record<WorkshopMode, [string, string]> = {
  teacher: ["선생님 책", "Teacher book"], individual: ["나 혼자 책", "My own book"], team: ["우리 팀 책", "Team book"],
};
const styleNames: Record<WorkshopStyle, [string, string]> = {
  pencil: ["여백 있는 색연필", "Airy colored pencil"], watercolor: ["부드러운 수채화", "Soft watercolor"],
  paper: ["종이 오리기", "Paper collage"], outline: ["단순한 선화", "Simple outlines"],
};
const artNames = { coast: ["바닷가", "Coast"], forest: ["숲", "Forest"], night: ["밤", "Night"], mail: ["편지", "Letter"] };

function imageFileData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > MAX_IMAGE_BYTES || file.size === 0) {
      reject(new Error("PNG·JPEG·WebP 이미지 한 장을 2MB 이하로 골라 주세요.")); return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("이미지를 읽지 못했어요. 다른 파일을 골라 주세요."));
    reader.onload = () => {
      if (!isAllowedImageDataUrl(reader.result)) { reject(new Error("파일의 실제 이미지 형식을 확인해 주세요.")); return; }
      const value = reader.result;
      const picture = new window.Image();
      picture.onload = () => picture.naturalWidth > 0 && picture.naturalHeight > 0 && picture.naturalWidth * picture.naturalHeight <= 25_000_000
        ? resolve(value) : reject(new Error("이미지 크기가 너무 커요. 2,500만 화소 이하로 줄여 주세요."));
      picture.onerror = () => reject(new Error("손상되었거나 지원하지 않는 이미지입니다."));
      picture.src = value;
    };
    reader.readAsDataURL(file);
  });
}

/** Same-origin built-in artwork or validated local data only. No external image service. */
async function printableImage(page: WorkshopPage): Promise<string> {
  const source = page.imageDataUrl ?? `/illustrations/pencil-v2/${page.art}.webp`;
  return new Promise((resolve, reject) => {
    const picture = new window.Image();
    picture.onload = () => {
      try {
        const scale = Math.min(1, 1600 / Math.max(picture.naturalWidth, picture.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(picture.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(picture.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("이미지 변환을 지원하지 않는 브라우저입니다.");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(picture, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      } catch { reject(new Error("PDF에 넣을 이미지를 준비하지 못했어요.")); }
    };
    picture.onerror = () => reject(new Error("PDF에 넣을 이미지를 불러오지 못했어요."));
    picture.src = source;
  });
}

export function BookWorkshop({ query = {} }: { query?: Record<string, string> }) {
  const reading = useReading();
  const { t, toast } = reading;
  const store = useStoredState(WORKSHOP_STORAGE_KEY, makeWorkshopState, isWorkshopState);
  const [newMode, setNewMode] = useState<WorkshopMode>(reading.state.role === "student" ? "individual" : "teacher");
  const [feedback, setFeedback] = useState("");
  const [contribution, setContribution] = useState("");
  const [error, setError] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [paper, setPaper] = useState<"A4" | "A5">("A5");
  const [preview, setPreview] = useState(false);
  const [showAiPlanner, setShowAiPlanner] = useState(false);
  const uploadSequence = useRef(0);
  const publicationLock = useRef(false);
  const draft = store.state.drafts.find(item => item.id === store.state.activeId) ?? store.state.drafts[0];
  const page = draft.pages[draft.activePage];
  const writer = draft.members.find(member => member.id === draft.activeMemberId) ?? draft.members[0];
  const wordPages = draft.pages.filter(item => item.text.trim()).length;
  const issues = workshopPublicationIssues(draft);
  const currentEdition = reading.state.published.find(book => book.id === `workshop-${draft.id}-r${draft.revision}`);
  const sourceId = query.fromQuestion ?? query.sourceQuestionId ?? query.question;
  const sourceQuestion = reading.state.questions.find(item => item.id === sourceId);
  const stepIndex = workshopSteps.indexOf(draft.step);
  const selectedScene = useRef("");
  selectedScene.current = `${draft.id}:${page.id}`;
  const generatedImage = page.imageCredit.startsWith(AI_IMAGE_CREDIT);
  const textLabel = draft.type === "poetry" ? t("시를 써 보세요", "Write your poem") : draft.type === "theater" ? t("해설과 인물의 대사를 써 보세요", "Write narration and dialogue") : draft.type === "comic" ? t("칸별 장면과 대사를 써 보세요", "Write panels and dialogue") : t("이 장의 본문", "Page text");

  function updateDraft(change: (current: WorkshopDraft) => WorkshopDraft, targetId = draft.id) {
    store.setState(state => ({ ...state, drafts: state.drafts.map(item => item.id === targetId ? change(item) : item) }));
  }
  function patch(changes: Partial<WorkshopDraft>) { updateDraft(current => reviseWorkshopDraft(current, changes)); }
  function changePage(changes: Partial<WorkshopPage>) { updateDraft(current => reviseWorkshopPage(current, page.id, changes)); }
  function adoptGeneratedImage(imageDataUrl: string, generatedPrompt?: string) {
    const targetDraft = draft.id, targetPage = page.id;
    if (selectedScene.current !== `${targetDraft}:${targetPage}`) return false;
    if (!isAllowedImageDataUrl(imageDataUrl)) {
      setError(t("생성 그림을 저장하지 못했어요. 공방은 2MB 이하의 정상 이미지 파일만 보관합니다. 원고와 현재 그림은 그대로예요.", "The generated image cannot be saved. The workshop accepts valid images up to 2MB. Your writing and current illustration are unchanged."));
      return false;
    }
    const imageCredit = `${AI_IMAGE_CREDIT} · adopted ${new Date().toISOString()}`;
    updateDraft(current => reviseWorkshopPage(current, targetPage, { imageDataUrl, imageCredit, ...(generatedPrompt !== undefined ? { imagePrompt: generatedPrompt } : {}) }), targetDraft);
    setError("");
    toast(t("이 장면에 그림을 채택했어요. AI 생성 출처도 함께 저장했어요.", "Illustration adopted for this scene. Its AI source was saved too."));
    return true;
  }
  function go(step: WorkshopStep) { updateDraft(current => ({ ...current, step })); setError(""); setPreview(false); }
  function addDraft(next: WorkshopDraft) {
    if (store.state.drafts.length >= MAX_WORKSHOP_DRAFTS) { setError(t("초안 보관함이 가득 찼어요. 먼저 JSON으로 백업해 주세요.", "The draft shelf is full. Back up your work as JSON.")); return; }
    store.setState(state => addWorkshopDraft(state, next));
    setError(""); setPreview(false); setFeedback(""); setContribution("");
  }
  function selectMode(mode: WorkshopMode) {
    const members = mode === "team" && draft.members.length < 2 ? [...draft.members, { id: crypto.randomUUID(), name: "작가 2", role: "의견 주기" }] : draft.members;
    patch({ mode, members });
  }
  function recordFeedback() {
    if (!feedback.trim() || draft.feedback.length >= 300) return;
    const entry = { id: crypto.randomUUID(), memberId: writer.id, pageId: page.id, text: feedback.trim(), at: new Date().toISOString() };
    updateDraft(current => ({ ...current, feedback: [...current.feedback, entry] })); setFeedback("");
  }
  function recordContribution() {
    if (!contribution.trim() || draft.contributions.length >= 300) return;
    const entry = { id: crypto.randomUUID(), memberId: writer.id, pageId: page.id, summary: contribution.trim(), at: new Date().toISOString() };
    updateDraft(current => ({ ...current, contributions: [...current.contributions, entry] })); setContribution("");
  }
  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    const targetId = draft.id, targetPage = page.id, sequence = ++uploadSequence.current;
    setImageBusy(true); setError("");
    try {
      const imageDataUrl = await imageFileData(file);
      if (sequence !== uploadSequence.current) return;
      updateDraft(current => reviseWorkshopPage(current, targetPage, { imageDataUrl, imageCredit: "" }), targetId);
      toast(t("이미지를 넣었어요. 만든 사람과 사용 허락을 적어 주세요.", "Image added. Add its creator and permission details."));
    } catch (cause) { setError(cause instanceof Error ? cause.message : t("이미지를 넣지 못했어요.", "Unable to add image.")); }
    finally { if (sequence === uploadSequence.current) setImageBusy(false); }
  }
  function publish() {
    if (publicationLock.current || currentEdition) return;
    publicationLock.current = true;
    try {
      const book = createWorkshopEdition(draft);
      reading.setState(state => state.published.some(item => item.id === book.id) ? state : recordEvent({ ...state, published: [book, ...state.published] }, "workshop.edition_created", book.id));
      updateDraft(current => ({ ...current, step: "edition", editions: current.editions.some(item => item.id === book.id) ? current.editions : [...current.editions, { id: book.id, revision: book.revision, at: new Date().toISOString() }] }));
      toast(t("이 브라우저의 서재에 고정 판본을 추가했어요.", "A fixed edition was added to this browser's library."));
    } catch (cause) { setError(cause instanceof Error ? cause.message : t("출판을 마치지 못했어요.", "Unable to save an edition.")); }
    finally { publicationLock.current = false; }
  }
  async function exportPdf() {
    if (pdfBusy) return;
    const snapshot = structuredClone(draft);
    setPdfBusy(true); setError("");
    try {
      const { exportBookPdf, downloadPdf } = await import("@/lib/pdf-export");
      const images = new Map<string, Promise<string>>();
      const pages = await Promise.all(snapshot.pages.map(async (item, index) => {
        const key = item.imageDataUrl ?? item.art;
        if (!images.has(key)) images.set(key, printableImage(item));
        const notes = [item.imageCredit.trim() ? `그림 출처: ${item.imageCredit.trim()}` : "", item.sourceNote.trim() ? `자료 출처: ${item.sourceNote.trim()}` : "", index === snapshot.pages.length - 1 && snapshot.outline.sources.trim() ? `책의 참고자료: ${snapshot.outline.sources.trim()}` : ""].filter(Boolean);
        return { text: [workshopPageText(item) || t("(아직 비어 있는 장)", "(An unfinished page)"), ...notes].join("\n\n"), imageDataUrl: await images.get(key) };
      }));
      const filename = `${snapshot.title.trim() || "나의-책"}-v${snapshot.revision}-${paper}.pdf`;
      const blob = await exportBookPdf({ title: snapshot.title.trim() || t("제목 없는 초안", "Untitled draft"), subtitle: `${snapshot.mode === "team" ? snapshot.teamName : snapshot.authorName} · ${currentEdition ? t("완성본", "Edition") : t("초안", "Draft")}`, pages, paper, locale: reading.state.locale, filename });
      downloadPdf(blob, filename);
      toast(t("전권 PDF를 준비했어요. 인쇄 미리보기에서 확인해 주세요.", "The full-book PDF is ready. Check the print preview."));
    } catch (cause) { setError(cause instanceof Error ? cause.message : t("PDF를 만들지 못했어요. 초안은 남아 있어요.", "Unable to make the PDF. Your draft is retained.")); }
    finally { setPdfBusy(false); }
  }
  function copyLegacyDraft() {
    const old = reading.state.project;
    if (old.pages.length > 24 || old.pages.some(item => item.text.length > 6000) || old.title.length > 120) {
      setError(t("이전 초안이 공방의 분량 한도를 넘어요. 원본은 그대로 두고 필요한 부분을 새 초안에 직접 옮겨 주세요.", "The earlier draft exceeds this workshop's limits. Keep the original and copy selected material into a new draft."));
      return;
    }
    const next = createWorkshopDraft(old.kind === "teacher" ? "teacher" : "individual");
    next.title = old.title.slice(0, 120); next.step = "edit";
    next.pages = Array.from({ length: Math.min(24, Math.max(4, old.pages.length)) }, (_, i) => {
      const existing = old.pages[i], blank = createWorkshopPage();
      return existing ? { ...blank, text: existing.text.slice(0, 6000), art: existing.art, ...(existing.imageDataUrl && isAllowedImageDataUrl(existing.imageDataUrl) ? { imageDataUrl: existing.imageDataUrl } : {}) } : blank;
    });
    next.desiredPages = next.pages.length; addDraft(next);
  }
  function useAiOutline(outline: StoryOutline) {
    const next = createWorkshopDraft("teacher");
    next.title = outline.title.slice(0, 120); next.topic = draft.topic; next.keywords = draft.keywords;
    next.grade = draft.grade; next.type = draft.type; next.style = draft.style; next.authorName = draft.authorName;
    next.desiredPages = draft.desiredPages; next.step = "outline";
    next.outline = {
      purpose: `[AI 구성안 · 직접 검토할 초안]\n${outline.premise}`.slice(0, 4000),
      start: (outline.scenes[0] ?? "").slice(0, 4000),
      middle: outline.scenes.slice(1, -1).join("\n").slice(0, 4000),
      end: (outline.scenes.at(-1) ?? "").slice(0, 4000),
      characters: outline.mainCharacter.slice(0, 4000),
      sources: outline.localFactsToVerify.length ? `아직 확인하지 않은 지역 사실:\n${outline.localFactsToVerify.join("\n")}`.slice(0, 4000) : "",
    };
    next.pages = Array.from({ length: next.desiredPages }, createWorkshopPage);
    addDraft(next); setShowAiPlanner(false);
  }

  if (!store.ready || !reading.ready) return <div className="loading">{t("초안을 불러오는 중이에요…", "Loading drafts…")}</div>;

  return <div className="book-workshop">
    <header className="bw-heading">
      <div className="bw-heading-copy"><span className="eyebrow">OUR LITTLE BOOK WORKSHOP</span><h1>{t("생각 한 줌,\n우리만의 한 권", "A little idea,\na book of our own")}</h1><p>{t("연필을 꺼내듯 가볍게 시작해요.\n한 장씩 쓰다 보면, 어느새 책이 되어 있을 거예요.", "Begin as simply as picking up a pencil.\nPage by page, your ideas will become a book.")}</p><Link href="/library" className="text-button"><Icon name="library" size={17}/>{t("우리 서재 둘러보기", "Visit our library")}<Icon name="arrow" size={15}/></Link></div>
      <div className="bw-heading-art" aria-hidden="true"><BookArtwork variant="mail"/><span>{t("오늘도, 한 장의 이야기", "One more page, one more story")}</span></div>
    </header>

    <section className="bw-draftbar" aria-label={t("초안 보관함", "Draft shelf")}>
      <label>{t("이어 쓰는 초안", "Continue a draft")}<select value={draft.id} onChange={event => { store.setState(state => ({ ...state, activeId: event.target.value })); setPreview(false); setFeedback(""); setContribution(""); setError(""); }}>
        {store.state.drafts.map((item, i) => <option key={item.id} value={item.id}>{item.title || `${t("제목 없는 초안", "Untitled draft")} ${store.state.drafts.length - i}`} · {t(...modeNames[item.mode])}</option>)}
      </select></label>
      <div className="bw-new-draft"><label className="sr-only" htmlFor="bw-new-mode">{t("새 책 작업 방식", "New book mode")}</label><select id="bw-new-mode" value={newMode} onChange={event => setNewMode(event.target.value as WorkshopMode)}>{Object.entries(modeNames).map(([key, labels]) => <option key={key} value={key}>{t(...labels)}</option>)}</select><button className="button" onClick={() => addDraft(createWorkshopDraft(newMode))} disabled={store.state.drafts.length >= MAX_WORKSHOP_DRAFTS}><Icon name="plus"/>{t("새 책", "New book")}</button></div>
      <div className="bw-save-state" role="status">{store.storageOk ? t("이 브라우저에 저장", "Saved in this browser") : t("현재 화면에만 보관 중", "Only kept in this view")}<small>v{draft.revision} · {wordPages}/{draft.pages.length}{t("장 작성", " pages written")}</small></div>
    </section>
    {!store.storageOk ? <div className="bw-warning" role="alert"><strong>{t("자동 저장을 확인하지 못했어요.", "Automatic saving could not be confirmed.")}</strong><p>{store.error || t("새로고침 전에 JSON 백업을 내려받아 주세요.", "Download a JSON backup before refreshing.")}</p><button className="button secondary" onClick={store.backup}>{t("JSON 백업", "Back up JSON")}</button><button className="button secondary" onClick={store.retry}>{t("저장 다시 시도", "Retry saving")}</button></div> : null}
    {error ? <div className="bw-warning" role="alert">{error}</div> : null}
    {sourceQuestion ? <div className="bw-source"><Icon name="question"/><span>{sourceQuestion.text}</span><button className="text-button" onClick={() => addDraft(createWorkshopDraft(newMode, sourceQuestion.text))}>{t("이 질문으로 새 초안", "New draft from this question")}</button></div> : null}

    <nav className="bw-steps" aria-label={t("책 만들기 단계", "Bookmaking steps")}>{workshopSteps.map((step, index) => <button key={step} aria-current={draft.step === step ? "step" : undefined} onClick={() => go(step)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{t(...stepNames[step])}</strong></button>)}</nav>
    <div className="bw-step-intro"><span>{t("오늘의 책상", "ON YOUR DESK")} / {String(stepIndex + 1).padStart(2, "0")}</span><p>{t(...stepHints[draft.step])}</p></div>

    {draft.step === "prepare" ? <section className="bw-panel">
      <div className="bw-section-heading"><h2>{t("어떤 책을 만들까요?", "What kind of book will you make?")}</h2><p>{t("아래 설정은 언제든 바꿀 수 있어요. 실제 학생 정보 대신 별명을 사용해 주세요.", "You can change these choices. Use nicknames instead of real student information.")}</p></div>
      <div className="bw-mode-picker">{Object.entries(modeNames).map(([mode, labels]) => <button key={mode} aria-pressed={draft.mode === mode} onClick={() => selectMode(mode as WorkshopMode)}><Icon name={mode === "team" ? "users" : mode === "teacher" ? "book" : "pencil"}/>{t(...labels)}</button>)}</div>
      <div className="bw-fields bw-first-choices">
        <label>{t("어떤 이야기를 담을까요?", "What would you like to write about?")}<input value={draft.topic} maxLength={500} onChange={event => patch({ topic: event.target.value })} placeholder={t("예: 제주 애월의 바다, 우리 동네의 비밀", "For example: Aewol’s sea, a secret in our village")}/></label>
        <label>{t("책 이름을 붙여 보세요", "Give your book a name")}<input value={draft.title} maxLength={120} onChange={event => patch({ title: event.target.value })} placeholder={t("제목은 나중에 정해도 괜찮아요", "It’s fine to choose a title later")}/></label>
        <label>{t("누가 읽을까요?", "Who will read it?")}<select value={draft.grade} onChange={event => patch({ grade: Number(event.target.value) })}>{[1, 2, 3, 4, 5, 6].map(grade => <option key={grade} value={grade}>{t(`초등 ${grade}학년`, `Grade ${grade}`)}</option>)}</select></label>
        <label>{t("어떤 모양의 책인가요?", "What kind of book?")}<select value={draft.type} onChange={event => patch({ type: event.target.value as WorkshopType })}>{workshopTypes.map(type => <option key={type} value={type}>{t(...typeNames[type])}</option>)}</select></label>
      </div>
      <details className="bw-fold bw-book-options"><summary><span>{t("조금 더 정해 볼까요?", "A few more choices?")}</span><small>{t("낱말 · 그림체 · 장수 · 작가 이름", "Keywords · style · page count · author")}</small><Icon name="plus" size={16}/></summary><div className="bw-fold-content">
        <div className="bw-fields">
          <label>{t("담고 싶은 낱말", "Words to include")}<input value={draft.keywords} maxLength={300} onChange={event => patch({ keywords: event.target.value })} placeholder={t("바람, 해녀, 친구, 약속…", "Wind, divers, friends, promises…")}/></label>
          <label>{t("원하는 그림체", "Illustration style")}<select value={draft.style} onChange={event => patch({ style: event.target.value as WorkshopStyle })}>{workshopStyles.map(style => <option key={style} value={style}>{t(...styleNames[style])}</option>)}</select></label>
          <label>{t("장수 · 표지 제외", "Pages · excluding cover")}<select value={draft.desiredPages} onChange={event => patch({ desiredPages: Number(event.target.value) })}>{Array.from({ length: 21 }, (_, i) => i + 4).map(count => <option key={count} value={count}>{count}</option>)}</select></label>
          <label>{draft.mode === "team" ? t("팀 이름", "Team name") : t("만든 사람 · 별명 가능", "Author · a nickname is fine")}<input maxLength={80} value={draft.mode === "team" ? draft.teamName : draft.authorName} onChange={event => patch(draft.mode === "team" ? { teamName: event.target.value } : { authorName: event.target.value })}/></label>
        </div>
        {draft.desiredPages !== draft.pages.length ? <div className="bw-notice"><span>{t(`지금은 ${draft.pages.length}장이에요. ${draft.desiredPages}장짜리 복사본을 만들면 원래 원고도 남아요.`, `This draft has ${draft.pages.length} pages. Make a ${draft.desiredPages}-page copy and keep the original.`)}</span><button className="button secondary" onClick={() => addDraft(forkWorkshopDraft(draft, draft.desiredPages))}>{t("새 장수로 복사", "Copy with this page count")}</button></div> : null}
        <p className="bw-help">{t("그림체는 그림 요청문에 반영돼요. 선택만으로 내장 그림이 바뀌거나 새 그림이 생성되지는 않아요.", "The style guides illustration prompts. Choosing it does not restyle samples or generate an image.")}</p>
      </div></details>
      {draft.mode === "team" ? <div className="bw-team"><h3>{t("함께 만드는 사람들", "Our team")}</h3><p>{t("한 기기를 번갈아 쓰며 만든 사람과 의견을 기록해요. 다른 기기와 실시간으로 함께 편집하는 기능은 연결되지 않았어요.", "Take turns on one device and record contributions. Live editing across devices is not connected.")}</p>{draft.members.map((member, i) => <div className="bw-member" key={member.id}><label>{t(`작가 ${i + 1} 별명`, `Writer ${i + 1} nickname`)}<input value={member.name} maxLength={80} onChange={event => patch({ members: draft.members.map(item => item.id === member.id ? { ...item, name: event.target.value } : item) })}/></label><label>{t("맡은 일", "Contribution role")}<input value={member.role} maxLength={100} onChange={event => patch({ members: draft.members.map(item => item.id === member.id ? { ...item, role: event.target.value } : item) })}/></label></div>)}<button className="button secondary" disabled={draft.members.length >= 8} onClick={() => patch({ members: [...draft.members, { id: crypto.randomUUID(), name: `작가 ${draft.members.length + 1}`, role: "" }] })}>{t("함께 만들 사람 추가 · 최대 8명", "Add a member · up to 8")}</button></div> : null}
      <details className="bw-legacy"><summary>{t("이전 책 공방 초안에서 시작하기", "Start from the earlier studio draft")}</summary><p>{reading.state.project.title} · {reading.state.project.pages.length}{t("장. 기존 초안은 그대로 남습니다.", " pages. The earlier draft is preserved.")}</p><button className="button secondary" onClick={copyLegacyDraft}>{t("기존 초안을 복사해 가져오기", "Import a copy of the earlier draft")}</button></details>
      <div className="bw-actions"><button className="button secondary" onClick={() => go("edit")}>{t("바로 직접 쓰기", "Start writing now")}</button><button className="button" onClick={() => go("outline")}>{t("구상하기", "Plan the book")}<Icon name="arrow"/></button></div>
    </section> : null}

    {draft.step === "outline" ? <section className="bw-panel"><div className="bw-section-heading"><h2>{t("책의 뼈대를 생각해요", "Plan the shape of your book")}</h2><p>{t("직접 쓴 구상을 장면별로 나눌 수 있어요. 아래 장면 틀은 입력한 구상을 정리하는 도구예요.", "Divide your own plan into pages. The planning cues organize the ideas you entered.")}</p></div>{draft.sourceQuestion ? <blockquote className="bw-question">{draft.sourceQuestion}</blockquote> : null}<div className="bw-fields">
      {([
        ["purpose", "독자에게 전하고 싶은 것", "What should readers take away?"],
        ["start", draft.type === "information" ? "처음 알아볼 질문" : draft.type === "poetry" ? "첫 시의 소재" : "시작", "Opening or first subject"],
        ["middle", draft.type === "information" ? "설명할 내용과 근거" : draft.type === "poetry" ? "이어질 시들의 소재" : "가운데의 변화", "Middle or supporting ideas"],
        ["end", draft.type === "information" ? "정리와 남은 질문" : draft.type === "poetry" ? "마지막 시와 시인의 말" : "끝과 여운", "Ending or final reflection"],
        ["characters", "반복할 인물·소품·색", "Consistent characters, objects and colors"],
        ["sources", "참고자료와 사실 확인 메모", "Sources and fact-check notes"],
      ] as const).map(([field, ko, en]) => <label key={field}>{t(ko, en)}<textarea rows={4} maxLength={4000} value={draft.outline[field]} onChange={event => patch({ outline: { ...draft.outline, [field]: event.target.value } })}/></label>)}
      </div><p className="bw-help">{t("정보책의 사실은 출처로 확인하고, 이야기에 새로 만든 설정은 창작임을 구분해 주세요. 특정 책의 문장이나 그림을 그대로 옮기지 않아요.", "Check facts against sources and distinguish invented details. Do not copy a book's text or illustrations.")}</p>{draft.mode === "teacher" && reading.state.role !== "student" && (draft.type === "picture" || draft.type === "story") ? <div className="bw-ai-plan"><button className="button secondary" aria-expanded={showAiPlanner} onClick={() => setShowAiPlanner(!showAiPlanner)}>{showAiPlanner ? t("AI 구성안 도구 접기", "Close AI outline tool") : t("기존 AI 구성안 도구 열기", "Open the existing AI outline tool")}</button><p className="bw-help">{t("선택 기능입니다. 기존 텍스트 AI의 승인 범위·서버 연결·남은 한도를 따릅니다. 요청 버튼을 누르기 전에는 구성안을 생성하지 않으며, 선택한 안은 새 초안으로 보관합니다. 삽화와 완성 본문은 생성하지 않습니다.", "Optional. Uses the existing text AI approval, server connection and remaining allowance. Only the request button generates outlines; choosing one creates a separate draft. It does not generate images or finished prose.")}</p>{showAiPlanner ? <AiStoryPlanner place={draft.topic.slice(0, 80)} topic={(draft.keywords || draft.outline.purpose || draft.topic).slice(0, 100)} grade={draft.grade <= 2 ? "1–2" : draft.grade <= 4 ? "3–4" : "5–6"} onSelect={useAiOutline}/> : null}</div> : null}<div className="bw-actions"><button className="button secondary" onClick={() => go("edit")}>{t("구상 없이 직접 쓰기", "Write without a plan")}</button><button className="button" onClick={() => updateDraft(current => prepareScenePlans(current))}>{t("빈 장면에 구상 틀 넣기", "Add planning cues to empty scenes")}</button></div></section> : null}

    {draft.step === "draft" ? <section className="bw-panel bw-writing-desk">
      <div className="bw-section-heading"><h2>{t("지금은 이 장면만 생각해요", "Just this one scene, for now")}</h2><p>{t("어떤 일이 벌어지나요? 떠오르는 문장을 편하게 적어 보세요.", "What happens here? Write the words that come to mind.")}</p></div>
      <div className="bw-page-tabs" aria-label={t("초고 장면 선택", "Choose a draft scene")}>{draft.pages.map((item, index) => <button key={item.id} aria-current={index === draft.activePage ? "page" : undefined} aria-label={t(`${index + 1}장${item.text.trim() ? " · 작성 중" : " · 빈 장"}`, `Page ${index + 1}${item.text.trim() ? " · writing started" : " · empty"}`)} onClick={() => updateDraft(current => ({ ...current, activePage: index }))}>{index + 1}<span>{item.text.trim() ? "●" : "○"}</span></button>)}</div>
      <article className="bw-scene-card bw-single-scene" key={page.id}>
        <span className="bw-page-number">{t("나의 이야기", "MY STORY")} / {String(draft.activePage + 1).padStart(2, "0")}</span>
        <details className="bw-fold bw-scene-note"><summary><span>{t("이 장면의 작은 메모", "A little note for this scene")}</span><small>{page.plan ? t("구상한 내용이 있어요", "There is a planning note") : t("필요할 때만 적어요", "Only if it helps")}</small><Icon name="plus" size={16}/></summary><label className="bw-fold-content">{t("장면 메모 · 책에는 나오지 않아요", "Planning note · stays out of the book")}<textarea rows={3} maxLength={4000} value={page.plan} onChange={event => changePage({ plan: event.target.value })}/></label></details>
        <label>{t("내 말로 쓰는 본문", "The story, in my words")}<textarea className="bw-main-text" rows={9} maxLength={6000} value={page.text} onChange={event => changePage({ text: event.target.value })} placeholder={t("그날, 이상한 일이 시작되었어요…", "That day, something unusual happened…")}/></label><small className="bw-character-count">{page.text.length} / 6000</small>
        <div className="bw-page-bottom"><button className="button secondary" disabled={draft.activePage === 0} onClick={() => updateDraft(current => ({ ...current, activePage: current.activePage - 1 }))}>{t("이전 장", "Previous page")}</button><span>{draft.activePage + 1} / {draft.pages.length}</span><button className="button secondary" disabled={draft.activePage === draft.pages.length - 1} onClick={() => updateDraft(current => ({ ...current, activePage: current.activePage + 1 }))}>{t("다음 장", "Next page")}</button></div>
      </article><div className="bw-actions"><button className="button" onClick={() => go("edit")}>{t("이 장면에 그림을 놓아 볼까요?", "Add an illustration to this scene?")}<Icon name="arrow" size={16}/></button></div>
    </section> : null}

    {draft.step === "edit" ? <section className="bw-editor">
      <div className="bw-editor-toolbar"><label>{t("책 제목", "Book title")}<input value={draft.title} maxLength={120} onChange={event => patch({ title: event.target.value })}/></label><label>{t("지금 쓰는 사람", "Current writer")}<select value={draft.activeMemberId} onChange={event => updateDraft(current => ({ ...current, activeMemberId: event.target.value }))}>{draft.members.map(member => <option key={member.id} value={member.id}>{member.name || t("이름 미정", "Unnamed")}</option>)}</select></label><button className="button secondary" aria-pressed={preview} onClick={() => setPreview(!preview)}>{preview ? t("편집으로 돌아가기", "Back to editing") : t("읽기 미리보기", "Preview reading")}</button></div>
      <div className="bw-page-tabs" aria-label={t("페이지 선택", "Choose a page")}>{draft.pages.map((item, index) => <button key={item.id} aria-current={index === draft.activePage ? "page" : undefined} onClick={() => updateDraft(current => ({ ...current, activePage: index }))}>{index + 1}<span>{item.text.trim() ? "●" : "○"}</span></button>)}</div>
      <div className={`bw-edit-layout ${preview ? "is-preview" : ""}`}><div className="bw-paper"><div className="bw-page-art">{page.imageDataUrl ? <img src={page.imageDataUrl} alt={page.heading || t("직접 넣은 삽화", "Uploaded illustration")}/> : <BookArtwork variant={page.art} alt={t("내장 샘플 삽화", "Built-in sample illustration")}/>}</div>{preview ? <><h2>{page.heading}</h2><div className="bw-preview-text">{page.text || t("아직 본문이 없는 장면이에요.", "This page has no text yet.")}</div></> : <><label>{t("작은 제목 · 선택", "Page heading · optional")}<input maxLength={120} value={page.heading} onChange={event => changePage({ heading: event.target.value })}/></label><label>{textLabel}<textarea className="bw-main-text" maxLength={6000} value={page.text} placeholder={t("여기에 우리만의 문장을 적어 보세요.", "Write your own words here.")} onChange={event => changePage({ text: event.target.value })}/></label><small className="bw-character-count">{page.text.length}/6000</small></>}<div className="bw-page-bottom"><button className="button secondary" disabled={draft.activePage === 0} onClick={() => updateDraft(current => ({ ...current, activePage: current.activePage - 1 }))}>{t("이전 장", "Previous")}</button><span>{draft.activePage + 1} / {draft.pages.length}</span><button className="button secondary" disabled={draft.activePage === draft.pages.length - 1} onClick={() => updateDraft(current => ({ ...current, activePage: current.activePage + 1 }))}>{t("다음 장", "Next")}</button></div></div>
      {!preview ? <aside className="bw-inspector" key={`${draft.id}:${page.id}:tools`}>
        <div className="bw-tool-heading"><span>{t("작은 도구함", "A LITTLE TOOLBOX")}</span><h3>{t("이 장면에 더하기", "Add to this scene")}</h3></div>
        <details className="bw-fold" open><summary><span>{t("준비된 그림 고르기", "Choose a sample")}</span><Icon name="plus" size={15}/></summary><div className="bw-fold-content"><div className="bw-samples">{workshopArts.map(art => <button key={art} aria-pressed={!page.imageDataUrl && page.art === art} disabled={imageBusy} onClick={() => changePage({ art, imageDataUrl: undefined, imageCredit: "" })}><BookArtwork variant={art}/><span>{t(artNames[art][0], artNames[art][1])}</span></button>)}</div><p className="bw-help">{t("여러 책에서 함께 쓰는 샘플 그림이에요. 이 장면을 위해 생성된 그림은 아니에요.", "Shared sample illustrations, not images generated for this scene.")}</p></div></details>
        <details className="bw-fold"><summary><span>{t("내 그림 가져오기", "Bring my own image")}</span><Icon name="plus" size={15}/></summary><div className="bw-fold-content"><label className="bw-upload">{imageBusy ? t("이미지 확인 중…", "Checking image…") : t("그림 파일 고르기", "Choose an image file")}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={imageBusy} onChange={uploadImage}/><small>PNG · JPEG · WebP / {t("2MB 이하", "up to 2MB")}</small></label></div></details>
        {page.imageDataUrl ? <div className="bw-credit"><label>{generatedImage ? t("함께 보관하는 생성 출처", "Saved generation credit") : t("그림 만든 사람·사용 허락", "Image creator and permission")}<textarea rows={3} maxLength={500} readOnly={generatedImage} value={page.imageCredit} onChange={event => changePage({ imageCredit: event.target.value })} placeholder={t("예: 내가 그린 그림 / 허락받은 사진", "For example: my drawing / photo used with permission")}/></label>{generatedImage ? <p className="bw-help">{t("생성 출처는 이 그림과 함께 PDF·완성본에 남아요. 추가 설명은 아래 참고자료에 적어요.", "This credit travels with the image into PDFs and editions. Add any further notes under sources below.")}</p> : null}</div> : null}
        <details className="bw-fold"><summary><span>{t("장면 메모와 참고자료", "Notes and sources")}</span><Icon name="plus" size={15}/></summary><div className="bw-fold-content"><label>{t("장면 메모", "Planning note")}<textarea rows={3} maxLength={4000} value={page.plan} onChange={event => changePage({ plan: event.target.value })}/></label><label>{t("참고자료 · 선택", "Sources · optional")}<textarea rows={2} maxLength={2000} value={page.sourceNote} onChange={event => changePage({ sourceNote: event.target.value })}/></label></div></details>
        <details className="bw-fold bw-prompt"><summary><span>{t("그림 요청문 다듬기", "Shape an illustration prompt")}</span><Icon name="plus" size={15}/></summary><div className="bw-fold-content"><p className="bw-help">{t("책의 인물과 그림체를 모아 요청문을 준비해요. 이 버튼은 그림을 생성하지 않아요.", "Combine your characters and style into a prompt. This button does not generate an image.")}</p><button className="button secondary" onClick={() => changePage({ imagePrompt: makeIllustrationPrompt(draft, page) })}>{t("내 설정으로 요청문 준비", "Prepare from my settings")}</button><label>{t("보관할 그림 요청문", "Saved illustration prompt")}<textarea rows={6} maxLength={2000} value={page.imagePrompt} onChange={event => changePage({ imagePrompt: event.target.value })}/></label><p className={page.imagePrompt.length > 2000 ? "bw-limit-error" : "bw-help"}>{page.imagePrompt.length} / 2000 · {t("실제 생성 요청은 2,000자까지만 가능해요. 긴 기존 메모는 자동으로 자르지 않으니 직접 줄여 주세요.", "Generation accepts at most 2,000 characters. Longer saved notes are kept intact; shorten them yourself.")}</p><button className="text-button" disabled={!page.imagePrompt} onClick={async () => { try { await navigator.clipboard.writeText(page.imagePrompt); toast(t("요청문을 복사했어요.", "Prompt copied.")); } catch { setError(t("요청문을 직접 선택해 복사해 주세요.", "Please select and copy the prompt manually.")); } }}>{t("요청문 복사", "Copy prompt")}</button></div></details>
      </aside> : null}</div>
      {!preview ? <details className="bw-fold bw-ai-illustration" key={`${draft.id}:${page.id}:ai`}><summary><span><Icon name="sparkle" size={18}/>{t("이 장면을 위한 AI 그림", "An AI illustration for this scene")}</span><small>{t("선택 도구 · 별도 비용 승인 필요", "Optional · separate cost approval required")}</small><Icon name="plus" size={17}/></summary><div className="bw-fold-content"><p className="bw-ai-context">{draft.title || t("제목 없는 초안", "Untitled draft")} / {draft.activePage + 1}{t("장", ". Page")} — {t("미리 보고 ‘이 그림을 현재 장면에 사용’을 눌러야 반영돼요.", "Preview first. Only ‘Use this image in the current scene’ applies the result.")}</p><p className="bw-help">{t("요청문은 공백을 포함해 최대 2,000자예요. 초과하면 생성할 수 없고 자동으로 잘라 보내지 않아요. 채택하면 실제 요청문과 AI 생성 출처를 이 장에 보관해요.", "Prompts have a hard limit of 2,000 characters including spaces. Longer prompts cannot be generated and are never silently shortened. Adoption saves the actual prompt and AI credit with this page.")}</p><BookImageGenerator key={`${draft.id}:${page.id}`} prompt={page.imagePrompt || makeIllustrationPrompt(draft, page)} onSelect={(dataUrl, metadata) => adoptGeneratedImage(dataUrl, metadata.prompt)}/></div></details> : null}
      {draft.mode === "team" && !preview ? <div className="bw-team-notes"><div><h3>{t("내가 더한 것", "My contribution")}</h3><p>{t(`${writer.name} · ${draft.activePage + 1}장`, `${writer.name} · page ${draft.activePage + 1}`)}</p><label>{t("한 일과 바꾼 이유", "What I did and why")}<textarea rows={3} value={contribution} maxLength={1000} onChange={event => setContribution(event.target.value)}/></label><button className="button secondary" disabled={!contribution.trim() || draft.contributions.length >= 300} onClick={recordContribution}>{t("기여 기록 남기기", "Record contribution")}</button></div><div><h3>{t("친구에게 주는 의견", "Peer feedback")}</h3><p>{t("좋았던 점·궁금한 점·다음 제안을 말해요. 친구의 문장을 자동으로 바꾸지 않아요.", "Share a strength, question or suggestion. Feedback never changes a friend's text automatically.")}</p><label>{t("이 장에 대한 의견", "Feedback on this page")}<textarea rows={3} value={feedback} maxLength={1000} onChange={event => setFeedback(event.target.value)}/></label><button className="button secondary" disabled={!feedback.trim() || draft.feedback.length >= 300} onClick={recordFeedback}>{t("의견 남기기", "Add feedback")}</button></div><ul className="bw-feedback-list">{draft.feedback.filter(item => item.pageId === page.id).map(item => <li key={item.id}><strong>{draft.members.find(member => member.id === item.memberId)?.name}</strong><p>{item.text}</p></li>)}</ul></div> : null}
    </section> : null}

    {draft.step === "review" ? <section className="bw-panel"><div className="bw-section-heading"><h2>{t("독자에게 건네기 전에", "Before sharing with readers")}</h2><p>{t("초안을 고치면 확인 항목이 다시 열립니다. 완성본은 지금의 원고를 따로 보관해요.", "Editing reopens these checks. An edition keeps a separate copy of the current manuscript.")}</p></div><div className="bw-review-summary"><strong>{draft.title || t("제목을 정해 주세요", "Choose a title")}</strong><span>{t(...typeNames[draft.type])} · {draft.pages.length}{t("장", " pages")} · {t(`${draft.grade}학년`, `Grade ${draft.grade}`)}</span></div><div className="bw-review-pages">{draft.pages.map((item, index) => <button key={item.id} onClick={() => updateDraft(current => ({ ...current, step: "edit", activePage: index }))}><strong>{index + 1}{t("장", ". Page")}</strong><span>{item.text.trim() ? `${item.text.slice(0, 90)}${item.text.length > 90 ? "…" : ""}` : t("본문이 비어 있어요", "No text yet")}</span><Icon name={item.text.trim() ? "check" : "pencil"} size={16}/></button>)}</div><div className="bw-checks">{([
      ["text", "본문과 순서를 직접 읽고 확인했어요.", "I read and checked the text and page order."],
      ["rights", "직접 만든 글·그림이거나, 사용 허락과 출처를 확인했어요.", "The text and images are original, or I checked permission and credits."],
      ["privacy", "실제 학생 정보·사적인 사진·친구의 개인정보가 없는지 확인했어요.", "I checked for real student details, private photos and personal information."],
      ...(draft.type === "information" ? [["facts", "정보책의 사실과 참고자료를 확인하고 창작 설정과 구분했어요.", "I checked factual claims and sources and distinguished invented details."]] : []),
    ] as [keyof WorkshopDraft["review"], string, string][]).map(([key, ko, en]) => <label key={key}><input type="checkbox" checked={draft.review[key]} onChange={event => updateDraft(current => ({ ...current, review: { ...current.review, [key]: event.target.checked } }))}/><span>{t(ko, en)}</span></label>)}</div>{issues.length ? <ul className="bw-issues">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul> : <p className="bw-ready"><Icon name="check"/>{t("서재에 놓을 준비가 되었어요.", "Ready for the library.")}</p>}{draft.mode === "team" ? <details className="bw-contributions"><summary>{t(`함께 만든 기록 ${draft.contributions.length}개`, `${draft.contributions.length} contribution notes`)}</summary>{draft.contributions.map(item => <p key={item.id}><strong>{draft.members.find(member => member.id === item.memberId)?.name}</strong> · {draft.pages.findIndex(p => p.id === item.pageId) + 1}{t("장", ". Page")} — {item.summary}</p>)}</details> : null}<p className="bw-help">{t("이 브라우저의 서재에만 추가됩니다. 외부 출판·공개 링크·실시간 공동 편집은 실행되지 않습니다.", "The edition stays in this browser's library. No public publishing, public link or live co-editing is performed.")}</p><div className="bw-actions">{currentEdition ? <Link href={`/reader/${currentEdition.id}`} className="button">{t("이 판본 읽기", "Read this edition")}</Link> : <button className="button" disabled={issues.length > 0 || draft.editions.length >= 300} onClick={publish}>{t("고정 판본으로 서재에 놓기", "Save a fixed edition to the library")}<Icon name="book"/></button>}</div></section> : null}

    {draft.step === "edition" ? <section className="bw-panel"><div className="bw-section-heading"><h2>{t("우리 책의 완성본", "Our finished editions")}</h2><p>{t("다시 쓰더라도 이전 완성본은 그대로 남습니다. 초안으로 돌아가 고친 뒤 새 판본을 만들 수 있어요.", "Earlier editions stay unchanged. Revise the draft and create another edition.")}</p></div>{draft.editions.length ? <div className="bw-editions">{[...draft.editions].reverse().map(edition => {
      const book = reading.state.published.find(item => item.id === edition.id);
      return <article key={edition.id}><Icon name="book"/><div><h3>{book?.title ?? draft.title}</h3><p>v{edition.revision} · {new Date(edition.at).toLocaleDateString(reading.state.locale === "ko" ? "ko-KR" : "en-US")}</p>{book ? <Link href={`/reader/${edition.id}`} className="text-button">{t("읽고 듣기", "Read and listen")}<Icon name="arrow" size={15}/></Link> : <p>{t("이 브라우저의 서재 저장을 확인해 주세요. 초안과 판본 기록은 남아 있어요.", "Check the browser library storage. The draft and edition record remain.")}</p>}</div></article>;
    })}</div> : <div className="bw-empty"><Icon name="book"/><p>{t("검토를 마치면 첫 완성본을 서재에 놓을 수 있어요.", "Complete the review to save your first edition.")}</p><button className="button" onClick={() => go("review")}>{t("검토하러 가기", "Go to review")}</button></div>}<div className="bw-actions"><button className="button secondary" onClick={() => go("edit")}>{t("초안 이어 쓰기", "Continue the draft")}</button><button className="button secondary" onClick={() => addDraft(forkWorkshopDraft(draft))}>{t("새 초안으로 복사", "Copy into a new draft")}</button></div></section> : null}

    <footer className="bw-footer"><div className="bw-export"><label className="sr-only" htmlFor="bw-paper">{t("PDF 용지 크기", "PDF paper size")}</label><select id="bw-paper" value={paper} onChange={event => setPaper(event.target.value as "A4" | "A5")}><option value="A5">A5 · {t("작은 책", "Small book")}</option><option value="A4">A4 · {t("큰 글씨 인쇄", "Larger print")}</option></select><button className="button secondary" onClick={exportPdf} disabled={pdfBusy || imageBusy}><Icon name="print"/>{pdfBusy ? t("전권 PDF 만드는 중…", "Making the full PDF…") : t("현재 초안 전권 PDF", "Full draft PDF")}</button><button className="text-button" onClick={store.backup}>{t("초안 JSON 백업", "Back up drafts as JSON")}</button><button className="text-button" onClick={() => downloadJson(createIllustrationBrief(draft), `illustration-brief-${draft.id}-v${draft.revision}.json`)}>{t("삽화 제작 요청묶음 JSON", "Illustration brief JSON")}</button></div><div className="bw-step-controls"><button className="button secondary" disabled={stepIndex === 0} onClick={() => go(workshopSteps[stepIndex - 1])}>{t("이전 단계", "Previous step")}</button><button className="button" disabled={stepIndex === workshopSteps.length - 1} onClick={() => go(workshopSteps[stepIndex + 1])}>{t("다음 단계", "Next step")}<Icon name="arrow" size={16}/></button></div><p>{t("현재 원고 그대로 전권을 출력합니다. 긴 글은 인쇄 페이지가 늘어날 수 있고, 음성과 영상은 PDF에 포함되지 않습니다.", "The PDF includes the whole manuscript. Long text may span extra print pages. Audio and video are not included.")}</p></footer>
  </div>;
}
