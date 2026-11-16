"use client";
import Image from "next/image";
import {useEffect,useRef,useState} from "react";
import {useReading} from "./provider";
import {Icon} from "./icons";

export type BookImageSelection = {prompt:string;provider:"openai";model:"gpt-image-1.5"};
export function BookImageGenerator({prompt,onSelect}:{prompt:string;onSelect:(dataUrl:string,metadata:BookImageSelection)=>void|boolean}){
  const {t}=useReading();
  const [draft,setDraft]=useState(prompt),[ready,setReady]=useState(false),[checking,setChecking]=useState(false),[pending,setPending]=useState(false);
  const [result,setResult]=useState<string|null>(null),[error,setError]=useState(""),[reviewed,setReviewed]=useState(false),[imageReady,setImageReady]=useState(false);
  const generation=useRef(0),active=useRef<AbortController|null>(null);
  useEffect(()=>{generation.current++;active.current?.abort();setDraft(prompt);setResult(null);setError("");setPending(false);setReviewed(false);setImageReady(false);return()=>{generation.current++;active.current?.abort();};},[prompt]);
  async function checkApproval(){
    if(checking||pending)return;setChecking(true);setError("");
    try{const response=await fetch("/api/book-image",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({operation:"image-session"})});const data=await response.json();setReady(response.ok&&data.ready===true);if(!response.ok)setError(t("그림 생성은 별도 비용 승인과 로컬 설정 후 사용할 수 있어요.","Image generation needs separate cost approval and local configuration."));}
    catch{setReady(false);setError(t("승인 상태를 확인하지 못했어요. 그림 생성은 실행하지 않았어요.","Approval could not be checked. No image was generated."));}finally{setChecking(false);}
  }
  async function generate(){
    if(!ready||pending||!draft.trim()||draft.length>2000)return;
    const current=++generation.current,controller=new AbortController();active.current=controller;setPending(true);setError("");setResult(null);setReviewed(false);setImageReady(false);
    try{
      const response=await fetch("/api/book-image",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify({operation:"generate-image",prompt:draft,idempotencyKey:crypto.randomUUID()})});
      const data=await response.json();if(!response.ok||typeof data.result?.dataUrl!=="string"||!data.result.dataUrl.startsWith("data:image/jpeg;base64,"))throw new Error(typeof data.code==="string"?data.code:"IMAGE_UNAVAILABLE");
      if(generation.current===current)setResult(data.result.dataUrl);
    }catch(cause){if(controller.signal.aborted||generation.current!==current)return;const code=cause instanceof Error?cause.message:"";if(code.includes("APPROVAL")||code.includes("SESSION"))setReady(false);setError(code.includes("LIMIT")?t("승인된 그림 생성 한도에 도달했어요.","The approved image-generation limit has been reached."):t("그림을 완성하지 못했어요. 자동 재시도하지 않았으며 원고는 그대로예요. 요청의 사용 기록을 먼저 확인해 주세요.","The image could not be completed. No automatic retry was made and your writing is unchanged. Check the request record before trying again."));}
    finally{if(generation.current===current)setPending(false);}
  }
  return <section className="surface ai-story-planner"><div className="panel-title"><h3>{t("이 장면의 그림 만들기","Illustrate this scene")}</h3><Icon name="sparkle"/></div>
    <p className="muted">{t("별도 승인된 로컬 개발 검증에서만 그림 한 장을 만들어요. 생성 결과는 검토한 뒤 직접 채택하며 원고는 바꾸지 않아요.","Generate one image only within a separately approved local development pilot. Review and choose the result; your writing stays unchanged.")}</p>
    <p className="muted">GPT Image 1.5 · 1024 × 1024 · {t("중간 품질 · 1장 US$0.034 + 입력 100만 토큰당 US$5. 준비된 개발 상한은 8회·US$1이며 아직 승인 자체를 뜻하지 않습니다.","Medium quality · US$0.034 per image plus US$5 per million input tokens. The prepared development cap is 8 calls / US$1; this does not itself grant approval.")}</p>
    <label className="field"><span>{t("그림으로 표현할 장면","Scene to illustrate")}</span><textarea value={draft} maxLength={2000} disabled={pending} onChange={event=>{generation.current++;setDraft(event.target.value);setResult(null);setReviewed(false);setImageReady(false);}}/><small>{draft.length} / 2000 · {t("학생 실명·개인정보는 넣지 마세요.","Leave out student names and private information.")}</small></label>
    <div className="row wrap"><button className="button secondary" disabled={checking||pending} onClick={checkApproval}>{checking?t("확인 중…","Checking…"):t("승인 상태 확인","Check approval")}</button><button className="button primary" disabled={!ready||checking||pending||!draft.trim()||draft.length>2000} onClick={generate}><Icon name="sparkle" size={16}/>{pending?t("그림을 만들고 있어요…","Creating an image…"):t("그림 한 장 생성","Generate one image")}</button></div>
    {!ready?<p className="muted">{t("현재 생성 버튼은 잠겨 있어요. 비용 승인 전에는 실제 그림 API를 호출하지 않아요.","Generation is locked. No image API is called before cost approval.")}</p>:null}
    {pending?<p role="status">{t("이 장면의 그림을 기다리고 있어요. 화면을 떠나도 이미 시작된 요청 비용이 취소된다고 보장하지 않아요.","Waiting for this scene's image. Leaving this screen does not guarantee cancellation of an already-started request.")}</p>:null}
    {error?<p className="form-error" role="alert">{error}</p>:null}
    {result?<div className="stack"><span className="badge">{t("AI 그림 초안 · 검토 후 채택","AI illustration draft · Review before use")}</span><Image src={result} unoptimized width={1024} height={1024} alt={t("현재 장면을 위해 생성한 그림 초안","Generated illustration draft for this scene")} style={{width:"100%",maxWidth:440,height:"auto",borderRadius:12}} onLoad={()=>setImageReady(true)} onError={()=>{setImageReady(false);setError(t("그림 파일을 표시하지 못했어요. 채택하지 않고 원고를 유지합니다.","The image could not be displayed. It will not be applied to your book."));}}/><label className="checkbox"><input type="checkbox" checked={reviewed} onChange={event=>setReviewed(event.target.checked)}/>{t("본문과 맞는지, 아이들에게 적합한지 확인했어요.","I checked that this image fits the text and is appropriate for the children.")}</label><button className="button primary" disabled={!reviewed||!imageReady} onClick={()=>{if(onSelect(result,{prompt:draft,provider:"openai",model:"gpt-image-1.5"})===false)return;setResult(null);setReviewed(false);setImageReady(false);}}>{t("이 그림을 현재 장면에 사용","Use this image in the current scene")}</button></div>:null}
  </section>;
}
