"use client";

import { useState } from "react";
import Link from "./workspace-link";
import { useReading } from "./provider";
import { Icon, type IconName } from "./icons";
import { LoginButton } from "./login-button";

const stops: {href: string; icon: IconName; ko: string; en: string; help: string; helpEn: string}[] = [
  {href: "/reader/heungbu-nolbu", icon: "headphones", ko: "이야기 읽고 듣기", en: "Read and listen", help: "흥부와 놀부를 펼치고, 듣기와 책갈피를 써 보세요.", helpEn: "Open Heungbu and Nolbu, play its narration, and save a bookmark."},
  {href: "/inquiry?book=heungbu-nolbu", icon: "question", ko: "나만의 질문 남기기", en: "Ask your own question", help: "‘나라면 어땠을까?’ 책에서 생긴 궁금함을 적어 보세요.", helpEn: "What would I have done? Write a question inspired by the story."},
  {href: "/learn/heungbu-nolbu?template=FORM-09", icon: "print", ko: "기록지와 PDF 만들기", en: "Make a worksheet PDF", help: "질문에 차근차근 답하고, 기록지를 PDF로 내려받아요.", helpEn: "Answer one prompt at a time and download your worksheet as a PDF."},
  {href: "/theater", icon: "theater", ko: "배역을 나눠 읽기", en: "Try readers’ theater", help: "‘바람 우체국’ 샘플 대본으로 목소리를 바꿔 읽어요.", helpEn: "Take turns reading the sample Wind Post Office script."},
  {href: "/studio", icon: "pencil", ko: "우리 책 한 권 만들기", en: "Make a book of your own", help: "주제·책 종류·그림체를 고르고, 장면을 써서 책으로 엮어요.", helpEn: "Choose a topic, book type, and art style, then write and assemble your scenes."},
];

/** The tour only navigates to working activities. It never writes sample work as learner evidence. */
export function DemoTour({compact = false}: {compact?: boolean}) {
  const {t} = useReading();
  const [expanded, setExpanded] = useState(!compact);
  return <section className={`demo-tour ${expanded ? "expanded" : ""}`} aria-labelledby="demo-tour-title">
    <div className="demo-tour-header">
      <div className="demo-tour-intro"><Icon name="leaf" size={35}/><div>
        <span className="demo-tour-kicker">{t("책 한 권으로 둘러보는", "ONE BOOK, MANY POSSIBILITIES")}</span>
        <h2 id="demo-tour-title">{t("온책읽기 체험 교실", "Your reading playground")}</h2>
        <p>{t("로그인 없이 읽고, 묻고, 만들어 보세요. 체험 기록은 내 계정 작업과 따로 보관돼요.", "Read, ask, and create without signing in. Demo work stays separate from your account workspace.")}</p>
      </div></div>
      <div className="demo-tour-actions">
        <button type="button" className="button ghost" aria-expanded={expanded} aria-controls="demo-tour-stops" onClick={() => setExpanded(value => !value)}>{t(expanded ? "체험 안내 접기" : "체험 안내 펼치기", expanded ? "Hide activities" : "Explore activities")}<Icon name={expanded ? "close" : "plus"} size={15}/></button>
        <LoginButton className="button secondary">{t("Google로 시작하기", "Continue with Google")}</LoginButton>
      </div>
    </div>
    {expanded ? <div id="demo-tour-stops" className="demo-tour-body">
      <ol className="demo-tour-stops">{stops.map((stop, index) => <li key={stop.href}><Link href={stop.href}>
        <div className="demo-tour-step-top"><span className="demo-tour-step-number">0{index + 1}</span><Icon name={stop.icon} size={42}/></div>
        <h3>{t(stop.ko, stop.en)}</h3><p>{t(stop.help, stop.helpEn)}</p><span className="demo-tour-go">{t("직접 해보기", "Try it")}<Icon name="arrow" size={15}/></span>
      </Link></li>)}</ol>
      <div className="demo-tour-footnote"><span>{t("순서대로 따라가도, 마음에 드는 활동부터 시작해도 좋아요.", "Follow the steps or start with whichever activity interests you.")}</span><Link href="/library">{t("전래동화 5편 · 이솝우화 5편 모두 보기", "Explore 5 Korean tales and 5 Aesop fables")}<Icon name="arrow" size={14}/></Link></div>
    </div> : null}
  </section>;
}
