"use client";

import Link from "next/link";
import { useState } from "react";
import { catalog } from "@/lib/catalog";
import { activities, attachBook, type Activity } from "@/lib/model";
import { useReading } from "./provider";
import { Icon, type IconName } from "./icons";
import { BookCover, Empty } from "./ui";
import { JourneyLandscape } from "./artwork";
import { ReaderWorkspace, InquiryWorkspace } from "./reading-workspaces";
import { StudioWorkspace, TheaterWorkspace } from "./creative-workspaces";
import { TeacherWorkspace, AdminWorkspace } from "./operations";
import { BookIntake } from "./book-intake";
import { BookWorkshop } from "./book-workshop";
import { BookSuggestions } from "./book-suggestions";
import { StorybookPageHeading } from "./storybook-page-heading";
import { LearningHub } from "./learning-hub";
import { WorkspaceGuide, BookEntryLinks } from "./workspace-guide";

const nav: {href: string; key: string; ko: string; en: string; icon: IconName}[] = [
  {href: "/", key: "home", ko: "이야기 여정", en: "My journey", icon: "map"},
  {href: "/library", key: "library", ko: "우리의 서재", en: "Library", icon: "library"},
  {href: "/inquiry", key: "inquiry", ko: "질문과 탐구", en: "Questions", icon: "question"},
  {href: "/theater", key: "theater", ko: "낭독극", en: "Readers' theater", icon: "theater"},
  {href: "/studio", key: "studio", ko: "책 만들기", en: "Story studio", icon: "pencil"},
  {href: "/my-work", key: "my-work", ko: "내 기록과 작품", en: "My work", icon: "folder"},
];
export const activityInfo: Record<Activity, {ko: string; en: string; sub: string; subEn: string; icon: IconName; x: number; y: number}> = {
  read: {ko: "이야기 숲", en: "Story forest", sub: "읽고 듣기", subEn: "Read & listen", icon: "book", x: 16, y: 90},
  question: {ko: "궁금한 우체국", en: "Curiosity post", sub: "내 질문 만들기", subEn: "Ask my question", icon: "question", x: 31, y: 44},
  discuss: {ko: "생각 나눔터", en: "Ideas square", sub: "다른 생각 만나기", subEn: "Explore perspectives", icon: "users", x: 48, y: 77},
  theater: {ko: "작은 이야기극장", en: "Little theater", sub: "목소리로 표현하기", subEn: "Give stories a voice", icon: "theater", x: 73, y: 48},
  studio: {ko: "우리들의 책 공방", en: "Our story studio", sub: "새 이야기 만들기", subEn: "Make a new story", icon: "pencil", x: 82, y: 91},
};

export function ReadingApp({route, query}: {route: string[]; query: Record<string, string>}) {
  const {state, setState, ready, storageOk, t} = useReading();
  const [mobileNav, setMobileNav] = useState(false);
  const view = route[0] || "home";
  const books = [...catalog, ...state.published, ...state.imported];
  const currentBook = books.find(b => b.id === route[1]);
  const activeKey = view === "reader" || view === "learn" ? "library" : view;
  const title = nav.find(n => n.key === activeKey);
  return <div className="app-shell">
    <a href="#main-content" className="skip-link">{t("본문 바로가기", "Skip to content")}</a>
    {mobileNav ? <button className="nav-backdrop" aria-label={t("메뉴 닫기", "Close menu")} onClick={() => setMobileNav(false)}/> : null}
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
      <Link href="/" className="brand" onClick={() => setMobileNav(false)}><span className="brand-mark"><Icon name="book" size={28}/><span/></span><span>온책읽기<small>READ. WONDER. CREATE.</small></span></Link>
      <div className="class-label"><span className="class-icon"><Icon name="leaf" size={18}/></span><span>{t("우리들의 이야기 교실", "Our story classroom")}<small>{t("3학년 2반 · 샘플 학급", "Grade 3 · Sample class")}</small></span></div>
      <div className="nav-caption">OUR LITTLE WORLD</div>
      <nav aria-label={t("주 메뉴", "Main navigation")}>{nav.map(n => <Link key={n.key} href={n.href} className={`nav-link ${activeKey === n.key ? "active" : ""}`} aria-current={activeKey === n.key ? "page" : undefined} onClick={() => setMobileNav(false)}><Icon name={n.icon}/><span>{t(n.ko, n.en)}</span>{activeKey === n.key ? <span className="nav-dot"/> : null}</Link>)}</nav>
      {state.role !== "student" ? <div className="teacher-nav"><div className="nav-caption">CLASSROOM TOOLS</div><Link href="/teach" className={`nav-link ${view === "teach" ? "active" : ""}`} onClick={() => setMobileNav(false)}><Icon name="settings"/>{t("수업 구성", "Lesson planner")}</Link><Link href="/admin" className={`nav-link ${view === "admin" ? "active" : ""}`} onClick={() => setMobileNav(false)}><Icon name="shield"/>{t("운영 현황", "Operations")}</Link></div> : null}
      <Link href="/guide" className="nav-link"><Icon name="book"/>{t("사용 안내 · 백업", "Guide & backup")}</Link><div className="sidebar-bottom"><div className="small-note"><Icon name="sparkle" size={18}/><span>{t("정답보다 소중한 건,", "Every good story begins")}<br/><strong>{t("나만의 궁금함.", "with your own question.")}</strong></span></div><label className="role-picker"><span className="avatar">{state.role === "student" ? "S" : "T"}</span><span><small>{t("화면 미리보기", "Preview as")}</small><select aria-label={t("미리보기 역할", "Preview role")} value={state.role} onChange={e => setState(s => ({...s, role: e.target.value as typeof s.role}))}><option value="student">{t("학생", "Student")}</option><option value="teacher">{t("선생님", "Teacher")}</option><option value="admin">{t("관리자", "Administrator")}</option></select></span><Icon name="chevron" size={15}/></label></div>
    </aside>
    <div className="app-main"><header className="topbar"><div className="row"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label={t("메뉴 열기", "Open menu")}><Icon name="menu"/></button><span className="breadcrumb">{t("우리의 공간", "Our space")}<Icon name="chevron" size={13}/><strong>{title ? t(title.ko, title.en) : view === "guide" ? t("사용 안내", "Guide") : view === "teach" ? t("수업 구성", "Lesson planner") : t("운영 현황", "Operations")}</strong></span></div><div className="topbar-actions"><span className="preview-badge"><span/>{t("로컬 미리보기", "Local preview")}</span><button className="locale-button" onClick={() => setState(s => ({...s, locale: s.locale === "ko" ? "en" : "ko"}))} aria-label={t("영어로 전환", "Switch to Korean")}>{state.locale === "ko" ? "KO" : "EN"}<span>⌄</span></button><button className="icon-button" aria-label={t(state.theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환", state.theme === "light" ? "Switch to dark mode" : "Switch to light mode")} onClick={() => setState(s => ({...s, theme: s.theme === "light" ? "dark" : "light"}))}><Icon name={state.theme === "light" ? "sun" : "moon"}/></button></div></header>
      <main id="main-content" className={`content view-${view}`}>
        {!ready ? <div className="loading"><Icon name="leaf"/>{t("이야기를 펼치는 중이에요…", "Opening our story…")}</div> : view === "home" ? <Journey/> : view === "library" ? route[1] === "add" ? <BookIntake/> : <Library/> : view === "guide" ? <WorkspaceGuide/> : view === "learn" ? currentBook ? <LearningHub book={currentBook} query={query}/> : <Empty title={t("책을 먼저 골라 주세요", "Choose a book first")} description={t("서재에서 읽을 책을 선택하세요.", "Select a book from the library.")}/> : view === "reader" ? currentBook ? <ReaderWorkspace book={currentBook} query={query}/> : <Empty title={t("이 책을 찾을 수 없어요", "Book not found")} description={t("서재에서 책을 다시 선택해 주세요. 자료는 저장한 기기에서 확인할 수 있습니다.", "Choose a book from the library. Your local work is available on the device where it was saved.")}/> : view === "inquiry" ? <InquiryWorkspace query={query}/> : view === "theater" ? <TheaterWorkspace query={query}/> : view === "studio" ? <BookWorkshop query={query}/> : view === "studio-legacy" ? <StudioWorkspace query={query}/> : view === "my-work" ? <><BookEntryLinks/><Records/></> : view === "teach" || view === "admin" ? state.role === "student" ? <Empty title={t("선생님 화면에서 살펴보세요", "Switch to teacher preview")} description={t("왼쪽 아래에서 미리보기 역할을 변경할 수 있습니다. 실제 계정 권한은 아직 연결되지 않았습니다.", "Change the preview role at the bottom of the sidebar. Real account permissions are not connected yet.")}/> : view === "teach" ? <TeacherWorkspace/> : <AdminWorkspace/> : <Empty title={t("길을 잠시 벗어났어요", "This path is not here")} description={t("왼쪽 메뉴에서 이야기를 이어가세요.", "Continue from the navigation menu.")}/>}
      </main><footer className="app-footer"><span><span className={`status-dot ${storageOk ? "" : "warning"}`}/>{storageOk ? t("작업은 이 기기에 저장됩니다 · 사용 안내에서 백업", "Saved on this device · Back up from the guide") : t("저장 공간을 사용할 수 없어 새로고침 시 작업이 사라질 수 있습니다", "Storage unavailable. Work may be lost on refresh.")}</span><span>{t("실제 학생 정보는 입력하지 마세요 · Firebase 미연결", "Do not enter real student data · Firebase offline")}</span></footer>
    </div>
  </div>;
}

function Journey() {
  const {state, setState, t} = useReading();
  const book = [...catalog, ...state.published, ...state.imported].find(b => b.id === state.journeyBookId) ?? catalog[0];
  const visible = activities.filter(a => state.enabled[a]);
  const next = visible.find(a => !state.evidence[a]) ?? visible[0];
  const path = (a: Activity) => a === "read" ? `/reader/${book.id}?context=journey` : a === "question" ? `/inquiry?context=journey&book=${book.id}` : a === "discuss" ? "/inquiry?context=journey&tab=shared" : `/${a}?context=journey`;
  return <>
    <StorybookPageHeading eyebrow="OUR READING JOURNEY" art="forest" title={<>{t("한 권에서 시작되는,", "One book. Endless")}<br/><span>{t("우리들의 이야기", "possibilities.")}</span></>} description={t("읽고, 궁금해하고, 함께 만들어요. 오늘은 어디로 가 볼까요?", "Read, wonder, and create together. Where will your curiosity take you?")}/>
    <div className="journey-layout"><section className="journey-card"><div className="map-header"><div><span className="tiny-label">CHAPTER 01</span><h2>{t(book.title, book.en)}<span className="subtle-tag">{t("우리 반 여정", "Class journey")}</span></h2></div><div className="segmented" aria-label={t("여정 보기 방식", "Journey display")}><button aria-pressed={state.mapView === "map"} onClick={() => setState(s => ({...s, mapView: "map"}))}><Icon name="map" size={17}/>{t("지도", "Map")}</button><button aria-pressed={state.mapView === "list"} onClick={() => setState(s => ({...s, mapView: "list"}))}><Icon name="list" size={17}/>{t("목록", "List")}</button></div></div>
      {visible.length === 0 ? <Empty title={t("잠시 쉬어가는 여정", "A little pause")} description={t("서재와 작업 공간은 언제든 사용할 수 있어요. 선생님 화면에서 활동을 추가할 수 있습니다.", "Your library and workspaces are always here. Add an activity in the lesson planner.")}/> : state.mapView === "map" ? <div className="journey-map"><JourneyLandscape/>{visible.map((a, i) => <Link href={path(a)} className={`map-stop ${a} ${next === a ? "current" : ""}`} style={{left: `${activityInfo[a].x}%`, top: `${activityInfo[a].y}%`}} key={a}><span className="stop-pin"><Icon name={activityInfo[a].icon} size={24}/>{state.evidence[a] ? <span className="pin-check"><Icon name="check" size={10}/></span> : <small>{i + 1}</small>}</span><span className="stop-label"><strong>{t(activityInfo[a].ko, activityInfo[a].en)}</strong><small>{t(activityInfo[a].sub, activityInfo[a].subEn)}</small></span></Link>)}<span className="map-caption"><Icon name="leaf" size={13}/>{t("호기심이 길이 되는 곳", "Let curiosity lead the way")}</span></div> : <div className="journey-list">{visible.map((a, i) => <Link key={a} href={path(a)} className="journey-list-item"><span className="list-number">0{i + 1}</span><Icon name={activityInfo[a].icon} size={25}/><div><strong>{t(activityInfo[a].ko, activityInfo[a].en)}</strong><small>{t(activityInfo[a].sub, activityInfo[a].subEn)}</small></div><span className="badge">{state.evidence[a] ? t("참여 기록 있음", "Participation noted") : t("자유롭게 시작", "Ready to explore")}</span><Icon name="arrow" size={18}/></Link>)}</div>}
      <div className="map-bottom"><span><Icon name="sparkle" size={16}/>{t("순서가 달라도 괜찮아요. 나의 속도로 걸어가요.", "There is more than one path. Go at your own pace.")}</span>{next ? <Link href={path(next)} className="button primary">{t("여정 이어가기", "Continue journey")}<Icon name="arrow" size={16}/></Link> : null}</div></section>
      <aside className="today-book"><span className="eyebrow">ON MY READING DESK</span><BookCover book={book} compact/><h3>{t(book.title, book.en)}</h3><p>{t(book.subtitle, book.subtitleEn)}</p><span className="reading-position">{t("마지막으로 펼친 장면", "Last opened scene")} <strong>{(state.positions[book.id] ?? 0) + 1} / {book.pages.length}</strong></span><Link href={`/reader/${book.id}`} className="button secondary full"><Icon name="book" size={17}/>{t("책 펼치기", "Open book")}</Link></aside></div>
    <div className="section-heading"><h2>{t("이야기 곁에 남긴 것들", "Little things along the way")}</h2><Link href="/my-work">{t("모두 보기", "View all")}<Icon name="arrow" size={15}/></Link></div><div className="reflection-grid"><Link href="/inquiry" className="reflection-card question-card"><span className="reflection-icon"><Icon name="question" size={24}/></span><div><span className="tiny-label">MY WONDER</span><h3>{state.questions.length ? t(`${state.questions.length}개의 궁금함이 자라고 있어요`, `${state.questions.length} questions are growing`) : t("나의 첫 궁금함을 남겨요", "Plant your first question")}</h3><p>{t("작은 질문 하나가 새로운 이야기가 돼요.", "One little question can become a new story.")}</p></div><Icon name="arrow"/></Link><Link href="/studio" className="reflection-card studio-card"><span className="reflection-icon"><Icon name="pencil" size={24}/></span><div><span className="tiny-label">OUR NEXT CHAPTER</span><h3>{t(state.project.title, state.project.kind === "student" ? "Our next letter" : state.project.title)}</h3><p>{t("생각을 모으고, 고쳐 쓰고, 한 권으로 엮어요.", "Gather ideas, revise, and make a book together.")}</p></div><Icon name="arrow"/></Link></div>
  </>;
}

function Library() {
  const {state, setState, t, toast} = useReading();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const allBooks = [...catalog, ...state.published, ...state.imported];
  const books = allBooks.filter(book => {
    const matchesCollection = filter === "all" || (filter === "ours" ? state.published.some(item => item.id === book.id) : filter === "original" ? !book.collection && catalog.some(item => item.id === book.id) : book.collection === filter);
    return matchesCollection && `${book.title} ${book.en} ${book.subtitle} ${book.subtitleEn}`.toLowerCase().includes(search.trim().toLowerCase());
  });
  const filters = [{id:"all",ko:"모든 이야기",en:"All stories"},{id:"korean",ko:"전래동화",en:"Korean folktales"},{id:"aesop",ko:"이솝우화",en:"Aesop's fables"},{id:"original",ko:"창작 이야기",en:"Original stories"},{id:"ours",ko:"우리가 만든 책",en:"Our books"}];
  return <>
    <StorybookPageHeading eyebrow="A SHELF OF POSSIBILITIES" art="mail" title={t("어떤 이야기를 만나 볼까요?", "What will you discover?")} description={t("옛이야기부터 우리의 새 이야기까지. 읽고, 듣고, 나만의 질문을 남겨요.", "From old tales to our new stories. Read, listen, and ask your own questions.")}><BookEntryLinks/></StorybookPageHeading>
    <div className="library-toolbar"><label className="search-field"><Icon name="search"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("제목이나 이야기로 찾기", "Search titles or stories")} aria-label={t("서재 검색", "Search library")}/></label><div className="filter-chips" aria-label={t("이야기 모음", "Story collections")}>{filters.map(item => <button key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{t(item.ko,item.en)}</button>)}</div></div>
    <p className="catalog-note"><Icon name="leaf" size={15}/>{t("전래동화 5편 · 이솝우화 5편을 어린이용으로 새로 풀어 썼어요. 한국어·영어 읽기와 낭독이 함께 있어요.", "Five Korean folktales and five Aesop fables, newly retold for children, with Korean and English text and narration.")}</p>
    <details className="library-suggestions"><summary><span>{t("학년·관심 주제로 종이책 추천 보기", "Find paper books by grade and interest")}</span><small>{t("13권 · 추천 정보와 종이책 수업 연결", "13 options · Recommendations and paper-book lessons")}</small></summary><BookSuggestions/></details>
    <p className="library-count" aria-live="polite">{t(`${books.length}권의 이야기`, `${books.length} stories`)}</p>
    <div className="book-grid">{books.map(book => <article className="library-book" key={book.id}><Link href={`/reader/${book.id}`} aria-label={t(`${book.title} 읽기`, `Read ${book.en}`)}><BookCover book={book}/></Link><div className="book-meta"><span className="badge">{t(book.tag,book.tagEn)}</span><span>{book.pages.length}{t("장면"," scenes")}</span></div><h2>{t(book.title,book.en)}</h2><p>{t(book.subtitle,book.subtitleEn)}</p>{book.collection ? <div className="book-availability"><Icon name="headphones" size={15}/>{t("한국어·영어 낭독", "KO / EN narration")}<span>· {t(`${book.gradeBand}학년`, `Grades ${book.gradeBand}`)}</span></div> : null}<div className="book-actions"><Link className="text-button" href={`/reader/${book.id}`}>{t("읽기 시작","Read")}<Icon name="arrow" size={16}/></Link>{book.collection ? <Link className="text-button" href={`/reader/${book.id}?listen=1`}><Icon name="headphones" size={16}/>{t("듣기","Listen")}</Link> : null}{state.role !== "student" ? <button className="text-button subtle" onClick={() => {setState(s => attachBook(s,book.id)); toast(t("이 판본을 우리 반 여정에 담았어요. 기존 질문과 원고는 유지됩니다.", "Book added to the journey. Existing questions and drafts are preserved."));}}><Icon name="plus" size={15}/>{t("수업에 담기","Use in lesson")}</button> : null}</div></article>)}</div>
    {books.length === 0 ? <Empty title={t("아직 이곳은 비어 있어요", "This shelf is waiting")} description={t("다른 제목으로 검색하거나 다른 모음을 골라 보세요.", "Try another search or collection.")}/> : null}
    <div className="library-invitation"><Icon name="pencil" size={30}/><div><h3>{t("다음 책의 작가는 우리예요", "Our next author could be you")}</h3><p>{t("책에서 시작한 생각을 새로운 이야기로 만들어 보세요.", "Turn a thought from your reading into a brand-new story.")}</p></div><Link href="/studio" className="button secondary">{t("책 만들러 가기", "Visit the studio")}<Icon name="arrow" size={16}/></Link></div>
  </>;
}

function Records() {
  const {state, t} = useReading();
  return <><div className="page-heading"><span className="eyebrow">A TRAIL OF YOUR OWN</span><h1>{t("조금씩 자라는 나의 이야기", "See your story grow")}</h1><p>{t("잘 읽는 속도보다, 내가 남긴 생각을 돌아봐요.", "Look back at your ideas, not your reading speed.")}</p></div><div className="stats-grid"><div className="stat-card"><Icon name="book"/><strong>{Object.keys(state.positions).length}</strong><span>{t("펼쳐 본 책", "Books opened")}</span></div><div className="stat-card"><Icon name="question"/><strong>{state.questions.length}</strong><span>{t("내가 만든 질문", "My questions")}</span></div><div className="stat-card"><Icon name="pencil"/><strong>{state.published.length}</strong><span>{t("저장한 완성본", "Saved editions")}</span></div></div><section className="surface"><div className="panel-title"><h2>{t("내가 궁금했던 것들", "Things I wondered about")}</h2><Link className="text-button" href="/inquiry">{t("질문 이어가기", "Continue questioning")}<Icon name="arrow" size={15}/></Link></div>{state.questions.length ? state.questions.map(q => <Link href={`/inquiry?selected=${q.id}`} className="record-question" key={q.id}><Icon name="question"/><span>{q.text}<small>{q.answer ? t("생각과 근거를 남겼어요", "A thought and evidence were added") : t("아직 생각하는 중이에요", "Still exploring")}</small></span><Icon name="chevron" size={17}/></Link>) : <Empty title={t("아직 질문이 없어요", "No questions yet")} description={t("읽다가 문득 떠오른 작은 궁금함부터 시작해요.", "Begin with one small thing that makes you curious.")}/>}</section><div className="section-heading"><h2>{t("우리의 완성책", "Our finished books")}</h2></div><div className="book-grid">{state.published.map(book => <Link href={`/reader/${book.id}`} key={book.id}><BookCover book={book}/><h3>{book.title}</h3><small className="muted">{t("고정된 완성본", "Saved snapshot")} · v{book.revision}</small></Link>)}</div>{!state.published.length ? <div className="surface empty-inline"><Icon name="folder"/><span>{t("책 공방에서 완성본을 저장하면 이곳에서도 볼 수 있어요.", "Save an edition in the studio to see it here.")}</span><Link href="/studio" className="text-button">{t("초안 이어 쓰기", "Continue draft")}<Icon name="arrow" size={15}/></Link></div> : null}</>;
}
