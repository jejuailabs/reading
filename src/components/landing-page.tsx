"use client";

import Link from "next/link";
import { useState } from "react";
import { BookArtwork, JourneyLandscape } from "./artwork";
import { Icon, type IconName } from "./icons";
import { LoginButton } from "./login-button";
import { useReading } from "./provider";

const paths: { icon: IconName; ko: string; en: string; href: string }[] = [
  { icon: "library", ko: "책을 만나고", en: "Discover", href: "/demo/library" },
  { icon: "book", ko: "읽고 듣고", en: "Read & listen", href: "/demo/reader/heungbu-nolbu" },
  { icon: "question", ko: "질문을 키우고", en: "Wonder", href: "/demo/inquiry?book=heungbu-nolbu" },
  { icon: "theater", ko: "목소리를 나누고", en: "Perform", href: "/demo/theater" },
  { icon: "pencil", ko: "우리 책을 만들어요", en: "Create", href: "/demo/studio" },
];

const gradePlans = [
  {
    label: "1–2", ko: "그림과 목소리로 만나는 이야기", en: "Meet a story through pictures and voices",
    description: "함께 듣고, 마음에 남은 장면을 고르고, 짧은 말과 그림으로 표현해요.", descriptionEn: "Listen together, choose a memorable scene, and respond with a few words or a drawing.",
    steps: ["읽어주기 함께 듣기", "궁금한 장면 말하기", "한 장 그림책 만들기"], stepsEn: ["Listen to a read-aloud", "Talk about a curious scene", "Make a picture-book page"],
    question: "제비는 왜 흥부에게 다시 왔을까?", questionEn: "Why did the swallow return to Heungbu?",
  },
  {
    label: "3–4", ko: "단서를 찾으며 깊어지는 이야기", en: "Follow clues and explore a little deeper",
    description: "인물의 마음을 짐작하고, 책 속 근거로 생각을 나누며, 장면을 대사로 바꿔요.", descriptionEn: "Infer a character's feelings, support ideas with clues, and turn scenes into dialogue.",
    steps: ["읽으며 책갈피 남기기", "질문과 근거 모으기", "모둠 낭독극 해보기"], stepsEn: ["Bookmark a meaningful scene", "Collect questions and evidence", "Try readers' theater together"],
    question: "같은 박씨인데, 왜 서로 다른 일이 생겼을까?", questionEn: "Why did similar seeds lead to such different outcomes?",
  },
  {
    label: "5–6", ko: "다른 관점에서 다시 쓰는 이야기", en: "Look again, then write a new perspective",
    description: "여러 해석을 비교하고, 인물과 사건을 비판적으로 바라보며, 나만의 이야기로 확장해요.", descriptionEn: "Compare interpretations, examine choices, and develop a story of your own.",
    steps: ["주제와 관점 비교하기", "토론 후 생각 고쳐 쓰기", "새 결말을 책으로 엮기"], stepsEn: ["Compare themes and perspectives", "Revisit an idea after discussion", "Publish a different ending"],
    question: "놀부의 입장에서 이야기를 시작하면 무엇이 달라질까?", questionEn: "What changes if the story begins from Nolbu's point of view?",
  },
];

export function LandingPage() {
  const { state, setState, t } = useReading();
  const [grade, setGrade] = useState(1);
  const plan = gradePlans[grade];
  const features: { icon: IconName; title: string; en: string; body: string; bodyEn: string; tags: string; tagsEn: string }[] = [
    { icon: "library", title: "우리 수업에 맞는 책부터", en: "Start with the right book", body: "서재에서 이야기를 고르거나, 읽을 권한이 있는 자료를 가져와요. 종이책으로 읽은 내용도 직접 정리해 활동을 시작할 수 있어요.", bodyEn: "Choose a story from the library or bring material you have permission to use. You can also add notes from a book you read on paper.", tags: "책 탐색 · 자료 가져오기 · 종이책 연결", tagsEn: "Discover · Import · Connect a paper book" },
    { icon: "headphones", title: "읽는 방법은 저마다 다르게", en: "A reading pace of your own", body: "책장을 넘겨 읽고, 준비된 낭독을 듣고, 마음에 남은 곳에 책갈피를 꽂아요. 고전 샘플은 한국어와 영어로 만나 볼 수 있어요.", bodyEn: "Turn the pages, listen to the available narration, and bookmark a passage. Explore the classic samples in Korean and English.", tags: "읽기 · 듣기 · 책갈피 · 글자 크기", tagsEn: "Read · Listen · Bookmark · Text size" },
    { icon: "question", title: "아이의 질문에서 시작해요", en: "Begin with a child's own question", body: "궁금한 장면을 고르고, 내 질문을 먼저 만들어요. 사실 확인부터 추론과 열린 질문까지, 단서를 찾아 생각을 넓혀 가요.", bodyEn: "Choose a curious scene and write your own question first. Explore facts, inferences, and open questions with evidence from the story.", tags: "나의 질문 · 책 속 근거 · 생각 나누기", tagsEn: "My question · Evidence · Different ideas" },
    { icon: "print", title: "생각의 과정을 한 장씩", en: "Give every idea a place", body: "읽기 전·중·후 활동에 맞는 기록지를 골라 채워요. 작성한 기록은 PDF로 내려받거나 인쇄해서 수업 자료로 쓸 수 있어요.", bodyEn: "Choose a worksheet for before, during, or after reading. Complete it, then download a PDF or print it for your lesson.", tags: "단계별 기록지 · PDF · 인쇄", tagsEn: "Reading worksheets · PDF · Print" },
    { icon: "theater", title: "책 속 인물에게 목소리를", en: "Give the characters a voice", body: "장면을 대사로 바꾸고 역할을 나눠 읽어요. 무대 장치 없이도 말의 빠르기, 쉼, 감정으로 함께 이야기를 표현할 수 있어요.", bodyEn: "Turn a scene into dialogue and read different roles. Use pace, pauses, and expression to bring the story to life together.", tags: "대본 · 역할 나누기 · 낭독 연습", tagsEn: "Scripts · Roles · Reading aloud" },
    { icon: "pencil", title: "독자에서, 우리 이야기의 작가로", en: "From reader to author", body: "주제와 책의 종류를 정하고 줄거리를 장면으로 나눠요. 글과 그림을 배치하고 고쳐 쓰며, 완성한 책을 읽고 인쇄해요.", bodyEn: "Choose a theme and book type, then shape a plot into scenes. Arrange words and pictures, revise, and read or print the finished book.", tags: "주제 · 구성 · 글과 그림 · 책 완성", tagsEn: "Theme · Outline · Words & pictures · Publish" },
  ];
  const questions = [
    { q: "온책읽기는 어떤 수업인가요?", qEn: "What is whole-book reading?", a: "한 권을 끝까지 읽으며 질문하고, 생각을 나누고, 자기 삶과 연결하는 독서 경험이에요. 온책읽기는 책 선택부터 읽기, 탐구, 표현, 기록까지 이어지는 활동을 한 공간에 모았어요.", aEn: "It is the experience of reading a whole book, asking questions, sharing ideas, and connecting the story to life. This space brings book selection, reading, inquiry, expression, and reflection together." },
    { q: "모든 활동을 순서대로 해야 하나요?", qEn: "Do we have to follow every step?", a: "필요한 활동만 골라도 괜찮아요. 책만 읽거나 듣고, 기록지만 작성하거나 책 공방부터 시작할 수도 있어요. 한 권을 중심으로 연결하면 수업의 흐름을 이어 가기 쉬워져요.", aEn: "Choose only what your lesson needs. Read or listen to a book, complete a worksheet, or start in the story studio. Connecting activities around one book helps build a continuous reading journey." },
    { q: "로그인과 체험 데모는 어떻게 다른가요?", qEn: "How is signing in different from the demo?", a: "체험 데모는 로그인 없이 샘플로 기능을 살펴보는 공간이에요. Google 로그인 후에는 계정별 작업 공간으로 들어가요. 현재 책갈피·기록·작품은 사용하는 브라우저와 기기에 저장되며, 다른 기기로 자동 동기화되지는 않아요. 중요한 작업은 사용 안내에서 백업해 주세요.", aEn: "The demo lets you explore sample activities without signing in. Google sign-in opens your account's workspace. Bookmarks, notes, and books are currently stored in the browser and device you use, rather than automatically synced across devices. Back up important work from the guide." },
    { q: "아이들이 함께 책을 만들 수 있나요?", qEn: "Can children make a book together?", a: "개인 또는 모둠 활동으로 주제, 구성, 장면, 역할을 나누어 책을 만들 수 있어요. 현재는 한 기기에서 함께 작성하거나 파일을 주고받는 방식으로 사용해요. 여러 기기에서 동시에 편집하는 실시간 협업은 아직 제공하지 않아요.", aEn: "Plan a book individually or as a group, dividing themes, scenes, and roles. For now, collaborate on one device or exchange files. Live simultaneous editing across devices is not available yet." },
    { q: "AI가 글과 그림을 자동으로 만들어 주나요?", qEn: "Does AI automatically create the words and pictures?", a: "책 공방에서는 주제·키워드·책 종류·그림 스타일을 정하고 단계별로 글과 그림을 구성할 수 있어요. 현재 공개 서비스의 새 AI 글·삽화 생성은 연결 준비 중이에요. 직접 글을 쓰고 준비한 그림을 넣는 제작 기능과, 고전 샘플에 저장된 낭독은 사용할 수 있어요.", aEn: "The studio helps you choose a theme, keywords, book type, and illustration style, then build a book step by step. New AI text and illustration generation is being prepared for the public service. You can already write, add your own pictures, and listen to the saved narration for the classic samples." },
  ];

  return <div className="landing-page">
    <a className="skip-link" href="#landing-main">{t("본문 바로가기", "Skip to content")}</a>
    <header className="landing-header">
      <div className="landing-header-inner">
        <Link href="/" className="landing-brand" aria-label={t("온책읽기 홈", "Onbook home")}><Icon name="book" size={43}/><span>온책읽기<small>READ. WONDER. CREATE.</small></span></Link>
        <nav className="landing-nav" aria-label={t("서비스 소개", "About Onbook")}><a href="#how-it-works">{t("어떤 공간인가요?", "How it works")}</a><a href="#classroom">{t("우리 반 수업", "In the classroom")}</a><a href="#try-it">{t("직접 체험하기", "Try it out")}</a></nav>
        <div className="landing-header-actions"><button className="landing-utility" onClick={() => setState(s => ({...s, locale: s.locale === "ko" ? "en" : "ko"}))} aria-label={t("영어로 전환", "Switch to Korean")}>{state.locale === "ko" ? "EN" : "KO"}</button><button className="landing-utility landing-theme" onClick={() => setState(s => ({...s, theme: s.theme === "light" ? "dark" : "light"}))} aria-label={t(state.theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환", state.theme === "light" ? "Switch to dark mode" : "Switch to light mode")}><Icon name={state.theme === "light" ? "moon" : "sun"} size={18}/></button><LoginButton next="/app" className="landing-button landing-button-small landing-button-primary">{t("Google 로그인", "Sign in with Google")}</LoginButton></div>
      </div>
    </header>

    <main id="landing-main">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow"><span/>{t("책 한 권으로 시작하는, 우리 반의 더 넓은 세상", "A whole world begins with one book")}</p>
          <h1 id="landing-title">{t("한 권을 읽고,", "Read a book.")}<br/><em>{t("우리의 이야기를 만들어요.", "Make a story of your own.")}</em></h1>
          <p className="landing-lead">{t("읽고 듣는 순간부터 스스로 질문하고, 함께 표현하고, 책을 만드는 순간까지.", "From reading and listening to asking questions, sharing ideas, and making a book.")}<br className="landing-desktop-break"/>{" "}{t("선생님과 아이들의 독서 여정을 한곳에서 이어 가요.", "A welcoming place for every classroom's reading journey.")}</p>
          <div className="landing-actions"><LoginButton next="/app" className="landing-button landing-button-primary">{t("Google로 시작하기", "Start with Google")}</LoginButton><Link href="/demo" className="landing-button landing-button-outline">{t("로그인 없이 체험하기", "Explore without signing in")}<Icon name="arrow" size={18}/></Link></div>
          <p className="landing-hero-note">{t("초등 1–6학년 · 읽기부터 질문, 표현, 창작까지", "Grades 1–6 · Reading, inquiry, expression, and creation")}</p>
        </div>
        <div className="landing-village"><JourneyLandscape alt={t("책 읽는 나무 아래, 궁금한 우체국, 이야기 극장, 책 공방이 오솔길로 연결된 마을", "A village path connecting a reading tree, curiosity post office, theater, and story studio")}/><span className="landing-village-note">{t("오늘은 어느 이야기 길로 가 볼까요?", "Where will your curiosity take you?")}</span></div>
        <div className="landing-paths" aria-label={t("독서 여정 체험", "Explore the reading journey")}>{paths.map(path => <Link href={path.href} key={path.href}><Icon name={path.icon} size={37}/><span>{t(path.ko, path.en)}</span><Icon name="arrow" size={14}/></Link>)}</div>
      </section>

      <section className="landing-intro landing-container" id="how-it-works" aria-labelledby="landing-intro-title">
        <div><p className="landing-eyebrow">ONE BOOK, MANY POSSIBILITIES</p><h2 id="landing-intro-title">{t("책장을 덮은 뒤에도,", "Even after the last page,")}<br/>{t("이야기는 계속 자라니까요.", "the story keeps growing.")}</h2></div>
        <div className="landing-intro-text"><p>{t("온책읽기는 한 권을 끝까지 읽으며 아이의 생각이 자라는 시간이에요. 정해진 답을 찾는 활동에서 한 걸음 더 나아가, 궁금해하고 자기 말로 표현하는 경험을 함께 만들어요.", "Whole-book reading gives children time to grow with a story. They become curious, form their own interpretations, and find words to express what they think.")}</p><p>{t("수업에 필요한 활동을 골라 쓰고, 한 권을 중심으로 자연스럽게 연결하세요. 책마다, 학급마다, 아이마다 다른 여정이 펼쳐집니다.", "Choose the activities your lesson needs and connect them around a book. Each story, class, and child can follow a different path.")}</p></div>
      </section>

      <section className="landing-features landing-container" aria-label={t("온책읽기의 여섯 가지 활동", "Six ways to explore a book")}>
        {features.map((feature, index) => <article className="landing-feature" key={feature.title}><div className="landing-feature-top"><Icon name={feature.icon} size={72}/><span>0{index + 1}</span></div><h3>{t(feature.title, feature.en)}</h3><p>{t(feature.body, feature.bodyEn)}</p><span className="landing-feature-tags">{t(feature.tags, feature.tagsEn)}</span></article>)}
      </section>

      <section className="landing-question-section">
        <div className="landing-container landing-question-layout">
          <div className="landing-question-copy"><p className="landing-eyebrow">LET CURIOSITY GROW</p><h2>{t("좋은 질문은,", "A good question")}<br/>{t("아이 안에서 시작돼요.", "begins with a child.")}</h2><p>{t("‘무슨 일이 있었지?’에서 ‘왜 그랬을까?’로. 그리고 ‘나라면 어떻게 했을까?’로. 아이가 만든 질문을 소중하게 다루고, 책 속에서 근거를 찾아 생각을 이어 가요.", "What happened? Why did it happen? What would I have done? Give children's questions room to grow, then return to the story to explore their ideas.")}</p><Link href="/demo/inquiry?book=heungbu-nolbu" className="landing-text-link">{t("나의 첫 질문 남겨보기", "Try writing your first question")}<Icon name="arrow" size={18}/></Link></div>
          <div className="landing-question-paper"><span className="landing-paper-label"><Icon name="question" size={35}/>{t("흥부와 놀부를 읽고", "After reading Heungbu and Nolbu")}</span><blockquote>{t("“흥부는 왜 잘못한 형을", "“Why did Heungbu welcome his brother")}<br/>{t("다시 받아 주었을까?”", "after everything he had done?”")}</blockquote><div className="landing-paper-line"><span>{t("내가 찾은 단서", "A clue I found")}</span><p>{t("형이 잘못을 인정하고 사과한 장면이 있었어.", "There was a scene where his brother admitted his mistake and apologized.")}</p></div><div className="landing-paper-line"><span>{t("한 걸음 더 궁금해", "Now I wonder")}</span><p>{t("사과하지 않았어도 받아 주었을까?", "Would he have welcomed him without an apology?")}</p></div><span className="landing-paper-caption">{t("정답을 서두르지 않는, 질문의 시간", "A little time to wonder before deciding")}</span></div>
        </div>
      </section>

      <section className="landing-classroom landing-container" id="classroom" aria-labelledby="landing-classroom-title">
        <div className="landing-section-heading"><p className="landing-eyebrow">EVERY CHILD, THEIR OWN PACE</p><h2 id="landing-classroom-title">{t("같은 책도, 우리 반답게.", "One book. Your classroom's own way.")}</h2><p>{t("아이들의 읽기 수준과 수업 목표에 맞춰 활동의 깊이와 표현 방법을 골라요.", "Choose the depth and form of each activity to suit your readers and your lesson.")}</p></div>
        <div className="landing-grade-tabs" role="group" aria-label={t("학년별 수업 예시 선택", "Choose an example by grade")}>
          {gradePlans.map((item, index) => <button key={item.label} onClick={() => setGrade(index)} aria-pressed={grade === index}>{t(`초등 ${item.label}학년`, `Grades ${item.label}`)}</button>)}
        </div>
        <div className="landing-grade-panel" aria-live="polite"><div className="landing-grade-summary"><span className="landing-small-label">{t("흥부와 놀부 · 수업 구성 예시", "Heungbu and Nolbu · Example lesson")}</span><h3>{t(plan.ko, plan.en)}</h3><p>{t(plan.description, plan.descriptionEn)}</p><ol>{plan.steps.map((step, index) => <li key={step}><span>{index + 1}</span>{t(step, plan.stepsEn[index])}</li>)}</ol></div><div className="landing-grade-wonder"><Icon name="sparkle" size={70}/><span>{t("함께 꺼내 볼 질문", "A question to explore together")}</span><p>“{t(plan.question, plan.questionEn)}”</p><Link href="/demo/learn/heungbu-nolbu" className="landing-text-link">{t("책과 활동 펼치기", "Open the book and activities")}<Icon name="arrow" size={17}/></Link></div></div>
      </section>

      <section className="landing-studio-section">
        <div className="landing-container landing-studio-layout"><div className="landing-studio-art"><div className="landing-mini-book"><BookArtwork variant="coast"/><div><span>{t("우리 동네 이야기", "A story from our town")}</span><strong>{t("애월의 바람 우체국", "The Wind Post Office")}</strong><small>{t("상상에서 시작한 작은 책 한 권", "A little book that began with an idea")}</small></div></div><span className="landing-studio-stamp"><Icon name="pencil" size={48}/>{t("내가 쓰는 다음 이야기", "My next story")}</span></div><div className="landing-studio-copy"><p className="landing-eyebrow">OUR NEXT CHAPTER</p><h2>{t("읽는 즐거움이,", "The joy of reading")}<br/>{t("만드는 즐거움으로.", "becomes the joy of making.")}</h2><p>{t("선생님은 우리 동네와 수업 주제로 읽어줄 책을 준비하고, 아이들은 혼자 또는 모둠으로 자기 이야기를 엮어요. 무엇을 만들지 막막할 땐 작은 키워드 하나부터 시작해 보세요.", "Teachers can prepare a book around their neighborhood or lesson. Children can shape their own stories, individually or in groups. One little keyword is enough to begin.")}</p><div className="landing-keywords"><span>{t("제주 애월", "Aewol, Jeju")}</span><span>{t("우정", "Friendship")}</span><span>{t("그림책", "Picture book")}</span><span>{t("색연필 느낌", "Colored pencil")}</span></div><ol className="landing-studio-steps"><li><b>01</b><span>{t("주제와 책의 모양 정하기", "Choose a theme and book type")}</span></li><li><b>02</b><span>{t("장면을 나누고 글·그림 채우기", "Plan scenes and add words and pictures")}</span></li><li><b>03</b><span>{t("함께 고쳐 쓰고 한 권으로 완성하기", "Revise together and finish your book")}</span></li></ol><Link href="/demo/studio" className="landing-button landing-button-outline">{t("책 공방 체험하기", "Explore the story studio")}<Icon name="arrow" size={18}/></Link></div></div>
      </section>

      <section className="landing-demo landing-container" id="try-it" aria-labelledby="landing-demo-title"><div className="landing-section-heading"><p className="landing-eyebrow">OPEN A LITTLE DOOR</p><h2 id="landing-demo-title">{t("설명보다, 한 번 펼쳐 보세요.", "Open a book and try it yourself.")}</h2><p>{t("로그인 없이 샘플로 읽기부터 책 만들기까지 직접 해볼 수 있어요.", "Explore reading, worksheets, and book making with samples. No sign-in needed.")}</p></div><div className="landing-demo-grid"><Link href="/demo/reader/heungbu-nolbu" className="landing-demo-card"><Icon name="book" size={76}/><span className="landing-small-label">{t("첫 번째 문", "DOOR ONE")}</span><h3>{t("이야기 읽고 듣기", "Read and listen")}</h3><p>{t("전래동화 5편과 이솝우화 5편. 책을 펼치고 낭독을 들어 보세요.", "Five Korean folktales and five Aesop's fables. Open a book and hear the story.")}</p><span className="landing-demo-link">{t("흥부와 놀부 펼치기", "Open Heungbu and Nolbu")}<Icon name="arrow" size={18}/></span></Link><Link href="/demo/learn/heungbu-nolbu" className="landing-demo-card"><Icon name="print" size={76}/><span className="landing-small-label">{t("두 번째 문", "DOOR TWO")}</span><h3>{t("질문과 기록지 만들기", "Ask and reflect")}</h3><p>{t("읽기 전·중·후 양식을 채우고, 내 기록을 PDF로 내려받아 보세요.", "Try a reading worksheet, record your ideas, and download your work as a PDF.")}</p><span className="landing-demo-link">{t("독서 활동 시작하기", "Try a reading activity")}<Icon name="arrow" size={18}/></span></Link><Link href="/demo/studio" className="landing-demo-card"><Icon name="pencil" size={76}/><span className="landing-small-label">{t("세 번째 문", "DOOR THREE")}</span><h3>{t("나만의 작은 책 만들기", "Make your own little book")}</h3><p>{t("주제를 고르고 장면을 구성해, 글과 그림이 담긴 책을 만들어 보세요.", "Choose a theme and plan your scenes. Put your words and pictures into a book.")}</p><span className="landing-demo-link">{t("책 공방 들어가기", "Enter the story studio")}<Icon name="arrow" size={18}/></span></Link></div><div className="landing-audio-sample"><div><Icon name="headphones" size={47}/><span><strong>{t("잠깐, 이야기 한 편 들어볼까요?", "A little story for your ears")}</strong><small>{t("흥부와 놀부 · 한국어 AI 낭독 샘플", "Heungbu and Nolbu · Korean AI narration sample")}</small></span></div><audio controls preload="none" aria-label={t("흥부와 놀부 한국어 낭독", "Heungbu and Nolbu, Korean narration")} src="/audio/classics-ai/heungbu-nolbu/ko.mp3"/></div></section>

      <section className="landing-faq landing-container" aria-labelledby="landing-faq-title"><div><p className="landing-eyebrow">A FEW THINGS TO KNOW</p><h2 id="landing-faq-title">{t("시작하기 전,", "Before you begin,")}<br/>{t("궁금한 것들.", "a few helpful answers.")}</h2></div><div className="landing-faq-list">{questions.map(question => <details key={question.q}><summary>{t(question.q, question.qEn)}<span aria-hidden="true">+</span></summary><p>{t(question.a, question.aEn)}</p></details>)}</div></section>

      <section className="landing-final-cta" aria-labelledby="landing-final-title"><Icon name="leaf" size={70}/><p className="landing-eyebrow">THE NEXT PAGE IS YOURS</p><h2 id="landing-final-title">{t("우리의 첫 이야기를", "Your first story")}<br/>{t("함께 시작해 볼까요?", "is waiting to begin.")}</h2><p>{t("한 권의 책, 하나의 질문, 그리고 아이들의 새로운 이야기.", "One book, one question, and a whole new world of children's stories.")}</p><div className="landing-actions"><LoginButton next="/app" className="landing-button landing-button-primary">{t("Google로 로그인하고 시작하기", "Sign in with Google and begin")}</LoginButton><Link href="/demo" className="landing-button landing-button-outline">{t("먼저 체험해 볼게요", "Explore the demo first")}<Icon name="arrow" size={18}/></Link></div></section>
    </main>

    <footer className="landing-footer"><div className="landing-container"><Link href="/" className="landing-brand"><Icon name="book" size={36}/><span>온책읽기<small>READ. WONDER. CREATE.</small></span></Link><p>{t("읽고, 궁금해하고, 함께 만드는 초등 독서 공간", "A space for children to read, wonder, and create")}</p><a href="#landing-main">{t("맨 위로", "Back to top")} ↑</a></div></footer>
  </div>;
}
