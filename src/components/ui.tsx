"use client";
import Link from "./workspace-link";
import type { Book } from "@/lib/model";
import { BookArtwork, CollectionArtwork } from "./artwork";
import { Icon } from "./icons";
import { useReading } from "./provider";

export function BookCover({book, compact = false}: {book: Book; compact?: boolean}) {
  const {t} = useReading();
  return <div className={`book-cover illustrated-cover ${book.color} ${book.collection ? "classic-cover" : ""} ${compact ? "compact" : ""}`}>{book.pages[0]?.imageDataUrl ? <img src={book.pages[0].imageDataUrl} alt={t("내 책 표지 그림", "My book cover illustration")}/> : book.collection ? <CollectionArtwork collection={book.collection}/> : <BookArtwork variant={book.art}/>}<div className="book-cover-title"><span>{book.collection ? book.collection === "korean" ? t("우리 옛이야기", "KOREAN FOLKTALES") : t("이솝우화", "AESOP'S FABLES") : t("온책읽기 그림책", "ONBOOK PICTURE BOOK")}</span>{t(book.title, book.en)}</div><div className="book-cover-credit">{book.retelling ? t("어린이를 위해 새로 풀어 쓴 이야기", "A fresh retelling for young readers") : t("읽고, 궁금해하고, 함께 만드는 이야기", "A story to read, wonder and create")}</div><span className="book-spine"/></div>;
}
export function WorkspaceBack({journey = false}: {journey?: boolean}) {
  const {t} = useReading();
  return <Link className="back-link" href={journey ? "/" : "/library"}><Icon name="back" size={16}/>{journey ? t("여정으로 돌아가기", "Back to my journey") : t("서재로 돌아가기", "Back to library")}</Link>;
}
export function Empty({title, description}: {title: string; description: string}) {
  return <div className="empty"><Icon name="leaf" size={34}/><h3>{title}</h3><p>{description}</p></div>;
}
