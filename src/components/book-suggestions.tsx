"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { bookInterests, bookSuggestions, filterBookSuggestions, findSuggestedBook, suggestedBookInput, type BookInterest, type BookSuggestion } from "@/lib/book-suggestions";
import { createImportedBook } from "@/lib/book-intake";
import { recordEvent } from "@/lib/model";
import { useReading } from "./provider";
import { Icon } from "./icons";

export function BookSuggestions() {
  const { state, setState, t } = useReading();
  const router = useRouter();
  const [grade, setGrade] = useState<number | null>(null);
  const [interest, setInterest] = useState<BookInterest | null>(null);
  const [pendingIsbn, setPendingIsbn] = useState<string | null>(null);
  const [error, setError] = useState("");
  const filtered = filterBookSuggestions(grade, interest);

  // Navigate only after the context contains the registered book, including a duplicate found by the updater.
  useEffect(() => {
    if (!pendingIsbn) return;
    const book = findSuggestedBook(state.imported, pendingIsbn);
    if (book) router.push(`/learn/${book.id}`);
  }, [pendingIsbn, router, state.imported]);

  function startPaperLesson(suggestion: BookSuggestion) {
    if (pendingIsbn) return;
    setError("");
    const existing = findSuggestedBook(state.imported, suggestion.isbn);
    if (existing) { router.push(`/learn/${existing.id}`); return; }
    try {
      const book = createImportedBook(suggestedBookInput(suggestion));
      setPendingIsbn(suggestion.isbn);
      setState(current => findSuggestedBook(current.imported, suggestion.isbn) ? current
        : recordEvent({ ...current, imported: [book, ...current.imported] }, "suggestion.paper_book_registered", book.id));
    } catch (cause) { setPendingIsbn(null); setError(cause instanceof Error ? cause.message : t("도서 정보를 등록하지 못했어요.", "Unable to register the book.")); }
  }

  return <section className="book-suggestions" aria-labelledby="book-suggestions-title">
    <div className="section-heading"><div><span className="eyebrow">BOOKS TO READ TOGETHER</span><h2 id="book-suggestions-title">{t("우리 반에 맞는 종이책 찾기", "Find a paper book for your class")}</h2></div><span className="badge">{bookSuggestions.length}{t("권의 출발 목록", " starting options")}</span></div>
    <p className="bs-intro">{t("추천 정보만 제공해요. 책 전문·삽화·음원은 포함되어 있지 않으니 종이책을 준비해 주세요. 학년은 수업 설계 제안이며, 아이의 관심과 읽기 지원에 맞게 고를 수 있어요.", "These are recommendations only: full text, illustrations and audio are not included. Obtain the paper book. Grades are teaching suggestions; adapt them to readers' interests and support needs.")}</p>
    <div className="bs-filters"><label>{t("학년", "Grade")}<select value={grade ?? "all"} onChange={event => setGrade(event.target.value === "all" ? null : Number(event.target.value))}><option value="all">{t("전 학년", "All grades")}</option>{[1, 2, 3, 4, 5, 6].map(value => <option key={value} value={value}>{t(`${value}학년`, `Grade ${value}`)}</option>)}</select></label><label>{t("관심 주제", "Interest")}<select value={interest ?? "all"} onChange={event => setInterest(event.target.value === "all" ? null : event.target.value as BookInterest)}><option value="all">{t("모든 주제", "All interests")}</option>{bookInterests.map(topic => <option key={topic.id} value={topic.id}>{t(topic.ko, topic.en)}</option>)}</select></label><p role="status">{filtered.length}{t("권을 살펴볼 수 있어요", " options")}</p></div>
    {error ? <p className="bs-error" role="alert">{error}</p> : null}
    {filtered.length ? <div className="bs-grid">{filtered.map(suggestion => {
      const registered = findSuggestedBook(state.imported, suggestion.isbn);
      return <article className="bs-card" key={suggestion.id}>
        <div className="bs-card-top"><span className="badge">{t(suggestion.format, suggestion.formatEn)}</span><span>{t(`${suggestion.grades.join("·")}학년 제안`, `Grades ${suggestion.grades.join(", ")} suggested`)}</span></div>
        <h3>{suggestion.title}</h3><p className="bs-author">{suggestion.author}</p><p className="bs-edition">{suggestion.edition}<br/>ISBN {suggestion.isbn}</p>
        <p className="bs-reason">{t(suggestion.reason, suggestion.reasonEn)}</p><p className="bs-support">{t(suggestion.support, suggestion.supportEn)}</p>
        <details><summary>{t("추천 근거와 판본 확인", "Recommendation and edition details")}</summary><p>{t(suggestion.official, suggestion.officialEn)}</p><p>{t("서지 조사일: 2026-11-16. 본문 완독·학습효과 시험 또는 전문 이용허락 확보를 뜻하지 않습니다.", "Metadata checked 2026-11-16. This is not a full-book review, effectiveness trial or license to provide the text.")}</p><a href={suggestion.url} target="_blank" rel="noopener noreferrer">{t("공식 서지·출판사 안내 열기", "Open official metadata or publisher page")} ↗</a></details>
        <button className="button secondary" disabled={pendingIsbn !== null} onClick={() => startPaperLesson(suggestion)}><Icon name="book" size={17}/>{pendingIsbn === suggestion.isbn ? t("수업 열기 준비 중…", "Opening lesson…") : registered ? t("이 종이책 수업 이어가기", "Continue this paper-book lesson") : t("종이책으로 수업 시작", "Start a paper-book lesson")}</button>
      </article>;
    })}</div> : <div className="bs-empty"><p>{t("이 조건의 후보는 아직 없어요. 학년이나 관심 주제를 바꿔 보세요.", "No candidates match yet. Try another grade or interest.")}</p><button className="button secondary" onClick={() => { setGrade(null); setInterest(null); }}>{t("전체 후보 보기", "Show all options")}</button></div>}
  </section>;
}
