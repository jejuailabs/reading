"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { catalog, peerQuestions } from "@/lib/catalog";
import { addQuestion, reviseQuestion, reviseQuestionText, MAX_QUESTION_HISTORY, recordEvent, type Book, type Question } from "@/lib/model";
import { useReading } from "./provider";
import { Icon } from "./icons";
import { BookArtwork } from "./artwork";
import { Empty, WorkspaceBack } from "./ui";
import { ClassicReaderWorkspace } from "./classic-reader";
import { QuestionCoach } from "./reading-ai";
import { ReaderTools } from "./reader-tools";

export function ReaderWorkspace({book, query}: {book: Book; query: Record<string, string>}) {
  return <ReaderTools key={book.id} book={book}>{book.collection ? <ClassicReaderWorkspace key={book.id} book={book} query={query}/> : <OriginalReaderWorkspace book={book} query={query}/>}</ReaderTools>;
}

function OriginalReaderWorkspace({book, query}: {book: Book; query: Record<string, string>}) {
  const {state, setState, t, toast} = useReading();
  const [fontSize, setFontSize] = useState(22);
  const [speaking, setSpeaking] = useState(false);
  const page = Math.min(book.pages.length - 1, Math.max(0, state.positions[book.id] ?? 0));
  const scene = book.pages[page];
  const hasIllustration = !!scene.imageDataUrl || !book.source;
  const sceneText = state.locale === "en" ? scene.en.trim() ? scene.en : scene.text : scene.text.trim() ? scene.text : scene.en;
  const sceneLocale = state.locale === "en" ? scene.en.trim() ? "en" : "ko" : scene.text.trim() ? "ko" : "en";
  const journey = query.context === "journey" && state.journeyBookId === book.id && state.enabled.read;
  useEffect(() => {
    const requested = Number(query.page);
    setState(s => ({...s, positions: {...s.positions, [book.id]: query.page !== undefined && Number.isInteger(requested) ? Math.max(0, Math.min(book.pages.length - 1, requested)) : s.positions[book.id] ?? 0}}));
  }, [book.id, book.pages.length, query.page, setState]);
  useEffect(() => { setSpeaking(false); return () => { if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); }; }, [book.id, page, state.locale]);
  function listen() {
    if (!("speechSynthesis" in window)) {toast(t("이 브라우저에서는 기기 음성을 사용할 수 없어요.", "Device speech is unavailable in this browser.")); return;}
    if (speaking) {window.speechSynthesis.cancel(); setSpeaking(false); return;}
    const voice = window.speechSynthesis.getVoices().find(v => v.localService && v.lang.startsWith(sceneLocale));
    if (!voice) {toast(t("이 장면의 언어에 맞는 기기 음성을 찾지 못했어요. 외부 음성 서비스는 호출하지 않았습니다.", "No on-device voice for this scene’s language was found. No external speech service was called.")); return;}
    const utterance = new SpeechSynthesisUtterance(sceneText);
    utterance.voice = voice; utterance.lang = voice.lang; utterance.rate = 0.85;
    utterance.onend = () => setSpeaking(false); utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance); setSpeaking(true);
  }
  return <>
    <div className="workspace-top"><WorkspaceBack journey={journey}/><span className="badge">{journey ? t("수업에 연결된 읽기", "Journey reading") : t("나의 자유 읽기", "Independent reading")}</span></div>
    <div className="reader-heading"><div><span className="eyebrow">{t("잠깐 숨을 고르고, 책을 펼쳐요", "TAKE A BREATH. OPEN A BOOK.")}</span><h1>{t(book.title, book.en)}</h1></div><span className="muted">{book.source ? t("가져온 책", "Imported book") : t("우리의 책", "Our book")} · v{book.revision}</span></div>
    <div className={`reader-book${hasIllustration ? "" : " is-text-only"}`}><section className="reader-text"><div className="scene-label"><span>{String(page + 1).padStart(2, "0")}</span><div/>{book.source ? t("등록한 책의 본문", "Text from your book") : t("이야기의 한 장면", "A moment in the story")}</div><p style={{fontSize}}>{sceneText}</p><div className="reader-page-number">{hasIllustration ? page * 2 + 1 : page + 1}</div></section>{hasIllustration ? <div className="reader-art">{scene.imageDataUrl ? <img src={scene.imageDataUrl} className="reader-scene-image uploaded-page-image" alt={t(`${page+1}장면 그림`, `Scene ${page+1} illustration`)}/> : <BookArtwork variant={scene.art} className="reader-scene-image"/>}<span className="reader-art-caption">{t("장면을 천천히 살펴보세요.", "Take a moment to look closely.")}</span><div className="reader-page-number">{page * 2 + 2}</div></div> : null}</div>
    <div className="reader-controls"><div className="row"><button className={`button ghost ${speaking ? "is-active" : ""}`} disabled={!sceneText.trim()} onClick={listen}><Icon name={speaking ? "stop" : "headphones"} size={18}/>{speaking ? t("멈추기", "Stop") : t("기기 음성으로 듣기", "Listen on device")}</button><span className="control-divider"/><button className="type-button" onClick={() => setFontSize(f => Math.max(18, f - 2))} disabled={fontSize <= 18} aria-label={t("글자 작게", "Smaller text")}>A−</button><output className="reader-type-value" aria-live="polite" aria-label={t("글자 크기", "Text size")}>{fontSize}</output><button className="type-button" onClick={() => setFontSize(f => Math.min(32, f + 2))} disabled={fontSize >= 32} aria-label={t("글자 크게", "Larger text")}>A+</button></div><div className="pagination" aria-label={t("장면 이동", "Scene navigation")}><button className="icon-button" aria-label={t("이전 장면", "Previous scene")} disabled={page === 0} onClick={() => setState(s => ({...s, positions: {...s.positions, [book.id]: page - 1}}))}><Icon name="back" size={19}/></button><span><strong>{page + 1}</strong> / {book.pages.length}</span><button className="icon-button" aria-label={t("다음 장면", "Next scene")} disabled={page === book.pages.length - 1} onClick={() => setState(s => ({...s, positions: {...s.positions, [book.id]: page + 1}}))}><Icon name="arrow" size={19}/></button></div></div>
    <div className="reader-prompt"><span className="round-icon"><Icon name="question" size={23}/></span><div><h3>{t("읽다가 마음이 멈춘 곳이 있나요?", "Did something make you pause?")}</h3><p>{t("답을 몰라도 괜찮아요. 지금 떠오른 내 질문을 남겨요.", "You don't need an answer yet. Save your own question.")}</p></div><Link className="button primary" href={`/inquiry?book=${book.id}&page=${page}${journey ? "&context=journey" : ""}`}>{t("내 질문 남기기", "Ask my question")}<Icon name="arrow" size={17}/></Link></div>
    {journey ? <div className="reader-end"><p className="muted">{t("읽기 위치는 자동 저장돼요. 장면을 넘기는 것만으로 완독 처리하지 않아요.", "Your place is saved. Turning a page does not mark the book as completed.")}</p><button className="text-button" onClick={() => {setState(s => recordEvent({...s, evidence: s.journeyBookId === book.id && s.enabled.read ? {...s.evidence, read: "self_report"} : s.evidence}, "reading.self_reported", book.id)); toast(t("오늘 읽기 참여를 기록했어요. 독해 평가나 완독 점수는 아닙니다.", "Today's reading participation was noted. This is not an assessment."));}}><Icon name="check" size={16}/>{t("오늘 읽기 참여 기록", "Note today's reading")}</button></div> : <p className="reader-end muted">{t("내 속도로 읽어요. 따로 제출하지 않아도 괜찮아요.", "Read at your own pace. No submission is required.")}</p>}
  </>;
}

function QuestionRevisionEditor({question}: {question: Question}) {
  const {setState,t,toast,state} = useReading();
  const [text,setText] = useState(question.text);
  const [reason,setReason] = useState("");
  const [error,setError] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const history = question.history ?? [];
  const full = history.length >= MAX_QUESTION_HISTORY;
  function saveRevision() {
    if (!text.trim() || text.length > 500 || reason.length > 300) {
      setError(t("질문은 빈칸 없이 500자, 달라진 이유는 300자 안으로 적어 주세요.", "Write a nonempty question within 500 characters and a reason within 300 characters."));
      input.current?.focus(); return;
    }
    if (text.trim() === question.text) {setError(t("질문이 아직 같아요. 그대로 두어도 괜찮아요.", "The question is unchanged. It is okay to keep it.")); return;}
    if (full) {setError(t("이 질문의 기록이 가득 찼어요. 원본과 이전 기록은 그대로 남아요.", "This question's history is full. Its original and earlier versions are preserved.")); return;}
    setState(previous => reviseQuestionText(previous,question.id,text,reason));
    setText(text.trim()); setReason(""); setError("");
    toast(t("질문이 달라진 과정을 남겼어요. 처음 질문과 찾은 단서도 그대로예요.", "Your question's growth is recorded. The original question and your evidence are preserved."));
  }
  return <details style={{margin:"20px 0",padding:"15px 0",borderTop:"1px solid var(--line)",borderBottom:"1px solid var(--line)"}}>
    <summary style={{cursor:"pointer",minHeight:44,fontSize:16,fontWeight:600}}>{t("질문 다듬기", "Refine my question")}</summary>
    <p className="muted">{t("새로 본 단서나 친구의 생각을 떠올리며 내 말로 고쳐 봐요. 처음 질문은 지우지 않아요.", "Use a new clue or another perspective to revise in your own words. Your first question stays.")}</p>
    <label className="field"><span>{t("다듬을 내 질문", "My revised question")}</span><textarea ref={input} rows={3} maxLength={500} value={text} aria-invalid={Boolean(error)} onChange={event => {setText(event.target.value);setError("");}}/></label>
    <label className="field"><span>{t("달라진 이유 · 선택", "Why it changed · optional")}</span><textarea rows={2} maxLength={300} value={reason} onChange={event => {setReason(event.target.value);setError("");}} placeholder={t("어떤 단서나 대화가 내 질문을 바꾸었나요?", "Which clue or conversation changed your question?")}/></label>
    <p className="muted">{t("질문 500자 · 이유 300자. 아래 버튼을 누를 때만 질문의 새 기록을 남겨요.", "Question: 500 characters; reason: 300. A new history entry is added only when you press the button.")}</p>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <button className="button secondary" style={{marginTop:12}} disabled={full || text.trim() === question.text} onClick={saveRevision}><Icon name="pencil" size={22}/>{t("수정한 질문과 이유 저장", "Save my revised question and reason")}</button>
    {full ? <p className="muted">{t(`처음 질문을 포함해 ${MAX_QUESTION_HISTORY}개의 기록을 보관하고 있어요.`, `Keeping ${MAX_QUESTION_HISTORY} versions, including the original.`)}</p> : null}
    <details style={{marginTop:20}}><summary style={{cursor:"pointer",minHeight:44,fontSize:15}}>{t(`질문이 자란 기록 · ${history.length || 1}개`, `How my question grew · ${history.length || 1} versions`)}</summary>
      {history.length ? <ol style={{paddingLeft:23,display:"grid",gap:18}}>{history.map((entry,index) => <li key={entry.revision}><span className="badge">{index === 0 ? t("처음 보관한 질문", "First preserved question") : t(`${index}번째 다듬기`, `Revision ${index}`)} · v{entry.revision}</span><p style={{marginTop:8,whiteSpace:"pre-wrap"}}>{entry.text}</p>{entry.reason ? <p className="muted" style={{marginTop:7,whiteSpace:"pre-wrap"}}>{t("달라진 이유: ", "Why it changed: ")}{entry.reason}</p> : null}<time className="muted" dateTime={entry.at}>{new Date(entry.at).toLocaleString(state.locale === "ko" ? "ko-KR" : "en-US")}</time></li>)}</ol> : <><p>{question.text}</p><p className="muted">{t("이전 저장 형식의 질문이에요. 처음 작성한 시각은 알 수 없어요. 처음 다듬어 저장할 때 현재 질문도 함께 보존해요.", "This question uses an earlier save format. Its original time is unknown. Your current question will be preserved when you first save a revision.")}</p></>}
      <p className="muted">{t("시각은 이력에 보관한 때예요. 질문을 고친 횟수로 점수를 매기지 않아요.", "Times show when versions were preserved. Revision counts are not scores.")}</p>
    </details>
  </details>;
}

export function InquiryWorkspace({query}: {query: Record<string, string>}) {
  const {state, setState, t, toast} = useReading();
  const router = useRouter();
  const [tab, setTab] = useState(query.tab === "shared" ? "shared" : "mine");
  const [selectedId, setSelectedId] = useState(query.selected ?? "");
  const [error, setError] = useState("");
  const questionInput = useRef<HTMLTextAreaElement>(null);
  const books = [...catalog, ...state.published, ...state.imported];
  const source = books.find(b => b.id === query.book);
  const requestedPage = Number(query.page);
  const sourcePage = source && query.page !== undefined && Number.isInteger(requestedPage) ? Math.max(0, Math.min(source.pages.length - 1, requestedPage)) : null;
  const selected = state.questions.find(q => q.id === selectedId) ?? state.questions[0];
  const selectedBook = books.find(b => b.id === selected?.bookId);
  useEffect(() => setTab(query.tab === "shared" ? "shared" : "mine"), [query.tab]);
  useEffect(() => {
    setSelectedId(query.selected ?? "");
    if (query.selected) setTab("mine");
  }, [query.selected]);
  function save() {
    if (!state.questionDraft.trim() || state.questionDraft.trim().length > 500) {
      setError(state.questionDraft.trim() ? t("질문을 500자 안으로 적어 주세요.", "Keep your question within 500 characters.") : t("작은 궁금함을 한 문장으로 적어 주세요.", "Write one small thing you wonder about."));
      questionInput.current?.focus();
      return;
    }
    const next = addQuestion(state, {text: state.questionDraft, bookId: source?.id, page: sourcePage});
    setState(next); setSelectedId(next.questions[0].id); setError("");
    toast(t("내 질문에 저장했어요. 내가 공유하기 전에는 나만의 질문이에요.", "Saved to My questions. It stays private until you choose to share it."));
  }
  return <><div className="workspace-top"><WorkspaceBack journey={query.context === "journey"}/><span className="badge">{t("정답 없이 시작해도 괜찮아요", "It starts with curiosity, not an answer")}</span></div><div className="page-heading"><span className="eyebrow">{t("내 질문에서 새로운 이야기가 시작돼요", "YOUR QUESTIONS OPEN NEW DOORS")}</span><h1>{t("나는 무엇이 궁금할까?", "What makes me wonder?")}</h1><p>{t("먼저 내 생각을 남기고, 이야기 속에서 단서를 찾아봐요.", "Start with your own thought, then look for clues in the story.")}</p></div><div className="tabs"><button aria-pressed={tab === "mine"} onClick={() => setTab("mine")}><Icon name="question" size={18}/>{t("내 질문", "My questions")}<span>{state.questions.length}</span></button><button aria-pressed={tab === "shared"} onClick={() => setTab("shared")}><Icon name="users" size={18}/>{t("우리의 생각 나눔터", "Our ideas square")}</button></div>
    {tab === "mine" ? <div className="inquiry-layout"><section className="question-composer surface"><div className="panel-title"><h2>{t("작은 궁금함 하나", "One little question")}</h2><Icon name="pencil" size={20}/></div>{source ? <Link href={`/reader/${source.id}?page=${sourcePage ?? 0}${query.context === "journey" && source.id === state.journeyBookId ? "&context=journey" : ""}`} className="source-chip"><Icon name="book" size={15}/>{t(source.title, source.en)}{sourcePage !== null ? ` · ${sourcePage + 1}${t("장면", " scene")}` : ""}<Icon name="chevron" size={14}/></Link> : <span className="source-chip muted">{t("책 없이, 주제나 경험에서 시작해도 좋아요", "A topic or experience can be your starting point")}</span>}<label htmlFor="my-question" className="sr-only">{t("나의 질문", "My question")}</label><textarea ref={questionInput} id="my-question" aria-invalid={Boolean(error)} aria-describedby={error ? "question-error" : undefined} className="question-input" maxLength={500} placeholder={t("어떤 장면이 궁금했나요?\n친구에게 묻고 싶은 말을 적어 보세요.", "Which moment made you curious?\nWrite something you would like to ask.")} value={state.questionDraft} onChange={e => {setState(s => ({...s, questionDraft: e.target.value})); setError("");}}/><div className="composer-footer"><span className="muted">{state.questionDraft.length} / 500</span><button className="button primary" onClick={save}><Icon name="plus" size={17}/>{t("내 질문 저장", "Save my question")}</button></div>{error ? <p id="question-error" className="form-error" role="alert">{error}</p> : null}<div className="gentle-hint"><Icon name="leaf" size={17}/><p>{t("‘왜?’, ‘만약에?’, ‘어떤 마음이었을까?’ 말로 나눈 질문을 선생님과 함께 적어도 좋아요.", "‘Why?’, ‘What if?’, ‘How might they feel?’ Your teacher can help write a question you say out loud.")}</p></div></section><section className="question-explorer"><div className="panel-title"><h2>{t("질문을 따라 한 걸음 더", "Follow your curiosity")}</h2></div>{!selected ? <Empty title={t("아직 빈 여백이에요", "A space for your thoughts")} description={t("내 질문을 저장하면 근거를 찾고 생각을 이어갈 수 있어요.", "Save a question to explore clues and develop your thoughts.")}/> : <><div className="question-select-list">{state.questions.map(q => <button key={q.id} className={selected.id === q.id ? "selected" : ""} aria-pressed={selected.id === q.id} onClick={() => setSelectedId(q.id)}><Icon name="question" size={16}/><span>{q.text}</span></button>)}</div><div className="surface thought-card"><span className="tiny-label">{t("이어 가는 나의 생각", "MY NEXT THOUGHT")}</span><h3>{selected.text}</h3>{selectedBook ? <Link href={`/reader/${selectedBook.id}?page=${selected.page ?? 0}${query.context === "journey" && selectedBook.id === state.journeyBookId ? "&context=journey" : ""}`} className="text-button"><Icon name="book" size={16}/>{t("근거 장면 다시 읽기", "Return to the story")}<Icon name="arrow" size={15}/></Link> : null}{selected.origin === "mine" ? <QuestionRevisionEditor key={selected.id} question={selected}/> : null}<label className="field"><span>{t("찾은 단서와 지금의 생각", "Clues and my thoughts")}</span><textarea value={selected.answer} maxLength={1500} placeholder={t("아직 답을 찾지 못해도 괜찮아요.", "It's okay if you don't have an answer yet.")} onChange={e => setState(s => reviseQuestion(s, selected.id, {answer:e.target.value}))}/></label>{selectedBook ? <QuestionCoach sourceText={selectedBook.pages[selected.page ?? 0] ? (state.locale === "ko" ? selectedBook.pages[selected.page ?? 0].text : selectedBook.pages[selected.page ?? 0].en || selectedBook.pages[selected.page ?? 0].text) : ""} studentQuestion={selected.text}/> : null}<div className="row wrap"><button className="button secondary" onClick={() => {setState(s => reviseQuestion(s, selected.id, {answer: selected.answer})); toast(t("지금의 생각을 기록했어요.", "Your thoughts are saved."));}}><Icon name="check" size={15}/>{t("생각 기록", "Save thoughts")}</button><button className="button ghost" onClick={() => {setState(s => reviseQuestion(s, selected.id, {shared: !selected.shared})); toast(selected.shared ? t("나만의 질문으로 바꿨어요.", "Your question is private again.") : t("샘플 생각 나눔터에 공유했어요. 실제 외부 전송은 없습니다.", "Shared on the local sample board. Nothing was sent externally."));}}><Icon name="users" size={15}/>{selected.shared ? t("공유 거두기", "Unshare") : t("우리 반에 공유", "Share with class")}</button></div><button className="text-button story-bridge" onClick={() => {setState(s => ({...s, project: {...s.project, sourceQuestionId: selected.id}})); router.push(`/studio?question=${selected.id}${query.context === "journey" ? "&context=journey" : ""}`);}}><Icon name="pencil" size={16}/>{t("이 질문에서 이야기 만들기", "Turn this question into a story")}<Icon name="arrow" size={16}/></button></div></>}</section></div> : <section className="question-square"><div className="square-heading"><span className="eyebrow">{t("서로 다른 마음과 이야기", "MANY MINDS, MANY STORIES")}</span><h2>{t("같은 이야기, 서로 다른 궁금함", "One story. Many perspectives.")}</h2><p>{t("친구의 질문을 만나기 전에 내 질문을 먼저 떠올려 봐요.", "Before exploring other questions, take a moment to think of your own.")}</p></div><div className="shared-questions">{peerQuestions.map((q, i) => <article className={`shared-question sample-${i}`} key={q.ko}><span className="badge">{t("공유 질문 샘플", "Sample shared question")}</span><h3>{t(q.ko, q.en)}</h3><span className="muted">{t(q.theme, q.themeEn)}</span><Link className="text-button" href="/reader/wind-post?page=2"><Icon name="book" size={15}/>{t("본문에서 생각해 보기", "Explore in the story")}</Link></article>)}{state.questions.filter(q => q.shared).map(q => <article className="shared-question mine" key={q.id}><span className="badge">{t("내가 공유한 질문", "My shared question")}</span><h3>{q.text}</h3><button className="text-button" onClick={() => {setTab("mine"); setSelectedId(q.id);}}>{t("내 생각 이어가기", "Continue my thinking")}<Icon name="arrow" size={15}/></button></article>)}</div><button className="button primary" onClick={() => setTab("mine")}><Icon name="plus" size={17}/>{t("나의 질문 만들기", "Make my own question")}</button></section>}
  </>;
}
