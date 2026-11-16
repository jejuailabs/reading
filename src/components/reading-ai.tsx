"use client";

import {useEffect, useId, useRef, useState} from "react";
import type {GradeBand, QuestionCoaching, ReadingAiInput, StoryOutline, StoryOutlines, WorksheetContext} from "@/lib/server/reading-ai";
import {useReading} from "./provider";
import {Icon} from "./icons";

function useAiRequest<T>(resetKey: string) {
  const {t} = useReading();
  const [result, setResult] = useState<{key:string;value:T} | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const version = useRef(0);
  const latestKey = useRef(resetKey);
  latestKey.current = resetKey;
  useEffect(() => {
    version.current++;
    request.current?.abort();
    setResult(null); setError(""); setPending(false);
    return () => {version.current++; request.current?.abort();};
  }, [resetKey]);

  async function run(input: ReadingAiInput) {
    if (pending || (request.current && !request.current.signal.aborted)) return;
    const current = ++version.current;
    const controller = new AbortController();
    request.current = controller;
    setPending(true); setError(""); setResult(null);
    try {
      const options = {method: "POST", credentials: "same-origin" as const, headers: {"Content-Type":"application/json"}, signal: controller.signal};
      const session = await fetch("/api/reading-ai", {...options,body:JSON.stringify({operation:"pilot-session"})});
      if (!session.ok) throw new Error("AI_UNAVAILABLE");
      const response = await fetch("/api/reading-ai", {...options,body:JSON.stringify(input)});
      const data = await response.json();
      if (!response.ok || !data.result) throw new Error(typeof data.code === "string" ? data.code : "AI_UNAVAILABLE");
      if (version.current === current && latestKey.current === resetKey) setResult({key:resetKey,value:data.result as T});
    } catch (cause) {
      if (controller.signal.aborted || version.current !== current || latestKey.current !== resetKey) return;
      const code = cause instanceof Error ? cause.message : "";
      setError(code.includes("LIMIT") || code.includes("BUDGET") ? t("이번 AI 체험의 사용 한도에 도달했어요. 직접 생각을 이어갈 수 있어요.", "This AI preview has reached its limit. You can continue developing your own ideas.") : t("지금은 AI 도움을 받지 못했어요. 자동으로 다시 요청하지 않았으며, 작성한 내용은 그대로예요.", "AI help is unavailable right now. No automatic retry was made, and your writing is unchanged."));
    } finally { if (request.current === controller) request.current = null; if (version.current === current) setPending(false); }
  }
  return {result:result?.key === resetKey ? result.value : null,pending,error,run};
}

export function FormQuestionCoach(props: {sourceText:string; sourceLabel:string; context:WorksheetContext; gradeBand:GradeBand; studentQuestion?:string; scopeKey:string}) {
  return <FormQuestionCoachContent key={`${props.scopeKey}|${props.studentQuestion ?? ""}`} {...props}/>;
}

function FormQuestionCoachContent({sourceText,sourceLabel,context,gradeBand,studentQuestion = "",scopeKey}: {sourceText:string; sourceLabel:string; context:WorksheetContext; gradeBand:GradeBand; studentQuestion?:string; scopeKey:string}) {
  const {state,t} = useReading();
  const id = useId();
  const [myQuestion,setMyQuestion] = useState(studentQuestion);
  const effectiveQuestion = myQuestion.trim() || t("이 문항에서 무엇을 살펴볼까?", "What could I look at for this prompt?");
  const resetKey = JSON.stringify([scopeKey,state.locale,gradeBand,sourceText,context,effectiveQuestion]);
  const {result,pending,error,run} = useAiRequest<QuestionCoaching>(resetKey);
  const hasText = sourceText.trim().length >= 10 && sourceText.length <= 12000;
  const validQuestion = effectiveQuestion.length >= 3 && effectiveQuestion.length <= 500;
  return <details className="ai-question-coach learning-form-coach"><summary><Icon name="sparkle" size={17}/>{t("이 문항에서 막혔나요? · AI 질문 도움", "Stuck on this prompt? · Optional AI hints")}</summary>
    <p>{t("내 질문을 먼저 떠올려요. AI는 쉬운 확인 질문과 추론 힌트를 제안하며 이 칸의 답을 대신 쓰거나 저장하지 않아요.", "Start with your own question. AI can suggest a simple question and a clue to connect, without writing or saving your answer.")}</p>
    <p className="muted">{sourceLabel} · {t("현재 한 장면만 사용해요. 양식 안내는 본문 근거가 아니에요.", "Only this scene is used. Worksheet instructions are not story evidence.")}</p>
    {!hasText ? <p className="info-banner">{t("지금은 참고할 본문이 없거나 길이 범위를 벗어나 AI 질문 도움을 사용할 수 없어요. 종이책·외부 링크·그림만 있는 자료는 실제 책을 보며 내 질문을 직접 적어 주세요.", "AI hints need a supported passage. For paper books, links or image-only pages, look at the actual book and write your own question.")}</p> : <>
      <label className="field" htmlFor={id}><span>{t("먼저 떠오른 내 질문 · 선택", "My first question · optional")}</span><textarea id={id} rows={2} maxLength={500} value={myQuestion} onChange={event => setMyQuestion(event.target.value)} placeholder={t("이 문항을 보며 무엇이 궁금했나요?", "What does this prompt make you wonder?")}/></label>
      <p className="muted">{t("이 칸은 도움 요청용이에요. 내 질문 목록이나 답변에 자동으로 추가하지 않아요.", "This box is for the hint request. It is not added automatically to your question list or response.")}</p>
      {!myQuestion.trim() ? <p className="muted">{t("내 질문이 아직 없으면 ‘이 문항에서 무엇을 살펴볼까?’라는 양식 도움 문구로 요청해요. 학생이 만든 질문으로 기록하지 않아요.", "If you do not have a question yet, the request uses ‘What could I look at for this prompt?’ as a worksheet hint starter. It is not recorded as your own question.")}</p> : null}
      <button className="button secondary" disabled={pending || !validQuestion} onClick={() => void run({operation:"questions",gradeBand,locale:state.locale,sourceText,studentQuestion:effectiveQuestion,worksheetContext:context})}><Icon name="sparkle" size={17}/>{pending ? t("문항의 힌트를 준비하고 있어요…", "Preparing hints for this prompt…") : t("이 문항의 질문 힌트 요청", "Request hints for this prompt")}</button>
      <p className="learning-input-note">{t("기존 AI 체험의 승인·남은 한도 안에서 요청해요. 문항이나 장면을 바꾸면 이전 도움은 화면에서 지워지며, 새 요청은 버튼을 눌러야 실행돼요.", "Requests use the existing AI preview approval and remaining limit. Changing prompts or scenes clears old hints; a new request requires another click.")}</p>
    </>}
    {pending ? <p role="status">{t("지금 문항과 제공된 한 장면을 살펴보고 있어요.", "Looking at this prompt and the supplied scene.")}</p> : null}{error ? <p role="alert" className="form-error">{error}</p> : null}
    {result && hasText ? <div className="ai-coaching-result"><span className="badge">{t("AI가 제안한 질문 도움 · 미저장", "AI questioning hints · Not saved")}</span><p>{result.coaching}</p>{result.evidenceQuote ? <blockquote>{result.evidenceQuote}</blockquote> : null}<p>{result.evidencePrompt}</p><ul>{result.questionStarters.map(item => <li key={item.kind}><strong>{item.kind === "literal" ? t("쉬운 확인 질문", "Look closely") : t("단서 이어 보기", "Connect clues")}</strong><span>{item.text}</span></li>)}</ul><p className="muted">{t("도움이 된 질문을 골라 내 말로 다시 생각해 보세요. 남기고 싶은 생각은 위의 답변 칸에 직접 적어요.", "Choose a useful question and think in your own words. Write any thoughts you want to keep in your response field.")}</p>{state.role !== "student" ? <p className="muted">{result.teacherReviewNote}</p> : null}</div> : null}
  </details>;
}

export function QuestionCoach({sourceText,studentQuestion}: {sourceText:string;studentQuestion:string}) {
  const {state,t} = useReading();
  const [gradeBand,setGradeBand] = useState<"1-2"|"3-4"|"5-6">("3-4");
  const {result,pending,error,run} = useAiRequest<QuestionCoaching>(`${state.locale}|${gradeBand}|${sourceText}|${studentQuestion}`);
  return <details className="ai-question-coach"><summary><Icon name="sparkle" size={17}/>{t("내 질문을 더 또렷하게", "Make my question clearer")}</summary><p>{t("질문은 내가 만들고, AI에게는 생각을 넓히는 힌트만 부탁해요. 답을 대신 쓰거나 내 질문을 바꾸지 않아요.", "You make the question. Ask AI only for hints to explore it; your question and answer will not be replaced.")}</p><div className="row wrap"><label className="ai-grade-field">{t("학년군", "Grade band")}<select value={gradeBand} onChange={e=>setGradeBand(e.target.value as typeof gradeBand)}><option value="1-2">1–2</option><option value="3-4">3–4</option><option value="5-6">5–6</option></select></label><button className="button secondary" disabled={pending || studentQuestion.trim().length<3 || sourceText.length<10} onClick={()=>run({operation:"questions",gradeBand,sourceText,studentQuestion,locale:state.locale})}><Icon name="sparkle" size={16}/>{pending ? t("힌트를 생각하고 있어요…", "Preparing a hint…") : t("내 질문을 위한 힌트 받기", "Get a hint for my question")}</button></div>{pending ? <p role="status">{t("내 질문과 본문을 함께 살펴보고 있어요.", "Looking at your question and the story together.")}</p> : null}{error ? <p role="alert" className="form-error">{error}</p> : null}{result ? <div className="ai-coaching-result"><span className="badge">{t("AI가 제안한 생각의 도움", "AI suggestions for your thinking")}</span><p>{result.coaching}</p>{result.evidenceQuote ? <blockquote>{result.evidenceQuote}</blockquote> : null}<p>{result.evidencePrompt}</p><ul>{result.questionStarters.map(item=><li key={item.kind}><strong>{item.kind === "literal" ? t("확인해 보기", "Look closely") : t("단서 이어 보기", "Connect clues")}</strong><span>{item.text}</span></li>)}</ul><p className="muted">{t("도움이 된 부분만 골라 내 말로 고쳐 보세요. AI의 해석은 본문과 함께 확인해요.", "Choose what helps and put it in your own words. Check AI suggestions against the story.")}</p>{state.role !== "student" && result.teacherReviewNote ? <p className="muted">{result.teacherReviewNote}</p> : null}</div> : null}</details>;
}

export function AiStoryPlanner({place,topic,grade,onSelect}: {place:string;topic:string;grade:string;onSelect:(outline:StoryOutline)=>void}) {
  const {state,t} = useReading();
  const [storyType,setStoryType] = useState("생활 동화");
  const gradeBand = grade.replace(/[–—]/g,"-") as "1-2"|"3-4"|"5-6";
  const {result,pending,error,run} = useAiRequest<StoryOutlines>(`${state.locale}|${grade}|${place}|${topic}|${storyType}`);
  return <section className="surface ai-story-planner"><div className="panel-title"><h2>{t("AI와 이야기 구상하기", "Plan a story with AI")}</h2><Icon name="sparkle"/></div><p>{t("위에서 고른 지역·학년·주제로 서로 다른 구성안 3개를 받아요. 마음에 드는 안을 골라 교사가 다듬습니다.", "Get three different outlines for the setting, grade, and topic above. Choose one and revise it yourself.")}</p><div className="row wrap"><label className="ai-grade-field">{t("이야기 타입", "Story type")}<select value={storyType} onChange={e=>setStoryType(e.target.value)}><option value="생활 동화">{t("생활 동화", "Everyday story")}</option><option value="모험 동화">{t("모험 동화", "Adventure")}</option><option value="자연 관찰 동화">{t("자연 관찰 동화", "Nature story")}</option><option value="전래동화 새로 쓰기">{t("전래동화 새로 쓰기", "Retelling a folktale")}</option></select></label><button className="button primary" disabled={pending || topic.trim().length<2} onClick={()=>run({operation:"story-outlines",gradeBand,place,topic,storyType,locale:state.locale})}><Icon name="sparkle" size={17}/>{pending ? t("이야기를 구상하고 있어요…", "Planning stories…") : t("새 이야기 3가지 제안받기", "Suggest three new stories")}</button></div>{pending ? <p role="status">{t("구성안을 만들고 있어요. 완성된 책으로 자동 저장하지 않아요.", "Preparing outlines. No finished book will be saved automatically.")}</p> : null}{error ? <p role="alert" className="form-error">{error}</p> : null}{result ? <><div className="ai-outline-grid">{result.outlines.map((outline,index)=><article key={outline.id}><span className="tiny-label">{t("새 구성안", "NEW OUTLINE")} 0{index+1}</span><h3>{outline.title}</h3><p>{outline.premise}</p><p><strong>{t("주인공", "Main character")}</strong> · {outline.mainCharacter}</p><ol>{outline.scenes.map((scene,i)=><li key={i}>{scene}</li>)}</ol><p className="ai-outline-question">{outline.discussionQuestion}</p>{outline.localFactsToVerify.length ? <details><summary>{t("지역 사실 확인할 것", "Local facts to check")}</summary><ul>{outline.localFactsToVerify.map(fact=><li key={fact}>{fact}</li>)}</ul></details> : null}<button className="button secondary full" onClick={()=>onSelect(outline)}>{t("이 구성으로 초안 시작", "Start a draft with this outline")}<Icon name="arrow" size={16}/></button></article>)}</div><p className="muted">{result.teacherReviewNote}</p></> : <p className="muted">{t("AI 구성안은 검토할 초안이에요. 실제 지역 정보와 아이들에게 적합한 표현을 확인해 주세요.", "AI outlines need review. Check real local facts and language for your class.")}</p>}</section>;
}
