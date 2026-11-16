"use client";

import Link from "next/link";
import {useRef, useState} from "react";
import type {Book} from "@/lib/model";
import {reportTemplates, getReportTemplate, localizeTemplate, reportFields, type ReportField, type ReportTemplate} from "@/lib/report-templates";
import {downloadPdf, exportReportPdf} from "@/lib/pdf-export";
import {useStoredState} from "@/lib/workspace-store";
import {LEARNING_NOTEBOOK_KEY, MAX_NOTEBOOK_ANSWER, MAX_NOTEBOOK_RECORDS, initialLearningNotebook, validateLearningNotebook, createNotebookRecord, addNotebookRecord, updateNotebookAnswer, updateNotebookSettings, importNotebookQuestion, updateNotebookImage, deleteNotebookRecord, isNotebookImage, type NotebookGrade, type NotebookMode, type NotebookRecord} from "@/lib/learning-notebook";
import {useReading} from "./provider";
import {FormQuestionCoach, QuestionCoach} from "./reading-ai";
import {BookToolIcon, Icon} from "./icons";
import {BookArtwork} from "./artwork";

const teacherOnly = (template: ReportTemplate) => template.audience.length === 1 && template.audience[0] === "teacher";

export function LearningHub({book, query = {}}: {book: Book; query?: Record<string, string>}) {
  const {state: reading, ready: readingReady, t, toast} = useReading();
  const {state: notebook, setState, ready, storageOk, error, backup, retry} = useStoredState(LEARNING_NOTEBOOK_KEY, initialLearningNotebook, validateLearningNotebook);
  const [templateId, setTemplateId] = useState(() => getReportTemplate(query.template || query.form || "")?.id ?? "FORM-09");
  const [grade, setGrade] = useState<NotebookGrade>("3–4");
  const [mode, setMode] = useState<NotebookMode>("writing");
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<"step" | "all">("step");
  const [questionId, setQuestionId] = useState("");
  const [paper, setPaper] = useState<"A4" | "A5">("A4");
  const [printBlank, setPrintBlank] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState("");
  const exportLock = useRef(false);
  const templates = reading.role === "student" ? reportTemplates.filter(template => !teacherOnly(template)) : reportTemplates;
  const chosenTemplate = templates.find(template => template.id === templateId) ?? templates[0];
  const records = notebook.records.filter(record => record.bookId === book.id && (reading.role !== "student" || !teacherOnly(record.template)));
  const selected = records.find(record => record.id === notebook.activeRecordId) ?? records[0];
  const localized = selected ? localizeTemplate(selected.template, reading.locale) : null;
  const step = selected ? Math.min(index, selected.template.fields.length - 1) : 0;
  const currentField = selected?.template.fields[step];
  const questions = reading.questions.filter(question => question.bookId === book.id && question.origin === "mine");
  const chosenQuestion = questions.find(question => question.id === questionId);
  const requestedPage = Number(query.page);
  const scenePage = Math.max(0, Math.min(book.pages.length - 1, query.page !== undefined && Number.isInteger(requestedPage) ? requestedPage : reading.positions[book.id] ?? 0));
  const scene = book.pages[scenePage];
  const sceneText = book.source?.coverage !== "metadata" && scene ? (reading.locale === "ko" ? scene.text || scene.en : scene.en || scene.text) : "";
  const journey = query.context === "journey" && reading.journeyBookId === book.id;
  const modeLabel = (value: NotebookMode) => value === "oral" ? t("말을 받아 적기", "Oral dictation") : value === "paper" ? t("종이에 기록", "Paper record") : t("직접 글쓰기", "Writing");

  function startRecord() {
    if (notebook.records.length >= MAX_NOTEBOOK_RECORDS) {setActionError(t("기록을 100개 보관하고 있어요. 백업한 뒤 필요 없는 기록을 정리해 주세요.", "You have 100 records. Back them up, then remove any you no longer need.")); return;}
    const record = {...createNotebookRecord(book, chosenTemplate, grade, mode), label: chosenTemplate.title[reading.locale]};
    setState(previous => addNotebookRecord(previous, record)); setIndex(0); setQuestionId(""); setActionError("");
    toast(t("빈 기록을 만들었어요. 필요한 문항만 골라 써도 좋아요.", "A fresh record is ready. Use only the prompts that help you."));
  }

  function moveTo(next: number) {
    if (!selected) return;
    setIndex(next);
    requestAnimationFrame(() => document.getElementById(`answer-${selected.id}-${selected.template.fields[next].id}`)?.focus());
  }

  async function exportPdf(blank: boolean) {
    if (!selected || exportLock.current) return;
    exportLock.current = true; setExporting(true); setActionError("");
    const snapshot = structuredClone(selected);
    const locale = reading.locale;
    try {
      const fields = reportFields(snapshot.template, snapshot.answers, locale, blank).map((field, position) => ({...field, imageDataUrl: blank ? undefined : snapshot.images[snapshot.template.fields[position].id]}));
      const title = snapshot.template.title[locale];
      const bookTitle = locale === "ko" ? snapshot.bookTitle : snapshot.bookTitleEn;
      const subtitle = `${bookTitle} · v${snapshot.bookRevision} · ${snapshot.template.id} v${snapshot.template.revision}${blank ? "" : `\n${snapshot.gradeBand} · ${modeLabel(snapshot.recordingMode)}${snapshot.readingRange ? ` · ${snapshot.readingRange}` : ""}`}`;
      const blob = await exportReportPdf({title, subtitle, fields, blank, paper, locale});
      downloadPdf(blob, `${bookTitle}-${snapshot.template.id}-${blank ? "blank" : "filled"}-v${snapshot.revision}.pdf`);
      toast(blank ? t("빈 양식 PDF를 내려받았어요.", "Blank worksheet downloaded.") : t("지금 작성한 내용으로 PDF를 내려받았어요.", "Your current work was downloaded as a PDF."));
    } catch {setActionError(t("PDF를 만들지 못했어요. 기록은 화면에 남아 있습니다. JSON으로 백업하거나 다시 시도해 주세요.", "The PDF could not be created. Your work is still here. Download a JSON backup or try again."));}
    finally {exportLock.current = false; setExporting(false);}
  }

  async function attachDrawing(record: NotebookRecord, field: ReportField, file: File | undefined) {
    if (!file) return;
    setActionError("");
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 2 * 1024 * 1024) {setActionError(t("2MB 이하의 PNG 또는 JPEG 그림을 골라 주세요.", "Choose a PNG or JPEG image no larger than 2 MB.")); return;}
    try {
      const data = await new Promise<string>((resolve, reject) => {const reader = new FileReader(); reader.onerror = reject; reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("IMAGE")); reader.readAsDataURL(file);});
      if (!isNotebookImage(data)) throw new Error("IMAGE");
      setState(previous => updateNotebookImage(previous, record.id, field.id, data));
    } catch {setActionError(t("그림을 읽지 못했어요. 다른 PNG/JPEG 파일로 다시 시도해 주세요.", "The image could not be read. Try another PNG or JPEG file."));}
  }

  function fieldEditor(field: ReportField, position: number) {
    if (!selected) return null;
    const id = `answer-${selected.id}-${field.id}`;
    return <section className={`learning-field ${step === position ? "current" : ""}`} key={`${selected.id}-${field.id}`}>
      <div className="learning-field-heading"><span className="learning-question-number">{String(position + 1).padStart(2, "0")}</span><label htmlFor={id}>{field.label[reading.locale]}</label></div>
      {field.prompt[reading.locale] ? <p id={`${id}-help`} className="muted">{field.prompt[reading.locale]}</p> : null}
      {field.kind === "table" ? <p className="learning-input-note">{t("한 줄에 한 항목씩 적어요. PDF에서는 기록 칸으로 정리돼요.", "Write one item per line. The PDF uses a writing area.")}</p> : null}
      {field.kind === "drawing" ? <div className="learning-drawing-tools"><p className="muted">{t("종이에 그려도 좋아요. 그림을 올리거나 아래에 말로 설명할 수 있어요.", "You can draw on paper, attach a drawing, or describe your idea below.")}</p><label className="learning-file-label"><span className="row"><BookToolIcon name="upload" size={28}/>{t("내 그림 올리기 · PNG/JPEG, 2MB 이하", "Attach my drawing · PNG/JPEG, up to 2 MB")}</span><input type="file" accept="image/png,image/jpeg" aria-label={t(`${field.label.ko} 그림 올리기`, `Attach an image for ${field.label.en}`)} onChange={event => {const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void attachDrawing(selected, field, file);}}/></label>{selected.images[field.id] ? <div className="learning-drawing"><img src={selected.images[field.id]} alt={t(`${field.label.ko}에 올린 그림`, `Drawing for ${field.label.en}`)}/><button className="button ghost" onClick={() => setState(previous => updateNotebookImage(previous, selected.id, field.id, null))}>{t("그림 빼기", "Remove image")}</button></div> : null}</div> : null}
      <textarea id={id} value={selected.answers[field.id] ?? ""} maxLength={MAX_NOTEBOOK_ANSWER} rows={field.kind === "short" ? 2 : Math.max(4, field.rows)} aria-describedby={field.prompt[reading.locale] ? `${id}-help` : undefined} onFocus={() => setIndex(position)} onChange={event => setState(previous => updateNotebookAnswer(previous, selected.id, field.id, event.target.value))} placeholder={t("내 말로 천천히 적어요. 아직 답이 없어도 괜찮아요.", "Take your time. It is okay not to have an answer yet.")}/>
      <div className="learning-answer-footer"><span>{(selected.answers[field.id] ?? "").length} / {MAX_NOTEBOOK_ANSWER}</span><span>{t("나의 기록 · 자동 답변 없음", "My own work · No automatic answers")}</span></div>
      <FormQuestionCoach sourceText={sceneText} sourceLabel={sceneText ? t(`참고 범위: ${scenePage + 1}장면`, `Source: scene ${scenePage + 1}`) : t("참고할 온라인 본문 없음", "No online passage available")} context={{formTitle:selected.template.title[reading.locale],fieldLabel:field.label[reading.locale],fieldPrompt:field.prompt[reading.locale]}} gradeBand={selected.gradeBand.replace("–", "-") as "1-2" | "3-4" | "5-6"} studentQuestion={chosenQuestion?.text} scopeKey={`${selected.id}:${field.id}:${book.revision}:${scenePage}`}/>
    </section>;
  }

  if (!ready || !readingReady) return <div className="surface learning-loading" role="status">{t("책의 기록장을 여는 중이에요…", "Opening your book notebook…")}</div>;

  return <div className="learning-hub">
    <div className="learning-screen">
      <div className="workspace-top"><Link className="text-button" href={journey ? "/" : `/reader/${book.id}`}><Icon name="back" size={17}/>{journey ? t("이야기 여정으로", "Back to journey") : t("책으로 돌아가기", "Back to the book")}</Link><span className="badge">{t("내 기기에 보관하는 기록", "Saved on this device")}</span></div>
      <header className="learning-hero"><div><span className="eyebrow">{t("한 권 곁에 남기는 나의 생각", "THOUGHTS BESIDE A BOOK")}</span><h1>{t("읽고, 궁금해하고, 기록해요", "Read. Wonder. Remember.")}</h1><p>{t("모든 칸을 채우지 않아도 좋아요. 마음에 남은 생각부터 천천히.", "There is no need to fill every space. Start with a thought that stayed with you.")}</p><Link className="learning-book-label" href={`/reader/${book.id}`}><Icon name="book" size={18}/><span>{t(book.title, book.en)}</span><Icon name="arrow" size={16}/></Link></div><div className="learning-hero-art" aria-hidden="true"><BookArtwork variant="mail"/></div></header>
      <p className={`learning-storage ${storageOk ? "" : "warning"}`} role="status">{storageOk ? t("이 브라우저에 자동 저장해요. 다른 기기와 자동 공유되지는 않아요.", "Saved automatically in this browser. It does not sync to other devices.") : error}<button className="text-button" onClick={backup}>{t("전체 기록 JSON 백업", "Back up all records as JSON")}</button>{!storageOk ? <button className="text-button" onClick={retry}>{t("저장 다시 시도", "Retry saving")}</button> : null}</p>
      {actionError ? <p className="form-error" role="alert">{actionError}</p> : null}

      <div className="learning-layout">
        <aside className="learning-sidebar stack">
          <section className="surface learning-start"><span className="learning-section-label">{t("오늘의 한 장", "TODAY")}</span><h2>{t("오늘 쓸 기록지", "Choose a worksheet")}</h2><label className="field"><span>{t("양식", "Worksheet")}</span><select value={chosenTemplate.id} onChange={event => setTemplateId(event.target.value)}>{templates.map(template => <option key={template.id} value={template.id}>{template.id.slice(-2)} · {template.title[reading.locale]}</option>)}</select></label><p className="muted">{chosenTemplate.description[reading.locale]}</p><div className="field-grid"><label className="field"><span>{t("학년군", "Grade band")}</span><select value={grade} onChange={event => setGrade(event.target.value as NotebookGrade)}>{["1–2", "3–4", "5–6"].map(item => <option key={item}>{item}</option>)}</select></label><label className="field"><span>{t("기록 방식", "Recording mode")}</span><select value={mode} onChange={event => setMode(event.target.value as NotebookMode)}>{(["writing", "oral", "paper"] as NotebookMode[]).map(item => <option key={item} value={item}>{modeLabel(item)}</option>)}</select></label></div><p className="learning-input-note">{t("학년군은 기록의 맥락이에요. 문항을 자동으로 쉽거나 어렵게 바꾸지 않아요.", "The grade band describes your context. It does not automatically rewrite the prompts.")}</p><button className="button primary full" onClick={startRecord}><Icon name="plus" size={17}/>{t("이 양식으로 새 기록", "Start a fresh record")}</button><p className="muted">{t("새 기록을 만들어도 전에 쓴 내용은 남아요.", "Starting a new record keeps your earlier work.")}</p></section>
          <section className="surface learning-records"><span className="learning-section-label">{t("다시 펼쳐 보기", "OPEN AGAIN")}</span><h2>{t("이 책에 남긴 기록", "Records for this book")}</h2>{records.length ? <div className="learning-record-list">{records.map(record => <button key={record.id} className={selected?.id === record.id ? "active" : ""} aria-pressed={selected?.id === record.id} onClick={() => {setState(previous => ({...previous, activeRecordId: record.id})); setIndex(0); setQuestionId("");}}><strong>{record.label || record.template.title[reading.locale]}</strong><span>{record.template.id} · {new Date(record.updatedAt).toLocaleDateString(reading.locale === "ko" ? "ko-KR" : "en-US")} · v{record.bookRevision}</span></button>)}</div> : <p className="muted">{t("아직 이 책의 기록이 없어요. 빈 양식부터 시작해 보세요.", "No records yet. Start with a fresh worksheet.")}</p>}</section>
        </aside>

        <div className="learning-main stack">
          {!selected || !localized ? <section className="surface learning-empty"><Icon name="pencil" size={32}/><h2>{t("무엇을 남기고 싶나요?", "What would you like to remember?")}</h2><p>{t("내 질문, 읽은 장면, 친구의 생각, 다음 수업 계획 중 지금 필요한 기록지를 골라요.", "Choose a place for your question, a memorable scene, another perspective, or your next lesson plan.")}</p><Link className="button secondary" href={`/reader/${book.id}`}>{t("오늘은 책만 읽을래요", "Just read today")}</Link></section> : <>
            <section className="surface learning-answer-panel" aria-label={t("나의 답변 작성", "Write my responses")}><div className="learning-notebook-title"><span>{t("나의 생각 한 장", "A PAGE OF MY THINKING")}</span><h2>{localized.title}</h2><p>{t("정답보다, 지금 나의 생각이 궁금해요.", "Your own thinking belongs here.")}</p></div><div className="learning-answer-toolbar"><span aria-live="polite">{view === "step" ? t(`${step + 1} / ${selected.template.fields.length} 문항`, `Prompt ${step + 1} of ${selected.template.fields.length}`) : t("전체 문항", "All prompts")}</span><div className="segmented"><button aria-pressed={view === "step"} onClick={() => setView("step")}>{t("한 문항씩", "One at a time")}</button><button aria-pressed={view === "all"} onClick={() => setView("all")}>{t("전체 보기", "Show all")}</button></div></div>{view === "step" && currentField ? fieldEditor(currentField, step) : selected.template.fields.map(fieldEditor)}<div className="learning-step-controls">{view === "step" ? <><button className="button secondary" disabled={step === 0} onClick={() => moveTo(step - 1)}><Icon name="back" size={17}/>{t("이전 문항", "Previous")}</button><button className="button secondary" disabled={step === selected.template.fields.length - 1} onClick={() => moveTo(step + 1)}>{t("다음 문항", "Next")}<Icon name="arrow" size={17}/></button></> : <p className="muted">{t("빈 칸이 있어도 기록을 보관할 수 있어요.", "Your work can be saved with empty fields.")}</p>}<button className="button primary" onClick={() => {retry(); toast(storageOk ? t("기기 저장을 요청했어요. 화면의 저장 상태를 확인해 주세요.", "Local saving was requested. Check the storage status above.") : t("화면의 기록은 남아 있어요. 저장 경고를 확인하고 JSON으로 백업해 주세요.", "Your work is still on screen. Check the storage warning and download a backup."));}}><Icon name="check" size={17}/>{t("내 생각 저장", "Keep my thinking")}</button></div></section>

            <details className="surface learning-question-import"><summary>{t("이미 남긴 내 질문 가져오기", "Bring in a question I already wrote")}</summary><p className="muted">{t("선택한 질문을 아래 문항의 끝에 덧붙여요. 지금 쓴 답은 지우지 않아요.", "Append your chosen question to the target field. Your existing response stays.")}</p><label className="field"><span>{t("이 책에서 만든 내 질문", "My question about this book")}</span><select value={chosenQuestion?.id ?? ""} onChange={event => setQuestionId(event.target.value)}><option value="">{t("질문을 골라 주세요", "Choose a question")}</option>{questions.map(question => <option key={question.id} value={question.id}>{question.text}</option>)}</select></label><label className="field"><span>{t("가져올 문항", "Target prompt")}</span><select value={step} onChange={event => setIndex(Number(event.target.value))}>{selected.template.fields.map((field, position) => <option key={field.id} value={position}>{position + 1}. {field.label[reading.locale]}</option>)}</select></label><button className="button secondary" disabled={!chosenQuestion || !currentField} onClick={() => {if (!chosenQuestion || !currentField) return; const old = selected.answers[currentField.id] ?? ""; if ((old.trim() ? old.length + 2 : 0) + chosenQuestion.text.length > MAX_NOTEBOOK_ANSWER) {setActionError(t("이 칸의 글이 너무 길어요. 다른 칸을 선택하거나 먼저 줄여 주세요.", "This response is too long. Choose another field or shorten it first.")); return;} setState(previous => importNotebookQuestion(previous, selected.id, currentField.id, chosenQuestion)); toast(t("내 질문을 덧붙였어요. 책의 근거 위치도 다시 살펴봐요.", "Your question was appended. Check its evidence in the book."));}}>{t("선택한 내 질문 가져오기", "Append my selected question")}</button>{!questions.length ? <Link className="text-button" href={`/inquiry?book=${book.id}${scene ? `&page=${scenePage}` : ""}`}>{t("먼저 나의 질문 남기기", "Write my question first")}<Icon name="arrow" size={16}/></Link> : null}{chosenQuestion && sceneText.trim() ? <details className="learning-coach"><summary>{t("선택한 질문에 AI 도움 요청하기", "Optional AI help for my selected question")}</summary><p className="muted">{t(`현재 ${scenePage + 1}장면의 본문과 선택한 질문만 사용해요. 책 전체를 검토한 답변이 아닙니다.`, `Only scene ${scenePage + 1} and your selected question are used. This is not a review of the whole book.`)}</p><QuestionCoach sourceText={sceneText} studentQuestion={chosenQuestion.text}/></details> : null}</details>

            <section className="surface learning-record-header"><div className="panel-title"><div><span className="eyebrow">{selected.template.id} · v{selected.template.revision}</span><h2>{t("이 기록의 정보", "About this record")}</h2></div><button className="button ghost" onClick={() => {if (window.confirm(t("이 기록을 삭제할까요? 필요하면 먼저 JSON이나 PDF로 보관해 주세요. 책과 다른 기록은 남습니다.", "Delete this record? Back it up as JSON or PDF first if needed. The book and other records will stay."))) {setState(previous => deleteNotebookRecord(previous, selected.id)); setIndex(0); setQuestionId("");}}}>{t("기록 삭제", "Delete record")}</button></div><p className="muted">{localized.description}</p><label className="field"><span>{t("기록 이름", "Record name")}</span><input value={selected.label} maxLength={160} onChange={event => setState(previous => updateNotebookSettings(previous, selected.id, {label: event.target.value}))}/></label><div className="field-grid"><label className="field"><span>{t("학년군", "Grade band")}</span><select value={selected.gradeBand} onChange={event => setState(previous => updateNotebookSettings(previous, selected.id, {gradeBand: event.target.value as NotebookGrade}))}>{["1–2", "3–4", "5–6"].map(item => <option key={item}>{item}</option>)}</select></label><label className="field"><span>{t("이 기록의 참여 방식", "How this record was made")}</span><select value={selected.recordingMode} onChange={event => setState(previous => updateNotebookSettings(previous, selected.id, {recordingMode: event.target.value as NotebookMode}))}>{(["writing", "oral", "paper"] as NotebookMode[]).map(item => <option key={item} value={item}>{modeLabel(item)}</option>)}</select></label></div><label className="field"><span>{t("읽은 쪽·장면·범위", "Pages, scenes, or reading range")}</span><input value={selected.readingRange} maxLength={400} placeholder={t("예: 종이책 12~18쪽 / 2장 / 함께 들은 첫 장면", "For example: print pages 12–18 / chapter 2 / first scene read aloud")} onChange={event => setState(previous => updateNotebookSettings(previous, selected.id, {readingRange: event.target.value}))}/></label>{selected.bookCoverage === "metadata" ? <p className="info-banner">{t("온라인 본문이 없는 책이에요. 실제 책의 판본과 쪽수를 직접 적어 근거를 남겨요.", "This entry has no online text. Record the edition and page numbers from the physical book.")}</p> : null}{selected.bookRevision !== book.revision ? <p className="info-banner">{t(`이 기록은 책 v${selected.bookRevision}을 기준으로 만들었어요. 현재 책은 v${book.revision}입니다. 기존 근거를 확인해 주세요.`, `This record was made for book v${selected.bookRevision}; the current book is v${book.revision}. Check your evidence locations.`)}</p> : null}{selected.recordingMode !== "writing" ? <p className="learning-input-note">{selected.recordingMode === "oral" ? t("학생이 말한 내용을 그대로 받아 적어요. 자동 녹음이나 음성 전사는 실행하지 않아요.", "Write what the learner actually said. No recording or speech transcription is performed.") : t("종이에 쓴 모든 내용을 다시 입력할 필요는 없어요. 남기고 싶은 부분만 적거나 빈 양식을 출력해요.", "You do not need to retype everything on paper. Keep only what matters or print a blank worksheet.")}</p> : null}</section>

            <section className="surface learning-export"><h2>{t("종이로 이어 가기", "Continue on paper")}</h2><p className="muted">{t("빈 양식에는 답변과 올린 그림이 들어가지 않아요. 작성 내용은 지금 상태로 PDF에 담아요.", "Blank PDFs exclude your answers and images. Filled PDFs contain your current work.")}</p><div className="learning-export-options"><label className="field"><span>{t("PDF 용지", "PDF paper")}</span><select value={paper} onChange={event => setPaper(event.target.value as "A4" | "A5")}><option>A4</option><option>A5</option></select></label><label className="field"><span>{t("브라우저 인쇄 내용", "Browser print content")}</span><select value={printBlank ? "blank" : "filled"} onChange={event => setPrintBlank(event.target.value === "blank")}><option value="filled">{t("작성한 내용", "My completed fields")}</option><option value="blank">{t("빈 양식", "Blank worksheet")}</option></select></label></div><div className="row wrap"><button className="button secondary" disabled={exporting} onClick={() => void exportPdf(true)}><BookToolIcon name="pdf" size={28}/>{t("빈 양식 PDF", "Blank PDF")}</button><button className="button primary" disabled={exporting} onClick={() => void exportPdf(false)}><BookToolIcon name="pdf" size={28}/>{t("작성 내용 PDF", "My work as PDF")}</button><button className="button ghost" disabled={exporting} onClick={() => window.print()}><Icon name="print" size={17}/>{t("인쇄", "Print")}</button><button className="button ghost" onClick={backup}>{t("JSON 백업", "JSON backup")}</button></div>{exporting ? <p role="status">{t("PDF를 만들고 있어요. 잠시 기다려 주세요…", "Creating your PDF. Please wait…")}</p> : null}<p className="learning-input-note">{t("인쇄는 미리보기에서 용지와 여백을 확인해 주세요. 내려받은 파일은 인터넷에 자동 공개되지 않아요.", "Check paper and margins in print preview. Downloading a file does not publish it online.")}</p></section>
          </>}
        </div>
      </div>
    </div>
    {selected ? <article className="learning-print"><h1>{selected.template.title[reading.locale]}</h1><p>{t(selected.bookTitle, selected.bookTitleEn)} · v{selected.bookRevision} · {selected.template.id} v{selected.template.revision}</p>{!printBlank ? <p>{selected.gradeBand} · {modeLabel(selected.recordingMode)} · {selected.readingRange}</p> : null}{selected.template.fields.map(field => <section key={field.id}><h2>{field.label[reading.locale]}</h2>{field.prompt[reading.locale] ? <p className="learning-print-prompt">{field.prompt[reading.locale]}</p> : null}{!printBlank && selected.images[field.id] ? <img src={selected.images[field.id]} alt={field.label[reading.locale]}/> : null}{!printBlank && selected.answers[field.id] ? <p className="learning-print-answer">{selected.answers[field.id]}</p> : <div className="learning-print-blank" style={{minHeight: `${Math.max(2, field.rows) * 1.4}em`}}/>}</section>)}</article> : null}
  </div>;
}
