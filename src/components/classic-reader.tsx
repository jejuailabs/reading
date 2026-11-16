"use client";

import Link from "./workspace-link";
import {useEffect, useRef, useState} from "react";
import type {Book, Locale} from "@/lib/model";
import {recordEvent} from "@/lib/model";
import audioManifest from "@/lib/classic-audio.json";
import aiAudioManifest from "@/lib/classic-ai-audio.json";
import {classicSources} from "@/lib/classic-sources";
import {useReading} from "./provider";
import {BookCover, WorkspaceBack} from "./ui";
import {Icon} from "./icons";

type AudioEntry = {src: string; duration: number; sha256: string};
const narration = audioManifest.books as Record<string, Record<Locale, AudioEntry[]>>;
const aiNarration = aiAudioManifest.books as Record<string, {ko: AudioEntry}>;

export function ClassicReaderWorkspace({book, query}: {book: Book; query: Record<string, string>}) {
  const {state, setState, t, toast} = useReading();
  const [fontSize, setFontSize] = useState(24);
  const [rate, setRate] = useState(1);
  const [continuous, setContinuous] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [audioMode, setAudioMode] = useState<"scene"|"ai">(aiNarration[book.id]?.ko ? "ai" : "scene");
  const player = useRef<HTMLAudioElement>(null);
  const continuePlayback = useRef(false);
  const page = Math.max(0, Math.min(book.pages.length - 1, state.positions[book.id] ?? 0));
  const scene = book.pages[page];
  const aiAudio = state.locale === "ko" ? aiNarration[book.id]?.ko : undefined;
  const wholeBookAudio = audioMode === "ai" && Boolean(aiAudio);
  const audio = wholeBookAudio ? aiAudio : narration[book.id]?.[state.locale]?.[page];
  const source = classicSources[book.id];
  const journey = query.context === "journey" && state.journeyBookId === book.id && state.enabled.read;

  useEffect(() => {
    const requested = Number(query.page);
    setState(s => {
      const next = query.page !== undefined && Number.isInteger(requested) ? Math.max(0, Math.min(book.pages.length - 1, requested)) : s.positions[book.id] ?? 0;
      return s.positions[book.id] === next ? s : {...s, positions: {...s.positions, [book.id]: next}};
    });
  }, [book.id, book.pages.length, query.page, setState]);

  useEffect(() => {
    setPlaying(false);
    setAudioError(false);
    const element = player.current;
    if (!element) return;
    element.playbackRate = rate;
    if (continuePlayback.current) {
      continuePlayback.current = false;
      void element.play().catch(() => toast(t("다음 장면의 재생 버튼을 눌러 주세요.", "Press play to continue with the next scene.")));
    }
    return () => { element.pause(); };
    // Rate changes have their own effect and must not restart a scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio?.src]);

  useEffect(() => { if (player.current) player.current.playbackRate = rate; }, [rate]);

  function goTo(next: number, keepPlaying = false) {
    if (!wholeBookAudio) player.current?.pause();
    continuePlayback.current = keepPlaying;
    setState(s => ({...s, positions: {...s.positions, [book.id]: next}}));
  }

  async function togglePlayback() {
    const element = player.current;
    if (!element) return;
    if (!element.paused) { element.pause(); return; }
    try { await element.play(); }
    catch { setAudioError(true); }
  }

  const contextSuffix = journey ? "&context=journey" : "";
  return <>
    <div className="classic-screen">
      <div className="workspace-top"><WorkspaceBack journey={journey}/><span className="badge">{book.collection === "korean" ? t("우리나라 전래동화", "Korean folktale") : t("이솝우화", "Aesop's fable")}</span></div>
      <div className="reader-heading"><div><span className="eyebrow">{t("오래된 이야기에서 새로운 질문을", "OLD STORIES, NEW QUESTIONS")}</span><h1>{t(book.title, book.en)}</h1><p className="muted">{t(book.subtitle, book.subtitleEn)}</p></div><span className="badge">{t("어린이용 재서술", "Retold for children")}</span></div>
      <div className="classic-reading-layout">
        <div className="classic-reading-main">
          <article className="classic-paper" aria-label={t("이야기 본문", "Story text")}>
            <div className="classic-paper-heading"><span className="tiny-label">{book.collection === "korean" ? "KOREAN FOLKTALE" : "AESOP'S FABLE"}</span><span>{page + 1} / {book.pages.length}</span></div>
            <p className="classic-story-text" lang={state.locale} style={{fontSize}}>{t(scene.text, scene.en)}</p>
            <div className="classic-paper-footer"><Icon name="leaf" size={17}/><span>{page === book.pages.length - 1 ? t("이야기는 여기까지. 나의 생각은 계속돼요.", "The story ends here. Your thinking goes on.") : t("천천히, 나의 속도로 읽어요.", "Take your time. Read at your own pace.")}</span></div>
          </article>
          <div className="classic-page-tools">
            <div className="row"><button className="type-button" disabled={fontSize <= 18} onClick={() => setFontSize(n => Math.max(18,n-2))} aria-label={t("글자 작게", "Smaller text")}>A−</button><output aria-label={t("글자 크기", "Text size")}>{fontSize}</output><button className="type-button" disabled={fontSize >= 34} onClick={() => setFontSize(n => Math.min(34,n+2))} aria-label={t("글자 크게", "Larger text")}>A+</button></div>
            <nav className="pagination" aria-label={t("장면 이동", "Scene navigation")}><button className="icon-button" disabled={page === 0} onClick={() => goTo(page-1)} aria-label={t("이전 장면", "Previous scene")}><Icon name="back"/></button><span aria-live="polite">{page+1} / {book.pages.length}</span><button className="icon-button" disabled={page === book.pages.length-1} onClick={() => goTo(page+1)} aria-label={t("다음 장면", "Next scene")}><Icon name="arrow"/></button></nav>
          </div>
          <section className={`classic-audio-panel ${query.listen === "1" ? "audio-highlight" : ""}`} aria-label={t("이야기 듣기", "Listen to the story")}>
            {aiAudio ? <div className="segmented narration-mode" aria-label={t("낭독 방식", "Narration mode")}><button aria-pressed={!wholeBookAudio} onClick={()=>{continuePlayback.current=false;setAudioMode("scene");}}>{t("장면별 기기 음성", "Scene narration")}</button><button aria-pressed={wholeBookAudio} onClick={()=>{continuePlayback.current=false;setAudioMode("ai");}}>{t("책 전체 AI 낭독", "Whole-book AI narration")}</button></div> : null}<div className="classic-audio-heading"><Icon name="headphones"/><div><h2>{t("귀로도 펼쳐요", "Open the story with your ears")}</h2><p>{wholeBookAudio ? t("AI가 읽는 책 전체 · 화면을 자유롭게 넘기며 들어요", "AI narration of the whole book · Turn pages at your own pace") : t("기기 음성으로 미리 만든 낭독 · 현재 장면부터 듣기", "Prepared device narration · Listen from this scene")}</p></div></div>
            {audio ? <><div className="classic-audio-play"><button className="button primary" onClick={togglePlayback} aria-label={playing ? t("낭독 일시정지", "Pause narration") : t("낭독 재생", "Play narration")}><Icon name={playing ? "stop" : "play"} size={17}/>{playing ? t("잠깐 멈추기", "Pause") : wholeBookAudio ? t("책 전체 듣기", "Play the whole book") : t("이 장면 듣기", "Play this scene")}</button><audio key={audio.src} ref={player} controls preload="metadata" src={audio.src} aria-label={wholeBookAudio ? t(`${book.title} 책 전체 AI 낭독`, `${book.en}, whole-book AI narration`) : t(`${book.title} ${page+1}장면 낭독`, `${book.en}, scene ${page+1} narration`)} onPlay={() => {setPlaying(true); setAudioError(false);}} onPause={() => setPlaying(false)} onError={() => setAudioError(true)} onEnded={() => {setPlaying(false); if (!wholeBookAudio && continuous && page < book.pages.length-1) goTo(page+1,true);}}/></div><div className="classic-audio-options"><label>{t("읽는 속도", "Playback speed")}<select value={rate} onChange={e => setRate(Number(e.target.value))}>{[0.75,1,1.25,1.5].map(value => <option key={value} value={value}>{value}×</option>)}</select></label>{!wholeBookAudio ? <label><input type="checkbox" checked={continuous} onChange={e => setContinuous(e.target.checked)}/>{t("다음 장면 이어 듣기", "Continue to the next scene")}</label> : <span>{t("화면 장면은 자동으로 넘어가지 않아요.", "Pages do not turn automatically.")}</span>}<a className="text-button" href={audio.src} download>{wholeBookAudio ? t("책 전체 음성 저장", "Save whole-book audio") : t("이 장면 음성 저장", "Save this scene's audio")}</a></div></> : <p>{t("이 장면의 낭독 파일을 준비하고 있어요.", "Narration for this scene is being prepared.")}</p>}
            {audioError ? <p role="alert" className="form-error">{t("음성을 재생하지 못했어요. 재생을 다시 누르거나 음성 파일을 저장해 들어 보세요.", "The audio could not play. Try play again, or save the audio file.")}</p> : null}
          </section>
        </div>
        <aside className="classic-book-details"><BookCover book={book}/><p>{t("모음 표지 그림", "Collection cover illustration")}</p><label className="field"><span>{t("장면 골라 읽기", "Choose a scene")}</span><select value={page} onChange={e => goTo(Number(e.target.value))}>{book.pages.map((_,index) => <option key={index} value={index}>{t(`${index+1}장면`, `Scene ${index+1}`)}</option>)}</select></label><p className="muted">{t(`권장 ${book.gradeBand}학년 · 함께 읽기는 전 학년`, `Suggested grades ${book.gradeBand} · All ages with support`)}</p><Link className="button secondary full" href={`/learn/${book.id}`}>{t("읽기 기록지 만들기", "Create a reading worksheet")}</Link></aside>
      </div>
      <div className="reader-prompt"><span className="round-icon"><Icon name="question" size={23}/></span><div><h3>{t("이번 장면에서 무엇이 궁금했나요?", "What made you curious in this scene?")}</h3><p>{t("다른 질문을 보기 전에, 내 궁금함부터 남겨요.", "Before reading other questions, write down your own.")}</p></div><Link className="button primary" href={`/inquiry?book=${book.id}&page=${page}${contextSuffix}`}>{t("내 질문 남기기", "Ask my question")}<Icon name="arrow" size={17}/></Link></div>
      <details className="classic-guide"><summary>{t("생각을 넓히는 읽기 활동", "Activities to extend your thinking")}</summary><p>{t("정답을 맞히는 시험이 아니에요. 내 질문을 먼저 적은 뒤, 필요한 도움을 골라요.", "This is not a test. Write your own question first, then choose a helpful prompt.")}</p><div className="classic-guide-grid">{book.guide?.map(item => <article key={item.kind}><span className="badge">{item.kind === "notice" ? t("본문에서 찾기", "Find in the story") : item.kind === "infer" ? t("단서로 추론하기", "Infer from clues") : t("내 질문 만들기", "Make your own question")}</span><p>{t(item.text,item.en)}</p></article>)}</div></details>
      <details className="classic-source"><summary>{t("이 판본과 출처", "About this edition and its source")}</summary><p>{t("옛이야기의 줄거리를 바탕으로 이 샘플을 위해 새로 풀어 쓴 한국어·영어 재서술본입니다. 특정 현대 출판물의 본문·번역·삽화를 가져오지 않았습니다. 모음 표지는 별도로 생성한 그림이며 각 장면을 재현한 삽화는 아닙니다.", "This Korean and English sample was newly retold from an old tale. It does not reproduce a modern publication's text, translation, or artwork. The generated collection cover is not an illustration of each scene.")}</p>{source ? <><p>{t(source.note,source.noteEn)}</p><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></> : null}<p>{t("장면별 낭독은 설치된 기기 음성으로 만들었습니다. 책 전체 AI 낭독이 있는 경우 OpenAI 합성음으로 표시합니다. 모두 사람이 녹음한 오디오북은 아닙니다.", "Scene narration uses installed device voices. Whole-book AI narration, where available, uses OpenAI synthesized speech. Neither is a human-recorded audiobook.")}</p></details>
      {journey ? <button className="text-button" onClick={() => {setState(s => recordEvent({...s,evidence:{...s.evidence,read:"self_report"}},"reading.self_reported",book.id)); toast(t("오늘 읽기 참여를 기록했어요.", "Today's reading participation was noted."));}}><Icon name="check"/>{t("오늘 읽기 참여 기록", "Note today's reading")}</button> : null}
    </div>
    <article className="classic-print-book"><header><h1>{t(book.title,book.en)}</h1><p>{t("온책읽기 · 어린이용 재서술본", "Onbook · A retelling for children")}</p><p>{t(book.subtitle,book.subtitleEn)}</p></header>{book.pages.map((item,index) => <section className="classic-print-page" key={index}><h2>{t(`${index+1}장면`, `Scene ${index+1}`)}</h2><p>{t(item.text,item.en)}</p><footer>{index+1} / {book.pages.length}</footer></section>)}<section className="classic-print-page"><h2>{t("내가 만든 질문", "My own questions")}</h2><p>{t("어떤 장면이 궁금했나요? 왜 궁금했나요?", "Which scene made you wonder? Why?")}</p><div className="print-writing-lines"/><p>{t("줄거리를 바탕으로 새로 풀어 쓴 샘플 판본입니다.", "A newly written sample retelling of an old story.")}</p>{source ? <small>{source.title} · {source.url}</small> : null}</section></article>
  </>;
}
