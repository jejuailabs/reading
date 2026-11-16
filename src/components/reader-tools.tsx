"use client";

import Link from "./workspace-link";
import {useState,type ReactNode} from "react";
import {attachBook,toggleBookmark,type Book,type ReaderMode} from "@/lib/model";
import {exportBookPdf,downloadPdf} from "@/lib/pdf-export";
import {readerPdfPages,builtinPdfImage} from "@/lib/reader-pdf";
import {useReading} from "./provider";
import {BookToolIcon} from "./icons";

export function ReaderTools({book,children}:{book:Book;children:ReactNode}) {
  const {state,setState,t,toast}=useReading();
  const mode=state.readerModes[book.id]??"both";
  const setMode=(value:ReaderMode)=>setState(s=>({...s,readerModes:{...s.readerModes,[book.id]:value}}));
  const [presentation,setPresentation]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const page=Math.max(0,Math.min(book.pages.length-1,state.positions[book.id]??0));
  const bookmarks=state.bookmarks.filter(item=>item.bookId===book.id&&item.bookRevision===book.revision);
  const marked=bookmarks.some(item=>item.page===page);
  const metadata=book.source?.coverage==="metadata";
  const hasPictures=book.pages.some(p=>p.imageDataUrl)||(!book.collection&&!book.source&&!metadata);
  async function output(print:boolean) {
    if(busy||metadata)return;setBusy(true);setError("");
    const tab=print?window.open("about:blank","_blank"):null;
    if(print&&!tab){setError(t("인쇄 미리보기를 열 수 없어요. 팝업을 허용하거나 PDF를 내려받아 인쇄하세요.","Allow pop-ups for print preview, or download and print the PDF."));setBusy(false);return;}
    try {
      const blob=await exportBookPdf({title:t(book.title,book.en),subtitle:`${book.source?.author??"온책읽기"} · v${book.revision}${book.source?.coverage==="excerpt"?" · 발췌 / excerpt":""}`,pages:await readerPdfPages(book,state.locale,builtinPdfImage),paper:"A5",locale:state.locale});
      if(tab){tab.opener=null;const url=URL.createObjectURL(blob);tab.location.href=url;setTimeout(()=>URL.revokeObjectURL(url),300000);}else downloadPdf(blob,`${book.title}.pdf`);
    }catch(cause){tab?.close();setError(cause instanceof Error?cause.message:t("PDF를 만들지 못했어요. 원본은 유지됩니다.","PDF failed. Your original is unchanged."));}finally{setBusy(false);}
  }
  return <div className={`reader-experience reader-mode-${mode} ${presentation?"read-aloud-view":""}`}>
    <section className="reader-toolbox" aria-label={t("읽는 방법과 책갈피","Reading options and bookmarks")}>
      <div className="row wrap"><div className="segmented">{([ ["both","함께 보기","Text & pictures"],["text","글만 읽기","Text only"],["pictures","그림 살펴보기","Pictures only"] ] as const).map(([key,ko,en])=><button key={key} disabled={metadata||(key==="pictures"&&!hasPictures)} aria-pressed={mode===key} onClick={()=>setMode(key)}>{t(ko,en)}</button>)}</div><button className="button ghost" aria-pressed={presentation} onClick={()=>setPresentation(v=>!v)}>{presentation?t("함께 읽기 화면 닫기","Close shared reading view"):t("함께 읽어주기 화면","Shared read-aloud view")}</button></div>
      {book.collection?<p className="muted">{t("이 고전 판본은 본문과 모음 표지로 구성되어 있어요. 장면별 그림은 포함하지 않아요.","This edition has text and a collection cover, without scene illustrations.")}</p>:null}
      {book.source?.kind==="pdf"?<p className="muted">{t("PDF에서 추출한 글자만 담은 읽기본입니다. 원본의 삽화·배치는 포함되지 않으며 글자 없는 장면의 위치는 남깁니다.","This reading edition contains extracted PDF text only. Original illustrations and layout are not included; empty scene positions are kept.")}</p>:null}
      {book.source?<p className="muted">{t("가져온 자료","Imported source")} · {book.source.coverage==="metadata"?t("본문 없이 서지로 참여","Metadata only"):book.source.coverage==="excerpt"?t("발췌본 · 전권 아님","Excerpt, not the whole book"):t("등록 시 전체로 확인한 원고","Marked as complete at import")}{book.source.note?` · ${book.source.note}`:""}</p>:null}
      <div className="row wrap"><button className="button secondary" aria-pressed={marked} disabled={metadata} onClick={()=>{setState(s=>toggleBookmark(s,book,page));toast(marked?t("책갈피를 뺐어요.","Bookmark removed."):t("이 장면에 책갈피를 꽂았어요.","Page bookmarked."));}}><BookToolIcon name="bookmark"/>{marked?t("책갈피 빼기","Remove bookmark"):t("책갈피 꽂기","Bookmark this page")}</button>
      <label className="bookmark-select"><span>{t("내 책갈피","My bookmarks")}</span><select value="" onChange={e=>{if(e.target.value!=="")setState(s=>({...s,positions:{...s.positions,[book.id]:Number(e.target.value)}}));}}><option value="">{t(`${bookmarks.length}개 · 골라 이동`,`${bookmarks.length} bookmarks · Jump to`)}</option>{bookmarks.map(item=><option key={item.id} value={item.page}>{t(`${item.page+1}장면`, `Scene ${item.page+1}`)}</option>)}</select></label>
      <Link className="button primary" href={`/learn/${book.id}`}>{t("이 책으로 온책읽기","Reading activities for this book")}</Link><button className="button ghost" onClick={()=>{setState(s=>attachBook(s,book.id));toast(t("이야기 여정에 연결했어요. 이전 질문과 작품은 보존됩니다.","Connected to your journey. Previous questions and books are preserved."));}}>{t("이야기 여정에 연결","Connect to journey")}</button></div>
      <div className="row wrap"><button className="text-button" disabled={busy||metadata} onClick={()=>void output(false)}><BookToolIcon name="pdf"/>{busy?t("PDF 준비 중…","Preparing PDF…"):t("책 전체 PDF 다운로드","Download full book PDF")}</button><button className="text-button" disabled={busy||metadata} onClick={()=>void output(true)}>{t("책 PDF 인쇄 미리보기","Book PDF print preview")}</button><Link className="text-button" href="/guide">{t("사용 방법","How to use")}</Link></div>{error?<p role="alert" className="form-error">{error}</p>:null}
    </section>
    {metadata?<section className="surface learning-panel"><h1>{book.title}</h1><p>{book.source?.author}</p><p>{t("이 책의 본문은 등록되어 있지 않아요. 종이책이나 공식 링크에서 읽고, 읽은 쪽수와 자기 질문을 기록해요.","No book text has been uploaded. Read your paper copy or official link, then record pages and questions.")}</p>{book.source?.url?<a className="button secondary" href={book.source.url} target="_blank" rel="noreferrer">{t("공식 링크에서 책 읽기","Read at the official link")} ↗</a>:null}<Link className="button primary" href={`/learn/${book.id}`}>{t("읽은 내용 기록하기","Record my reading")}</Link></section>:children}
  </div>;
}
