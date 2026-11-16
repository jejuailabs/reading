"use client";

import Link from "./workspace-link";
import {useState} from "react";
import {createImportedBook, readImageFile, textPages} from "@/lib/book-intake";
import {extractPdfText} from "@/lib/pdf-intake";
import {recordEvent, type BookSource, type StoryPage} from "@/lib/model";
import {useReading} from "./provider";
import {BookArtwork} from "./artwork";
import {BookToolIcon, Icon} from "./icons";

export function BookIntake() {
  const {setState,t}=useReading();
  const [kind,setKind]=useState<BookSource["kind"]>("text");
  const [title,setTitle]=useState(""); const [author,setAuthor]=useState(""); const [url,setUrl]=useState("");
  const [text,setText]=useState(""); const [images,setImages]=useState<string[]>([]);
  const [rights,setRights]=useState<BookSource["rights"]>("own");
  const [coverage,setCoverage]=useState<"full"|"excerpt">("full"); const [note,setNote]=useState("");
  const [confirmed,setConfirmed]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [notice,setNotice]=useState(""); const [created,setCreated]=useState("");
  const metadata=kind==="paper"||kind==="link";
  async function loadFile(file:File|undefined) {
    if(!file)return; setBusy(true);setError("");setNotice("");setConfirmed(false);
    try {
      if(kind==="pdf") {
        const result=await extractPdfText(file,(current,total)=>setNotice(t(`${current}/${total}쪽을 기기에서 읽고 있어요.`,`Reading page ${current}/${total} on this device.`)));
        setText(result.text); setNotice(t(`${result.total}쪽에서 글자만 추출했어요. 원본 삽화·배치는 포함되지 않아요. 원문과 순서·빠진 글자를 확인하세요.${result.blankPages.length?` 글자 없는 쪽: ${result.blankPages.join(", ")}.`:""}`,`Extracted ${result.total} pages as text only, without original illustrations or layout. Check reading order and missing text.${result.blankPages.length?` Pages without text: ${result.blankPages.join(", ")}.`:""}`));
      } else {
        if(file.size>800_000)throw new Error(t("텍스트 파일은 800KB 이하로 준비해 주세요.","Use a text file under 800KB."));
        const body=await file.text(); if(body.includes("\uFFFD"))throw new Error(t("UTF-8 텍스트로 다시 저장해 주세요.","Save the file as UTF-8 text."));
        if(body.length>200_000)throw new Error(t("20만 자 이하로 나누어 주세요.","Split text longer than 200,000 characters."));
        setText(body);setNotice(t("내용을 읽었어요. 제목과 본문을 확인한 뒤 등록하세요.","Review the title and text before adding."));
      }
      setTitle(current=>current.trim()?current:file.name.replace(/\.[^.]+$/,""));
    } catch(cause){setError(cause instanceof Error?cause.message:t("파일을 읽지 못했어요.","Could not read this file."));}
    finally{setBusy(false);}
  }
  async function addImages(files:FileList|null) {
    if(!files?.length)return;setBusy(true);setError("");
    try {
      if(images.length+files.length>24)throw new Error(t("이미지는 최대 24장까지 추가해 주세요.","Add up to 24 page images."));
      const next:string[]=[];for(const file of Array.from(files))next.push(await readImageFile(file));
      setImages(current=>[...current,...next]);setConfirmed(false);
    }catch(cause){setError(cause instanceof Error?cause.message:"Image error");}finally{setBusy(false);}
  }
  function create() {
    setError("");
    try {
      if(!confirmed)throw new Error(t("자료 범위와 내용을 확인해 주세요.","Confirm the source and content first."));
      let pages:StoryPage[]=metadata?[{text:"",en:"",art:"forest"}]:kind==="images"?images.map(imageDataUrl=>({text:"",en:"",art:"forest",imageDataUrl})):textPages(text);
      if(kind==="images"&&text.trim()) {
        const texts=text.split(/\n\s*---\s*\n/);
        if(texts.length>images.length)throw new Error(t("본문 구역 수가 이미지 수보다 많아요. --- 구분을 확인하세요.","There are more text sections than images. Check the --- separators."));
        pages=pages.map((p,i)=>({...p,text:texts[i]?.trim()??""}));
      }
      const book=createImportedBook({title,pages,source:{kind,author,url,rights:metadata?"reference":rights,coverage:metadata?"metadata":coverage,note}});
      setState(s=>recordEvent({...s,imported:[book,...s.imported]},"book.imported",book.id));setCreated(book.id);
    }catch(cause){setError(cause instanceof Error?cause.message:"Import error");}
  }
  if(created)return <section className="surface learning-panel intake-complete"><div className="intake-complete-art" aria-hidden="true"><BookArtwork variant="mail"/></div><span className="eyebrow">{t("내 서재에 담았어요","ADDED TO YOUR LIBRARY")}</span><h1>{title}</h1><p>{t("이제 한 권의 새로운 만남이 기다려요. 오늘은 책만 읽어도 좋아요.","A new reading journey is waiting. Just reading is enough for today.")}</p><div className="row wrap"><Link className="button primary" href={`/reader/${created}`}><Icon name="book" size={18}/>{t("책 펼치기","Open the book")}</Link><Link className="button secondary" href={`/learn/${created}`}>{t("온책읽기로 연결","Use in a reading lesson")}</Link><Link className="button ghost" href="/library">{t("서재로","Library")}</Link></div></section>;
  return <div className="learning-page book-intake"><header className="intake-hero"><div><span className="eyebrow">{t("새로운 한 권과의 만남", "A NEW BOOK TO EXPLORE")}</span><h1>{t("읽을 책 가져오기","Bring a book")}</h1><p>{t("내가 쓴 이야기부터 교실 책장의 한 권까지.\n함께 읽고 싶은 책을 우리의 서재에 놓아 보세요.","From a story you wrote to a book on the classroom shelf.\nBring something you would like to read together.")}</p><Link className="text-button" href="/library"><Icon name="back" size={16}/>{t("우리의 서재로", "Back to our library")}</Link></div><div className="intake-hero-art" aria-hidden="true"><BookArtwork variant="coast"/></div></header>
    <section className="intake-source-choice" aria-label={t("가져올 자료 종류", "Choose your source")}><div className="intake-step-heading"><span>01</span><div><h2>{t("어떤 책을 가지고 있나요?", "What would you like to bring?")}</h2><p>{t("가지고 있는 자료에 맞춰 하나를 골라요.", "Choose the kind of source you have.")}</p></div></div><div className="intake-kind-grid">{([ ["text","원고·TXT","Text / TXT","pencil","직접 쓴 글, 텍스트 파일","Your writing or a text file"],["pdf","PDF","PDF","folder","글자가 있는 PDF 문서","A PDF with selectable text"],["images","사진·그림책","Page images","grid","직접 그린 그림과 페이지 사진","Drawings and page photos"],["paper","종이책","Paper book","book","교실·도서관에 있는 책","A book on your shelf"],["link","온라인 책 링크","Book link","map","원래 사이트에서 읽을 책","A book at its original site"] ] as const).map(([value,ko,en,icon,hintKo,hintEn])=><button className="intake-kind-card" key={value} disabled={busy} aria-pressed={kind===value} onClick={()=>{setKind(value);setError("");setConfirmed(false);}}><span className={`intake-kind-icon kind-${value}`}>{value==="pdf"?<BookToolIcon name="pdf" size={32}/>:value==="images"?<BookToolIcon name="upload" size={32}/>:<Icon name={icon} size={32}/>}</span><strong>{t(ko,en)}</strong><small>{t(hintKo,hintEn)}</small>{kind===value?<span className="intake-choice-check"><Icon name="check" size={14}/></span>:null}</button>)}</div></section>
    <div className="learning-columns"><section className="surface learning-panel intake-book-details"><div className="intake-step-heading"><span>02</span><div><h2>{t("책의 이름을 알려 주세요", "Tell us about your book")}</h2><p>{t("나중에 다시 찾아올 수 있게요.", "So you can find it again.")}</p></div></div><label className="field"><span>{t("책 제목","Book title")}</span><input value={title} maxLength={160} placeholder={t("함께 읽을 책의 이름", "The title of your book")} onChange={e=>setTitle(e.target.value)}/></label><label className="field"><span>{t("글쓴이·판본 정보","Author / edition")}</span><input value={author} maxLength={300} onChange={e=>setAuthor(e.target.value)}/></label>
    {kind==="link"?<label className="field"><span>{t("책을 읽을 공식 링크 · 필수","Official reading link · required")}</span><input type="url" required maxLength={2048} value={url} onChange={e=>{setUrl(e.target.value);setConfirmed(false);}} placeholder="https://"/><small>{t("링크의 본문을 자동 수집하지 않아요. 외부에서 읽고 여기서 쪽수와 생각을 기록할 수 있어요.","The linked text is not fetched. Read externally and record page references and thoughts here.")}</small></label>:null}
    {!metadata?<><label className="field"><span>{t("이 자료의 이용 근거","Permission to use")}</span><select value={rights} onChange={e=>{setRights(e.target.value as typeof rights);setConfirmed(false);}}><option value="own">{t("내가 만든 글·그림","My own text / images")}</option><option value="permission">{t("사용 허락·공개 이용 조건 확인","Permission / open licence confirmed")}</option></select></label><label className="field"><span>{t("등록 범위","Content scope")}</span><select value={coverage} onChange={e=>{setCoverage(e.target.value as typeof coverage);setConfirmed(false);}}><option value="full">{t("책 전체","Whole book")}</option><option value="excerpt">{t("발췌·일부 장면","Excerpt / selected pages")}</option></select></label></>:null}
    <label className="field"><span>{t("출처·판본·읽을 범위 메모","Source, edition and scope notes")}</span><textarea maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></label><p className="muted">{t("파일은 이 기기에서 처리합니다. 그림 속 글자의 OCR이나 온라인 책의 자동 수집은 실행하지 않습니다.","Files are processed on this device. No image OCR or website fetching is performed.")}</p></section>
    <section className="surface learning-panel intake-content"><div className="intake-step-heading"><span>03</span><div><h2>{metadata?t("읽을 자리를 준비해요", "Make a place for reading"):t("책 안의 이야기를 담아요", "Bring in the story")}</h2><p>{metadata?t("책은 곁에 두고, 생각은 여기 남겨요.", "Keep the book nearby and your thoughts here."):t("천천히 살펴본 뒤 서재에 놓아요.", "Take a look before adding it to your library.")}</p></div></div>{metadata?<div className="intake-reference-note"><span className="intake-reference-icon"><Icon name="book" size={32}/></span><h3>{t("책은 밖에서, 생각은 여기서","Read there, reflect here")}</h3><p>{t("본문 없이도 쪽수·읽은 범위·자기 질문·활동지·PDF를 사용할 수 있어요. 본문을 등록하기 전에는 책 내용을 파악했다고 표시하지 않아요.","Record page references, questions and worksheets without uploading the text. This app cannot know the book's contents from its title alone.")}</p></div>:<>
    {kind==="text"||kind==="pdf"?<label className="field"><span className="row"><BookToolIcon name="upload" size={28}/>{kind==="pdf"?t("텍스트 PDF 선택","Choose a text PDF"):t("TXT·MD 파일 선택 또는 아래에 붙여넣기","Choose TXT / MD or paste below")}</span><input disabled={busy} type="file" accept={kind==="pdf"?"application/pdf,.pdf":".txt,.md,text/plain,text/markdown"} onChange={e=>void loadFile(e.target.files?.[0])}/></label>:<><label className="field"><span className="row"><BookToolIcon name="upload" size={28}/>{t("페이지 이미지 추가 · 파일당 2MB","Add page images · up to 2MB each")}</span><input disabled={busy} type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={e=>void addImages(e.target.files)}/></label><div className="intake-images">{images.map((src,i)=><figure key={i}><img src={src} alt={t(`${i+1}쪽`,`Page ${i+1}`)}/><figcaption>{i+1}<button className="text-button" disabled={busy} onClick={()=>{setImages(list=>list.filter((_,j)=>j!==i));setConfirmed(false);}}>{t("제거","Remove")}</button></figcaption></figure>)}</div></>}
    <label className="field"><span>{kind==="images"?t("그림에 맞는 본문 (선택)","Text for each image (optional)"):t("본문 확인·수정","Review and edit text")}</span><textarea className="manuscript-input" disabled={busy} aria-busy={busy} maxLength={200000} value={text.replace(/\f/g,"\n---\n")} onChange={e=>{setText(e.target.value);setConfirmed(false);}}/><small>{t("장면 구분은 줄 사이에 ---를 넣으세요. 그림만 있는 책은 볼 수 있지만 듣기·본문 기반 AI에는 글자가 필요해요.","Put --- on a separate line between scenes. Image-only books can be viewed; narration and text-based AI require text.")}</small></label></>}
    {notice?<p role="status">{notice}</p>:null}<label className="check-field"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{t("자료 이용 범위와 등록할 내용·순서를 확인했어요.","I checked permission, content and page order.")}</label>{error?<p role="alert" className="form-error">{error}</p>:null}<button className="button primary" disabled={busy||!confirmed} onClick={create}>{metadata?<Icon name="book" size={28}/>:<BookToolIcon name="upload" size={28}/>} {busy?t("파일을 읽는 중…","Reading file…"):t("확인한 책 서재에 담기","Add reviewed book to library")}</button></section></div></div>;
}
