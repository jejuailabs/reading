/** Original worksheet fields from PRD 15. Templates never invent learner responses. */
export type ReportLocale = "ko" | "en";
export type ReportStage = "select" | "before" | "during" | "inquiry" | "discuss" | "after" | "perform" | "create" | "reflect";
export type ReportAudience = "student" | "teacher" | "group" | "family";
export type BilingualText = {ko: string; en: string};
export type ReportField = {
  id: string; label: BilingualText; prompt: BilingualText;
  kind: "short" | "long" | "drawing" | "table"; rows: number;
};
export type ReportTemplate = {
  id: string; revision: number; stage: ReportStage;
  title: BilingualText; description: BilingualText;
  audience: ReportAudience[]; fields: ReportField[];
};
const f = (id: string, ko: string, en: string, hintKo = "", hintEn = "", kind: ReportField["kind"] = "long", rows = 3): ReportField => ({id, label:{ko,en}, prompt:{ko:hintKo,en:hintEn},kind,rows});
const book = () => f("book", "책과 판본", "Book and edition", "제목·저자·번역자·출판사·판본을 확인해요.", "Check the title, author, translator, publisher, and edition.", "short", 1);
const where = () => f("readingRange", "읽은 곳", "Reading location", "장·쪽·장면 또는 문단을 적어요.", "Add the chapter, page, scene, or paragraph.", "short", 1);
const help = () => f("assistance", "받은 도움", "Support used", "없음 / 문장 시작 / 짝 대화 / 교사 / AI 힌트 / 말 받아쓰기", "None / sentence starter / peer talk / teacher / AI hint / oral dictation", "short", 1);
const template = (id: string, stage: ReportStage, ko: string, en: string, audience: ReportAudience[], fields: ReportField[], descriptionKo = "필요한 부분만 골라 기록해요. 아직 생각 중인 곳은 비워 두어도 좋아요.", descriptionEn = "Choose what helps you. Leave space for ideas you are still exploring."): ReportTemplate => ({id,revision:1,stage,title:{ko,en},description:{ko:descriptionKo,en:descriptionEn},audience,fields});

export const reportTemplates: ReportTemplate[] = [
  template("FORM-01","select","책 비교·선정표","Compare and choose a book",["teacher","student"],[
    f("candidates","후보 세 권","Three candidates","제목·판본·관심 주제·읽을 분량을 비교해요.","Compare titles, editions, themes, and reading length.","table",5),
    f("interest","읽고 싶은 이유","Why I want to read them"),
    f("access","책을 구하는 방법과 읽기 지원","Access and reading support","보유·대출·구입 여부와 종이/웹/듣기를 확인해요.","Check copies, loans, purchase, and print/web/audio access."),
    f("choice","고른 책과 선정 이유","My choice and reasons"),
  ]),
  template("FORM-02","select","온책 수업 계획표","Whole-book lesson plan",["teacher"],[book(),
    f("gradePeriod","학년·학급·기간","Grade, class, and dates","","","short",1),
    f("goals","수업 목표와 확인한 성취기준","Goals and verified curriculum references"),
    f("lessonPlan","차시별 읽기와 활동","Lesson-by-lesson reading and activities","차시 / 범위 / 읽기 시간 / 선택 활동 / 준비물","Lesson / range / reading time / optional activity / materials","table",7),
    f("support","참여 매체와 지원","Participation formats and support","종이·웹·듣기·교사 읽어주기 등 필요한 방법을 골라요.","Choose print, web, audio, teacher read-aloud, or other support."),
    f("observationFocus","오늘의 관찰 초점","Observation focus","한두 가지를 골라요. 전원·전 항목 채점은 필요하지 않아요.","Choose one or two criteria. You do not need to score every learner on every item."),
  ]),
  template("FORM-03","before","책과 첫 만남","First meeting with the book",["student"],[book(),
    f("notice","표지와 제목에서 알아챈 것","What I notice in the cover and title"),
    f("prediction","내 예상과 그 이유","My prediction and reasons"),
    f("question","처음 떠오른 궁금함","My first question"),
    f("readingGoal","이번 읽기에서 해 보고 싶은 것","My reading goal"),
    f("drawing","그림으로 남기는 첫 생각","Draw your first idea","그림이나 낱말로 표현해도 좋아요.","A drawing or a few words are welcome.","drawing",5),help(),
  ]),
  template("FORM-04","during","나의 읽기 수첩","My reading notebook",["student"],[book(),
    f("date","읽은 날짜","Reading date","","","short",1),where(),
    f("scene","기억할 장면","A scene to remember"),
    f("evidence","내가 찾은 단서","Clues I noticed"),
    f("thought","지금의 생각과 궁금함","My thoughts and questions"),help(),
  ]),
  template("FORM-05","during","낱말 탐험장","Word explorer",["student"],[book(),where(),
    f("word","탐험할 낱말","The word I am exploring","","","short",1),
    f("guess","문맥으로 짐작한 뜻","Meaning I infer from context"),
    f("meaningSource","확인한 뜻과 출처","Checked meaning and source"),
    f("mySentence","내가 만든 문장","My own sentence"),
  ]),
  template("FORM-06","during","인물 마음·관계 지도","Character feelings and relationships",["student"],[book(),
    f("characters","인물과 바라는 것","Characters and what they want"),
    f("actions","행동과 그 까닭","Actions and possible reasons"),
    f("relationships","인물 사이의 관계","Relationships","이름·화살표·짧은 설명으로 연결해요.","Connect names with arrows and short descriptions.","drawing",6),
    f("change","마음이 달라진 지점","How feelings change"),
    f("evidence","그렇게 생각한 본문 근거","Story evidence for my interpretation"),
  ]),
  template("FORM-07","during","사건과 까닭 연결표","Events and causes",["student"],[book(),
    f("events","처음·중간·끝의 주요 사건","Key events: beginning, middle, end","사건과 나온 곳을 함께 적어요.","Include where each event appears.","table",5),
    f("causes","그 일이 생긴 까닭","What caused those events"),
    f("results","그 뒤 달라진 것","What changed afterward"),
    f("turningPoint","이야기의 전환점과 근거","Turning point and evidence"),
  ]),
  template("FORM-08","inquiry","내 질문 성장 기록","How my question grows",["student"],[book(),
    f("originalQuestion","처음 질문","My original question"),
    f("currentQuestion","지금 질문","My question now"),
    f("revisionReason","바꾸거나 그대로 둔 이유","Why I changed or kept it"),help(),
    f("remainingQuestion","아직 남은 질문","Questions I still have"),
  ]),
  template("FORM-09","inquiry","질문·근거·생각 보고서","Question, evidence, and thinking",["student","group"],[book(),where(),
    f("question","내가 알아보고 싶은 질문","The question I want to explore"),
    f("initialThought","처음의 잠정 생각","My first tentative idea"),
    f("evidence","책에서 찾은 단서와 연결","Story evidence and how it connects","본문 위치와 내 말로 설명한 근거를 남겨요.","Include the location and explain the evidence in your own words."),
    f("otherView","다른 해석이나 생각","Another interpretation or idea"),
    f("currentThought","지금의 생각과 그 이유","My thinking now and why"),
    f("remainingQuestion","아직 남은 궁금함","What I still wonder"),help(),
  ]),
  template("FORM-10","discuss","우리 모둠 생각 나눔 기록","Our group discussion",["group"],[book(),
    f("discussionQuestion","함께 이야기할 질문","Our discussion question"),
    f("myView","나의 의견과 근거","My view and evidence"),
    f("otherView","친구의 다른 생각과 근거","Another view and its evidence","허용된 공유 생각만 기록해요.","Include only ideas shared with permission."),
    f("agreement","같아진 생각과 남아 있는 차이","Agreement and remaining differences"),
    f("nextQuestion","대화 뒤 새로 생긴 질문","A question after our discussion"),
  ]),
  template("FORM-11","after","작품 돌아보기","Looking back at the book",["student"],[book(),
    f("summary","핵심 내용을 내 말로","Key ideas in my own words"),
    f("interpretation","인물과 주제에 대한 내 해석","My interpretation of characters and themes"),
    f("evidence","기억할 근거","Evidence I want to remember"),
    f("connection","다른 경험이나 생각과의 연결","Connections to other ideas or experiences","개인 가족 이야기나 감정을 쓰지 않아도 좋아요.","You do not need to share private family experiences or feelings."),
    f("recommendation","추천할 독자와 이유","Who I would recommend it to, and why"),
  ]),
  template("FORM-12","inquiry","비문학·자료 탐구","Nonfiction and source inquiry",["student"],[book(),
    f("question","알아보고 싶은 것","What I want to find out"),
    f("findings","알게 된 정보","What I found out"),
    f("claimEvidence","주장과 근거","Claims and evidence"),
    f("sources","자료의 출처와 날짜","Sources and dates","제목 / 발행 주체 / 날짜 / URL / 확실하지 않은 점","Title / publisher / date / URL / what remains uncertain","table",5),
    f("comparison","서로 다른 설명과 더 조사할 것","Different explanations and further questions"),
  ]),
  template("FORM-13","after","책 소개·서평·북토크","Book review and book talk",["student"],[book(),
    f("audience","소개할 대상","My intended audience","","","short",1),
    f("features","이 책의 특징","What makes this book distinctive"),
    f("recommendation","근거 있는 추천","My recommendation with evidence"),
    f("spoilers","미리 알려 줄 내용의 범위","My spoiler choices"),
    f("talkNotes","발표나 서평 메모","Book-talk or review notes"),
  ]),
  template("FORM-14","perform","배역·해석·연습 기록","Roles, interpretation, and rehearsal",["group"],[book(),
    f("scriptRevision","대본 판본과 장면","Script revision and scene","","","short",1),
    f("roles","배역과 결원 대안","Roles and absence alternatives","배역 / 담당 / 함께 읽기·역할 합치기 대안","Role / reader / shared reading or combined-role alternative","table",4),
    f("intentionEvidence","인물의 의도와 본문 근거","Character intention and story evidence"),
    f("readingChoices","어떻게 읽을지와 그 이유","How we will read and why"),
    f("rehearsalRevision","연습 뒤 바꾼 점","Changes after rehearsal"),
  ]),
  template("FORM-15","create","동화 제작 기획·검토표","Story creation brief and review",["teacher"],[
    f("brief","주제·지역·학년·유형","Theme, place, grade, and story type"),
    f("outline","선택한 구성안과 선택 이유","Chosen outline and reasons"),
    f("factFiction","확인한 사실과 창작한 부분","Verified facts and invented details"),
    f("manuscriptReview","원고 검토와 수정","Manuscript review and revisions"),
    f("imageRightsReview","그림·출처·이용 권리 확인","Illustration, source, and rights review"),
    f("approval","판본·검토자·승인 범위","Revision, reviewer, and approved scope","미검토 / 수정 필요 / 검토 완료와 공개 범위를 구분해요.","Separate unreviewed, changes needed, reviewed, and permitted sharing scope."),
  ]),
  template("FORM-16","create","우리 책 기획·기여·수정 기록","Our book: plan, contributions, and revisions",["student","group"],[
    f("audiencePurpose","독자와 전하고 싶은 것","Our readers and purpose"),
    f("charactersPlot","인물과 사건","Characters and plot"),
    f("roles","담당 역할","Assigned roles","역할 배정과 실제 기여는 달라요.","Assigned roles are different from actual contributions.","table",3),
    f("contributions","실제로 한 일과 작업 위치","Actual contributions and where to find them"),
    f("feedback","받은 피드백","Feedback received"),
    f("revisionReason","수정한 내용과 이유","What we revised and why"),
  ]),
  template("FORM-17","create","서로 읽고 고쳐 쓰기","Read and revise together",["student"],[
    f("draftRevision","읽은 초안과 판본","Draft and revision reviewed","","","short",1),
    f("strength","잘 전달된 부분","What came across clearly"),
    f("question","더 궁금한 부분","What I want to know more about"),
    f("suggestion","글쓴이에게 제안하고 싶은 것","My suggestion for the writer"),
    f("response","채택하거나 보류한 제안과 이유","Suggestions accepted or held, and why"),
  ]),
  template("FORM-18","reflect","수업 관찰·다음 지원","Observation and next support",["teacher"],[
    f("dateContext","관찰 날짜·대상·활동 장면","Date, learner, and activity context","","","short",1),
    f("observationFocus","관찰 초점","Observation focus","질문 / 근거 / 다른 생각 듣기 / 표현 수정 중 선택","Choose questioning / evidence / listening to other views / revision"),
    f("observationState","관찰 여부","Observation state","관찰함 / 관찰하지 않음 / 해당 없음","Observed / not observed / not applicable","short",1),
    f("observation","실제로 관찰한 사실과 근거","What I observed and supporting evidence"),
    f("support","제공한 도움","Support provided"),
    f("nextSupport","다음에 제공할 지원","Next support"),
  ],"교사 관찰용 비공개 기록입니다. 미관찰은 낮은 성취가 아닙니다.","Private teacher observation. Not observed does not mean low achievement."),
  template("FORM-19","reflect","한 권 성장 포트폴리오","My whole-book portfolio",["student","teacher","family"],[book(),
    f("selectionReason","이 책을 선택한 이유","Why I chose this book"),
    f("questionEvidence","대표 질문과 근거","A question and evidence I chose"),
    f("thinkingChange","달라지거나 깊어진 생각","How my thinking changed or deepened"),
    f("creation","표현 활동과 내가 한 일","My creative work and contribution"),
    f("reflection","나의 돌아보기","My reflection"),
    f("teacherFeedback","공유하기로 한 교사 의견","Teacher feedback selected for sharing"),
    f("nextBook","다음에 읽고 싶은 책과 이유","My next book and reasons"),
  ]),
  template("FORM-20","reflect","학급 온책 운영·수업 성찰","Class reading review",["teacher"],[book(),
    f("planActual","계획한 차시와 실제 운영","Planned and completed lessons","","","table",4),
    f("participation","참여 경로와 제공한 지원","Participation formats and support"),
    f("anonymousExample","신원을 드러내지 않는 수업 사례","A non-identifying classroom example"),
    f("workload","준비·출력·검수·정리 시간","Time for preparation, printing, review, and follow-up","클릭 수가 아니라 실제 걸린 시간을 돌아봐요.","Reflect on actual time, not just clicks."),
    f("nextChange","다음 수업에서 바꿀 점","What I will change next time"),
  ],"학급 운영을 돌아봅니다. 학생별 이해도 순위나 자동 성취 점수가 아닙니다.","Review classroom practice. This is not a learner ranking or an automatic achievement score."),
];

export const REPORT_TEMPLATES = reportTemplates;
export function getReportTemplate(id: string): ReportTemplate | undefined { return reportTemplates.find(item => item.id === id); }
export function localizeTemplate(template: ReportTemplate, locale: ReportLocale) {
  return {...template,title:template.title[locale],description:template.description[locale],fields:template.fields.map(field => ({...field,label:field.label[locale],prompt:field.prompt[locale]}))};
}
/** Only declared fields enter the export. Blank mode never includes a prior learner value. */
export function reportFields(template: ReportTemplate, values: Record<string,string>, locale: ReportLocale = "ko", blank = false) {
  return template.fields.map(field => ({label:field.label[locale],value:blank ? "" : values[field.id] ?? "",prompt:field.prompt[locale],kind:field.kind,rows:field.rows}));
}
