"use client";

import Link from "./workspace-link";
import { useEffect, useRef, useState } from "react";
import { useWorkspaceRouter as useRouter } from "./workspace-link";
import { script } from "@/lib/catalog";
import { editPage, publishProject, recordEvent, type Artwork, type Project } from "@/lib/model";
import { useReading } from "./provider";
import { Icon } from "./icons";
import { BookArtwork } from "./artwork";
import { WorkspaceBack } from "./ui";
import { AiStoryPlanner } from "./reading-ai";
import type {StoryOutline} from "@/lib/server/reading-ai";

export function TheaterWorkspace({query}: {query: Record<string, string>}) {
  const {state, setState, t, toast} = useReading();
  const [role, setRole] = useState("all");
  const [expressive, setExpressive] = useState(false);
  const mismatch = query.context === "journey" && state.journeyBookId !== "wind-post";
  const journey = query.context === "journey" && !mismatch && state.enabled.theater;
  const roles = [{id: "narrator", ko: "해설", en: "Narrator"}, {id: "child", ko: "소라", en: "Sora"}, {id: "wind", ko: "바람", en: "Wind"}];
  return <><div className="workspace-top"><WorkspaceBack journey={query.context === "journey"}/><span className="badge">{t("녹음 없이도 함께할 수 있어요", "No recording required")}</span></div><div className="page-heading"><span className="eyebrow">{t("이야기에 우리 목소리를 담아요", "LET THE STORY FIND ITS VOICE")}</span><h1>{t("우리 목소리로, 바람 우체국", "Give the Wind Post Office a voice")}</h1><p>{t("같은 대사도 서로 다르게 들려요. 인물의 마음을 생각하며 읽어 봐요.", "The same line can sound different. Read with the character's feelings in mind.")}</p></div>{mismatch ? <p className="info-banner">{t("이 샘플 대본의 원작은 ‘바람 우체국’입니다. 현재 여정의 책과 달라 독립 활동으로 기록됩니다.", "This sample script is based on The Wind Post Office. It will be recorded independently of the current journey book.")}</p> : null}<div className="theater-layout"><section className="surface script-panel"><div className="panel-title"><div><span className="tiny-label">{t("장면 01", "SCENE 01")}</span><h2>{t("이름 없는 편지", "A letter without a name")}</h2></div><Link className="text-button" href={`/reader/wind-post?page=0${journey ? "&context=journey" : ""}`}><Icon name="book" size={16}/>{t("원작 보기", "Read source")}</Link></div><div className="filter-chips"><button aria-pressed={role === "all"} onClick={() => setRole("all")}>{t("전체 대본", "All lines")}</button>{roles.map(r => <button key={r.id} aria-pressed={role === r.id} onClick={() => setRole(r.id)}>{t(r.ko, r.en)}</button>)}</div><div className="script-lines">{script.map((line, i) => <div key={i} className={`script-line ${role !== "all" && role !== line.role ? "dimmed" : ""}`}><span className={`role-tag ${line.role}`}>{t(roles.find(r => r.id === line.role)!.ko, roles.find(r => r.id === line.role)!.en)}</span><p>{t(line.ko, line.en)}{expressive && line.role === "child" ? <small>{t("표현해 보기 · 놀라움과 호기심을 어떻게 들려줄까요?", "Try an expression · How would surprise and curiosity sound?")}</small> : null}</p></div>)}</div><div className="script-bottom"><button className="button secondary" aria-pressed={expressive} onClick={() => setExpressive(!expressive)}><Icon name="sparkle" size={17}/>{t(expressive ? "표현 도움 접기" : "표현 도움 열기", expressive ? "Hide expression hints" : "Explore expression")}</button><button className="button ghost" onClick={() => window.print()}><Icon name="print" size={17}/>{t("대본 인쇄", "Print script")}</button></div></section><aside className="stack"><section className="surface"><div className="panel-title"><h2>{t("오늘의 배역", "Today's cast")}</h2><Icon name="users"/></div><p className="muted">{t("샘플 모둠 · 역할은 바꿔 가며 해요.", "Sample groups · Take turns in different roles.")}</p>{roles.map(r => <label className="cast-field" key={r.id}><span className={`role-tag ${r.id}`}>{t(r.ko, r.en)}</span><input aria-label={t(`${r.ko} 역할 담당`, `Assigned ${r.en}`)} value={state.cast[r.id]} maxLength={40} onChange={e => setState(s => ({...s, cast: {...s.cast, [r.id]: e.target.value}}))}/></label>)}<button className="text-button" onClick={() => {setState(s => recordEvent({...s, cast: {...s.cast, wind: t("해설과 함께 읽기", "Read with narrator")}}, "theater.cast_reassigned", "wind")); toast(t("바람 역할을 해설과 함께 읽도록 바꿨어요. 언제든 직접 수정할 수 있어요.", "The wind lines are now shared with the narrator. You can edit this at any time."));}}>{t("바람 역할이 결석했다면?", "If the Wind reader is absent?")}<Icon name="arrow" size={15}/></button></section><section className="surface"><h3>{t("목소리에 담은 생각", "A thought behind the voice")}</h3><label className="field"><span>{t("어떤 마음으로 읽었나요?", "How did the character feel?")}</span><textarea maxLength={500} value={state.theaterReflection} onChange={e => setState(s => ({...s, theaterReflection: e.target.value}))} placeholder={t("한 가지 표현과 그 이유를 남겨요.", "Describe one choice and your reason.")}/></label><button className="button primary full" onClick={() => {setState(s => recordEvent({...s, evidence: query.context === "journey" && s.journeyBookId === "wind-post" && s.enabled.theater ? {...s.evidence, theater: "self_report"} : s.evidence}, "theater.reflection_saved", "script-wind-v1")); toast(t("연습과 성찰을 기록했어요. 녹음이나 점수는 만들지 않았어요.", "Practice and reflection saved. No recording or score was created."));}}><Icon name="check" size={16}/>{t("연습 기록 저장", "Save reflection")}</button></section></aside></div></>;
}

export function StudioWorkspace({query}: {query: Record<string, string>}) {
  const {state, setState, t, toast} = useReading();
  const router = useRouter();
  const [preview, setPreview] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const publishDialog = useRef<HTMLElement>(null);
  const [mode, setMode] = useState(query.mode === "teacher" && state.role !== "student" ? "brief" : "edit");
  const [place, setPlace] = useState("제주 애월");
  const [topic, setTopic] = useState("서로 다른 마음을 이해하기");
  const [grade, setGrade] = useState("3–4");
  const [showPlans, setShowPlans] = useState(false);
  useEffect(() => {
    setMode(query.mode === "teacher" && state.role !== "student" ? "brief" : "edit");
    setShowPlans(false);
  }, [query.mode, state.role]);
  useEffect(() => {
    if (!publishOpen || !publishDialog.current) return;
    const dialog = publishDialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>("button, input, select, textarea, a[href], [tabindex]"))
      .filter(element => element.tabIndex >= 0 && !element.hasAttribute("disabled") && !element.closest("[hidden]"));
    const focusFirst = () => (focusable()[0] ?? dialog).focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setPublishOpen(false);
        setReviewed(false);
      } else if (event.key === "Tab") {
        const targets = focusable();
        const first = targets[0];
        const last = targets[targets.length - 1];
        if (!first) {
          event.preventDefault();
          dialog.focus();
        } else if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target)) focusFirst();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn);
    focusFirst();
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn);
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({preventScroll: true});
    };
  }, [publishOpen]);
  useEffect(() => {
    const wideScreen = window.matchMedia("(min-width: 1280px)");
    const syncInspector = () => setInspectorOpen(wideScreen.matches);
    syncInspector();
    wideScreen.addEventListener("change", syncInspector);
    return () => wideScreen.removeEventListener("change", syncInspector);
  }, []);
  const project = state.project;
  const pageIndex = Math.max(0, Math.min(project.activePage, project.pages.length - 1));
  const page = project.pages[pageIndex];
  const previewText = state.locale === "en" ? page.en.trim() ? page.en : page.text : page.text.trim() ? page.text : page.en;
  const sourceQuestion = state.questions.find(q => q.id === project.sourceQuestionId);
  const variants: {id: Artwork; ko: string; en: string}[] = [{id: "coast", ko: "바닷마을", en: "Coast"}, {id: "mail", ko: "우체통", en: "Postbox"}, {id: "forest", ko: "작은 숲", en: "Forest"}, {id: "night", ko: "달빛", en: "Moonlight"}];
  function usePlan(index: number) {
    const titles = [t(`${place || "우리 동네"}에서 온 편지`, `A letter from ${place || "our town"}`), t("서로 다른 길, 하나의 지도", "Different paths, one map"), t("작은 씨앗이 기다린 이야기", "The story a little seed waited for")];
    const samplePages: Project["pages"][] = [[
      {text: `${place || "우리 동네"}에 사는 아이가 작은 편지를 발견했어요. 편지에는 이름 대신 그림이 하나 그려져 있었지요.`, en: "A child found a little letter. There was a picture on it, but no name.", art: "coast"},
      {text: `친구들은 저마다 다른 이야기를 떠올렸어요. ‘${topic || "서로의 마음"}’에 대해 함께 이야기해 보기로 했지요.`, en: "Each friend imagined a different story. They decided to listen to one another.", art: "mail"},
      {text: "이곳에 인물의 선택과 달라진 마음을 직접 써 주세요. 지역의 실제 사실은 별도로 확인해 주세요.", en: "Write the character's choice and changed feelings here. Verify any real local facts separately.", art: "forest"},
    ], [
      {text: `${place || "우리 동네"}의 길을 큰 종이에 그리던 아이들이 빈자리를 발견했어요. ‘우리가 아직 가 보지 않은 곳일까?’`, en: "The children found a blank space while drawing their village. ‘Is this a place we have not visited?’", art: "coast"},
      {text: `조용히 지도를 보던 친구가 연필을 들었어요. ‘${topic || "서로의 마음"}’에 대해 이야기하다가, 각자 소중하게 여기는 장소가 다르다는 것을 알게 되었지요.`, en: "A quiet friend picked up a pencil. As they listened, the children discovered that different places mattered to each of them.", art: "forest"},
      {text: "누구의 길을 어떻게 지도에 더할까요? 아이들이 듣고 선택한 다음 장면을 써 주세요. 실제 장소는 별도로 확인해 주세요.", en: "Whose path will they add, and how? Write what the children hear and choose next. Verify any real places separately.", art: "mail"},
    ], [
      {text: `${place || "우리 동네"}의 작은 화분에 반짝이는 씨앗을 심었어요. 아이는 매일 아침 흙을 들여다보았지요.`, en: "A child planted a sparkling seed in a little pot and looked at the soil every morning.", art: "night"},
      {text: `싹이 보이지 않자 친구들의 생각이 달라졌어요. ‘${topic || "서로의 마음"}’에 대해 이야기하며 기다릴지, 흙을 살펴볼지 함께 생각했지요.`, en: "When no sprout appeared, the friends had different ideas. They talked about whether to wait or examine the soil.", art: "forest"},
      {text: "아이들은 어떤 선택을 하고 무엇을 발견할까요? 보이지 않는 변화를 상상해 다음 장면을 직접 써 주세요.", en: "What will the children choose, and what will they discover? Imagine a change they cannot yet see and write the next scene.", art: "forest"},
    ]];
    const next: Project = {id: crypto.randomUUID(), title: titles[index], activePage: 0, revision: 1, sourceQuestionId: null, kind: "teacher", pages: samplePages[index]};
    setState(s => recordEvent({...s, projectArchive: [...s.projectArchive.filter(p => p.id !== s.project.id), structuredClone(s.project)], project: next}, "story.fixture_selected", next.id));
    setMode("edit"); setPreview(false); toast(t("샘플 초안으로 시작했어요. 이전 작업은 프로젝트 선택에 남아 있어요.", "A sample draft is ready. Your previous project is preserved in the selector."));
  }
  function useAiPlan(outline: StoryOutline) {
    const next: Project = {id:crypto.randomUUID(),title:outline.title,activePage:0,revision:1,sourceQuestionId:null,kind:"teacher",
      pages:outline.scenes.map(text => ({text:state.locale === "ko" ? text : "",en:state.locale === "en" ? text : "",art:"forest"}))};
    setState(s => recordEvent({...s,projectArchive:[...s.projectArchive.filter(p=>p.id!==s.project.id),structuredClone(s.project)],project:next},"story.ai_outline_selected",next.id));
    setMode("edit");setPreview(false);
    toast(t("AI 구성안을 초안으로 옮겼어요. 장면을 직접 완성해 주세요. 이전 작업은 보관돼요.", "The AI outline is now a draft. Develop each scene yourself. Your earlier work is preserved."));
  }
  function publish() {
    if (!reviewed || !project.title.trim() || project.pages.some(p => !p.text.trim() && !p.en.trim())) return;
    const next = publishProject(state); setState(next); setPublishOpen(false); setReviewed(false);
    toast(t("이 탭의 서재에 고정된 완성본을 저장했어요. 외부에는 공개하지 않았습니다.", "A snapshot was saved to this tab's library. It was not published externally."));
    router.push(`/reader/${next.published[0].id}`);
  }
  function closePublish() {
    setPublishOpen(false);
    setReviewed(false);
  }
  return <><div className="workspace-top"><WorkspaceBack journey={query.context === "journey"}/><span className="badge">{t("공동저작 화면 체험 · 실시간 접속 미연결", "Coauthoring preview · Realtime is not connected")}</span></div>
    <div className="studio-heading"><div><span className="eyebrow">{t("우리 손으로 쓰는 우리 이야기", "OUR HANDS, OUR WORDS, OUR STORY")}</span><h1>{mode === "brief" ? t("우리 수업에 꼭 맞는 이야기", "A story for our classroom") : t("우리는 이야기 만드는 사람", "We are the storytellers")}</h1><p>{mode === "brief" ? t("지역과 주제를 정하고, 구성안을 골라 직접 다듬어 보세요.", "Choose a place and topic, then shape a story outline.") : t("생각을 한 장씩 모아요. 완성보다 중요한 건 함께 고쳐 가는 과정이에요.", "Gather your ideas, one page at a time. Revising together is part of the story.")}</p></div>{state.role !== "student" ? <button className="button secondary" onClick={() => {setMode(mode === "brief" ? "edit" : "brief"); setShowPlans(false);}}><Icon name={mode === "brief" ? "pencil" : "sparkle"} size={17}/>{mode === "brief" ? t("편집기로 돌아가기", "Back to editor") : t("새 교재 기획", "Plan a new book")}</button> : null}</div>
    {mode === "brief" ? <div className="brief-workspace"><section className="surface brief-form"><h2>{t("어떤 이야기를 만들까요?", "What story shall we make?")}</h2><div className="field-grid"><label className="field"><span>{t("지역 또는 배경", "Place or setting")}</span><input value={place} maxLength={80} onChange={e => setPlace(e.target.value)}/></label><label className="field"><span>{t("학년군", "Grade band")}</span><select value={grade} onChange={e => setGrade(e.target.value)}><option>1–2</option><option>3–4</option><option>5–6</option></select></label></div><label className="field"><span>{t("함께 생각할 주제", "A topic to think about")}</span><input value={topic} maxLength={100} onChange={e => setTopic(e.target.value)}/></label><p className="muted">{t("그림책 · 3장면 샘플 · 지역 사실과 창작은 따로 검토해요.", "Picture book · 3 sample scenes · Review local facts and fiction separately.")}</p><button className="button primary" onClick={() => setShowPlans(true)}><Icon name="sparkle" size={18}/>{t("샘플 구성안 3개 보기", "Explore 3 sample outlines")}</button><p className="local-disclosure">{t("미리 준비한 구성안이며 학년군별 문장을 자동 조정하지 않아요. AI 생성·삽화 API·과금 요청은 실행하지 않습니다.", "These prepared samples do not automatically adapt their wording by grade. No AI, image-generation API, or paid request is made.")}</p></section><AiStoryPlanner place={place} topic={topic} grade={grade} onSelect={useAiPlan}/>{showPlans ? <div className="plan-grid">{[{ko: "바람이 전해 준 편지", en: "A letter carried by the wind", sub: "서로 다르게 해석한 편지에서 친구의 마음을 발견해요.", subEn: "Discover a friend's feelings through different readings of a letter.", art: "mail"}, {ko: "우리의 길을 잇는 지도", en: "A map of our different paths", sub: "지도에 빠진 장소를 찾으며 듣지 못했던 목소리를 만나요.", subEn: "Find a missing place and a voice that has not been heard.", art: "coast"}, {ko: "기다리는 씨앗", en: "The seed that waits", sub: "변화가 보이지 않는 시간에도 서로를 믿는 이야기를 써요.", subEn: "Write about trusting each other when change is not yet visible.", art: "forest"}].map((plan, i) => <article className="plan-card" key={plan.ko}><BookArtwork variant={plan.art as Artwork}/><span className="tiny-label">{t("구성안", "CONCEPT")} 0{i + 1} · {grade}</span><h3>{t(plan.ko, plan.en)}</h3><p>{t(plan.sub, plan.subEn)}</p><button className="button secondary full" onClick={() => usePlan(i)}>{t("이 구성으로 시작", "Start with this outline")}<Icon name="arrow" size={16}/></button></article>)}</div> : null}</div> : <>
    <div className="editor-toolbar"><div className="editor-title"><Icon name="book" size={23}/><input aria-label={t("책 제목", "Book title")} readOnly={preview} maxLength={100} value={project.title} onChange={e => setState(s => ({...s, project: {...s.project, title: e.target.value, revision: s.project.revision + 1}}))}/><span className="saved-label"><span/>{t("탭에 저장", "Saved in tab")}</span></div><div className="row"><button className="button ghost" aria-pressed={preview} onClick={() => setPreview(!preview)}><Icon name={preview ? "pencil" : "book"} size={16}/>{preview ? t("다시 편집", "Edit") : t("미리보기", "Preview")}</button><button className="button primary" disabled={!project.title.trim() || project.pages.some(p => !p.text.trim() && !p.en.trim())} onClick={() => {setReviewed(false); setPublishOpen(true);}}>{t("완성본 저장", "Save edition")}<Icon name="arrow" size={16}/></button></div></div>
    {state.projectArchive.length ? <label className="project-switch">{t("작업 중인 책", "Current project")}<select aria-label={t("프로젝트 선택", "Choose project")} value={project.id} onChange={e => {const chosen = state.projectArchive.find(p => p.id === e.target.value); if (chosen) setState(s => ({...s, project: chosen, projectArchive: [...s.projectArchive.filter(p => p.id !== chosen.id), s.project]}));}}><option value={project.id}>{project.title}</option>{state.projectArchive.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label> : null}
    {sourceQuestion ? <div className="source-bridge"><Icon name="question" size={18}/><span>{t("이 이야기의 출발점", "The question behind this story")} · <strong>{sourceQuestion.text}</strong></span><Link href={`/inquiry?selected=${sourceQuestion.id}${query.context === "journey" ? "&context=journey" : ""}`} className="text-button">{t("질문 보기", "Open question")}</Link></div> : null}
    <div className={`story-editor ${preview ? "previewing" : ""}`}><aside className="editor-pages"><span className="tiny-label">{t("책의 장면", "PAGES")}</span>{project.pages.map((p, i) => <button key={i} className={i === pageIndex ? "active" : ""} aria-current={i === pageIndex ? "page" : undefined} aria-label={preview ? t(`${i + 1}쪽 보기`, `View page ${i + 1}`) : t(`${i + 1}쪽 편집`, `Edit page ${i + 1}`)} onClick={() => setState(s => ({...s, project: {...s.project, activePage: i}}))}><BookArtwork variant={p.art}/><span>{String(i + 1).padStart(2, "0")}</span></button>)}{!preview ? <button className="add-page" disabled={project.pages.length >= 8} onClick={() => setState(s => ({...s, project: {...s.project, pages: [...s.project.pages, {text: "", en: "", art: "coast"}], activePage: s.project.pages.length, revision: s.project.revision + 1}}))}><Icon name="plus" size={21}/><small>{t("장면 추가", "Add scene")}</small></button> : null}</aside><div className="editor-canvas"><div className="canvas-label"><span>{t("이야기 장면", "Story scene")} {String(pageIndex + 1).padStart(2, "0")}</span><span>{t("글과 그림을 함께 살펴봐요", "Words and pictures, together")}</span></div><div className="story-page"><BookArtwork variant={page.art} className="editor-scene-image"/>{preview ? <p className="page-preview-text">{previewText || t("아직 이야기가 비어 있어요.", "This story is waiting for your words.")}</p> : <textarea rows={7} aria-label={t("이 장면의 이야기", "Story text for this scene")} value={state.locale === "en" ? page.en : page.text} maxLength={1800} placeholder={t("이 장면에서 어떤 일이 벌어지나요?", "What happens in this scene?")} onChange={e => setState(s => editPage(s, pageIndex, state.locale === "en" ? {en: e.target.value} : {text: e.target.value}))}/>}<span className="page-index">{pageIndex + 1}</span></div><span className="canvas-note">{t("글과 그림을 바꿔도 이전 완성본은 그대로 남아요.", "Changes to this draft do not alter your saved editions.")}</span>{preview ? <div className="preview-pagination" aria-label={t("미리보기 장면 이동", "Preview scene navigation")}><button className="button secondary" disabled={pageIndex === 0} onClick={() => setState(s => ({...s, project: {...s.project, activePage: pageIndex - 1}}))}><Icon name="back" size={18}/>{t("이전 장면", "Previous")}</button><span aria-live="polite">{pageIndex + 1} / {project.pages.length}</span><button className="button secondary" disabled={pageIndex === project.pages.length - 1} onClick={() => setState(s => ({...s, project: {...s.project, activePage: pageIndex + 1}}))}>{t("다음 장면", "Next")}<Icon name="arrow" size={18}/></button></div> : null}</div>{!preview ? <details className="editor-inspector" open={inspectorOpen} onToggle={event => setInspectorOpen(event.currentTarget.open)}><summary><span><Icon name="settings" size={19}/>{t("장면 도구", "Scene tools")}</span><Icon name="chevron" size={17}/></summary><div className="inspector-content"><div><span className="tiny-label">{t("장면과 이야기", "SCENE & STORY")}</span><h3>{t("장면의 분위기", "Set the scene")}</h3><div className="art-options">{variants.map(v => <button key={v.id} aria-pressed={page.art === v.id} onClick={() => setState(s => editPage(s, pageIndex, {art: v.id}))}><BookArtwork variant={v.id}/><span>{t(v.ko, v.en)}</span></button>)}</div><p className="muted small">{t("이 프로젝트를 위해 생성한 색연필 삽화예요. 원하는 장면을 골라 보세요.", "Colored-pencil illustrations created for this project. Choose a scene.")}</p></div><div className="writing-tip"><Icon name="leaf" size={22}/><h3>{t("친구에게 묻고 싶은 것", "A question for your reader")}</h3><p>{t("인물은 무엇을 바랐나요? 이 장면에서 어떤 선택을 했나요?", "What did the character want? What choice did they make?")}</p></div><div className="contribution-note"><span className="avatar small-avatar">1</span><span>{t("샘플 모둠 · 함께 쓰기", "Sample group · Write together")}<small>{t("현재는 한 탭의 편집 체험", "Single-tab editing preview")}</small></span></div></div></details> : null}</div>
    </>}
    {publishOpen ? <div className="modal-backdrop" onClick={closePublish}><section ref={publishDialog} className="modal" role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="publish-title" aria-describedby="publish-description" onClick={e => e.stopPropagation()}><button className="icon-button modal-close" aria-label={t("닫기", "Close")} onClick={closePublish}><Icon name="close"/></button><span className="round-icon"><Icon name="book" size={27}/></span><h2 id="publish-title">{t("우리의 이야기를 한 권으로", "Give our story a place on the shelf")}</h2><p id="publish-description">{t("지금의 글과 그림을 고정된 샘플 완성본으로 저장해요. 이후 초안을 수정해도 이 판본은 바뀌지 않아요.", "Save a snapshot of today's words and pictures. Later draft edits will not change this edition.")}</p><label className="checkbox-label"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)}/>{t("제목과 내용을 살펴봤어요. 샘플 서재에 저장할게요.", "I reviewed the title and content. Save it to the sample library.")}</label><p className="local-disclosure">{t("외부 공개·클라우드 업로드·유료 작업은 실행하지 않습니다.", "No external publishing, cloud upload, or paid operation.")}</p><button className="button primary full" disabled={!reviewed} onClick={publish}>{t("완성본 저장하고 읽기", "Save and read our book")}<Icon name="arrow" size={16}/></button></section></div> : null}
  </>;
}
