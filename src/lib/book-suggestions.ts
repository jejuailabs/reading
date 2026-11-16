import type { Book, BookSource, StoryPage } from "./model.ts";

export type BookInterest = "nature" | "feelings" | "relationships" | "school" | "expression" | "society" | "life" | "imagination";
export const bookInterests: { id: BookInterest; ko: string; en: string }[] = [
  { id: "nature", ko: "자연·과학", en: "Nature and science" },
  { id: "feelings", ko: "감정·마음", en: "Feelings" },
  { id: "relationships", ko: "친구·가족", en: "Friends and family" },
  { id: "school", ko: "학교·용기", en: "School and courage" },
  { id: "expression", ko: "말·글·시", en: "Words and poetry" },
  { id: "society", ko: "사회·공동체", en: "Society and community" },
  { id: "life", ko: "생명·성장", en: "Life and growth" },
  { id: "imagination", ko: "상상·모험", en: "Imagination and adventure" },
];

export type BookSuggestion = {
  id: string; title: string; author: string; edition: string; isbn: string;
  grades: number[]; interests: BookInterest[]; format: string; formatEn: string;
  reason: string; reasonEn: string; support: string; supportEn: string;
  official: string; officialEn: string; url: string; evidence: "direct" | "indexed";
};

/** Bibliographic metadata only. No book text, cover images or reading rights are bundled. */
export const bookSuggestions: BookSuggestion[] = [
  {
    id: "watermelon-pool", title: "수박 수영장", author: "안녕달", edition: "창비 · 2015", isbn: "9788936446819",
    grades: [1, 2], interests: ["nature", "imagination", "society"], format: "그림책", formatEn: "Picture book",
    reason: "그림 속 단서로 다음 장면을 예상하고 상상과 실제를 나누어 이야기하는 공동 읽기 후보예요.",
    reasonEn: "A shared-reading option for predicting from visual clues and distinguishing imagination from reality.",
    support: "그림을 살필 시간을 주세요. 여름 체험 이야기는 선택이에요.", supportEn: "Allow time to look closely. Sharing personal summer experiences is optional.",
    official: "교육청 도서관은 아동서로 분류합니다. 제안 학년은 우리 설계이며, 공식 서지 색인으로 확인했습니다.",
    officialEn: "The education library lists a children's book. Grades are our suggestion; metadata was checked in its official search index.",
    url: "https://sdmlib.sen.go.kr/sdmlib/intro/search/detail.do?isbn=9788936446819&menu_idx=5&vCtrl=5575521135&vLoca=111016", evidence: "indexed",
  },
  {
    id: "magic-candies", title: "알사탕", author: "백희나 글·그림", edition: "스토리보울 · 2024 개정판", isbn: "9791198610614",
    grades: [1, 2], interests: ["feelings", "relationships", "imagination"], format: "그림책", formatEn: "Picture book",
    reason: "인물의 말·표정·행동에서 드러나지 않은 마음을 추론하고 서로의 해석을 비교해요.",
    reasonEn: "Infer feelings from words, expressions and actions, then compare interpretations.",
    support: "다른 사람의 마음을 단정하지 않아요. 2017년 책읽는곰 판본과 구분해 주세요.", supportEn: "Avoid claiming certainty about another person's feelings. Distinguish this edition from the 2017 edition.",
    official: "도서관 서지의 대상은 유아용입니다. 초등 1~2학년 함께 읽기는 우리 제안이에요.",
    officialEn: "The library catalog labels it for young children. Shared reading in grades 1–2 is our proposal.",
    url: "https://www.eplib.or.kr/intro/program/alpasq/searchResultDetail.do?bookKey=591941747&isbn=9791198610614&pubFormCode=MO&searchManageCode=ALL&searchType=NEW&speciesKey=591941745", evidence: "direct",
  },
  {
    id: "okay-to-be-wrong", title: "틀려도 괜찮아", author: "마키타 신지 글 · 하세가와 토모코 그림 · 유문조 옮김", edition: "토토북 · 2006", isbn: "9788990611260",
    grades: [1, 2], interests: ["school", "feelings", "expression"], format: "그림책", formatEn: "Picture book",
    reason: "실수와 발표에 대한 생각을 나누고 안전하게 이야기하는 교실 약속을 만들기 좋아요.",
    reasonEn: "Discuss mistakes and speaking up, then make agreements for a supportive classroom.",
    support: "발표를 강요하지 않고 그림·짝 이야기 등 다른 표현 방법도 열어 주세요.", supportEn: "Offer drawing or partner talk instead of requiring public speaking.",
    official: "출판 메타데이터는 어린이 대상이며 초등 신입생 교실을 소개합니다. 학년 배치는 우리 제안이에요.",
    officialEn: "Publisher metadata describes a children's book about starting school. The grade placement is our proposal.",
    url: "https://bnk.kpipa.or.kr/home/v3/addition/adiPromoMetaDataView/seq_20211207113915023286", evidence: "direct",
  },
  {
    id: "nine-year-old-feelings", title: "아홉 살 마음 사전", author: "박성우 글 · 김효은 그림", edition: "창비 · 2017", isbn: "9788936447014",
    grades: [2, 3], interests: ["feelings", "expression", "relationships"], format: "감정 어휘 보조책", formatEn: "Companion vocabulary book",
    reason: "인물의 마음을 다양한 낱말로 표현하는 보조책으로 연결해요.", reasonEn: "Use as a companion for describing characters' feelings with a richer vocabulary.",
    support: "사전형 책이에요. 필요한 낱말만 읽었다면 부분 읽기로 기록해 주세요.", supportEn: "This is a dictionary-style book. Record selected entries as partial reading.",
    official: "출판사 소개는 초등 저학년 대상입니다. 2~3학년 보조책 활용은 우리 제안이에요.",
    officialEn: "The publisher describes lower-elementary readers. Companion use in grades 2–3 is our proposal.",
    url: "https://library.hira.or.kr/search/detail/CATTOT000000031912", evidence: "direct",
  },
  {
    id: "manbok-rice-cakes", title: "만복이네 떡집", author: "김리리 글 · 이승현 그림", edition: "비룡소 · 2010", isbn: "9788949161341",
    grades: [2, 3], interests: ["relationships", "expression", "imagination"], format: "동화", formatEn: "Story",
    reason: "말과 행동의 결과를 연결하고 인물이 달라지는 근거를 찾아요. 3학년 중심, 2학년은 낭독 지원을 제안해요.",
    reasonEn: "Connect words and actions to consequences. Suggested mainly for grade 3, with read-aloud support for grade 2.",
    support: "특정 아이를 인물과 비교해 나쁜 아이로 지목하지 않아요.", supportEn: "Do not use the character to label a child as bad.",
    official: "출판사 목록의 연령 표시는 9~11세입니다. 현재 교과서 수록 여부를 확인한 것은 아니에요.",
    officialEn: "The publisher lists ages 9–11. Current textbook inclusion has not been verified.",
    url: "https://lib.nyj.go.kr/hp/menu/10893/program/30021/plusSearchResultDetail.do?bookKey=180657544&publishFormCode=BO&recKey=180657542&searchLibraryArr=CM&searchType=LOANBEST", evidence: "direct",
  },
  {
    id: "book-eating-fox", title: "책 먹는 여우 (25주년 기념판)", author: "프란치스카 비어만", edition: "주니어김영사 · 2026 기념판", isbn: "9791173326615",
    grades: [3, 4], interests: ["expression", "imagination"], format: "동화", formatEn: "Story",
    reason: "엉뚱한 설정과 인물의 선택을 이야기하고 나만의 짧은 창작으로 이어가요.",
    reasonEn: "Discuss an unusual premise and the character's choices, then try a short piece of original writing.",
    support: "이 판본의 역자는 판권면에서 확인해 주세요. 초판과 기념판의 쪽수·구성이 다를 수 있어요.", supportEn: "Check the translator on this edition's copyright page. Its pagination and contents may differ from earlier editions.",
    official: "공공 출판 메타데이터로 2026 기념판을 확인했습니다. 3~4학년 배치는 우리 제안이에요.",
    officialEn: "Public publishing metadata confirms the 2026 edition. Grades 3–4 are our proposal.",
    url: "https://bnk.kpipa.or.kr/home/v3/addition/adiPromoMetaDataView02/seq_20260624094311358068", evidence: "direct",
  },
  {
    id: "candidate-anseokbong", title: "기호 3번 안석뽕", author: "진형민 글 · 한지선 그림", edition: "창비 · 2013 초간 / 확인 서지 2019 특별판", isbn: "9788936442712",
    grades: [4, 5, 6], interests: ["society", "school", "expression"], format: "장편동화", formatEn: "Longer story",
    reason: "선거와 시장을 둘러싼 서로 다른 의견과 설득의 근거를 비교해요.", reasonEn: "Compare different interests and reasons for persuasion around an election and a market.",
    support: "4학년에는 선거·시장 배경과 분량을 지원해 주세요. 현실 정당 선택을 묻는 활동으로 바꾸지 않아요.", supportEn: "Support background knowledge and reading load in grade 4. Do not turn the activity into choosing a political party.",
    official: "고학년 창작 부문 수상 이력과 특정 학년의 공식 권장은 별개입니다. 제안 학년은 4~6학년이에요.",
    officialEn: "An award in the upper-elementary category is not an official grade assignment. We suggest grades 4–6 with support.",
    url: "https://www.u-library.kr/search/detail/CAT000003739005", evidence: "direct",
  },
  {
    id: "wanini-one", title: "푸른 사자 와니니 1", author: "이현 글 · 오윤화 그림", edition: "창비 · 2015", isbn: "9788936442804",
    grades: [4, 5, 6], interests: ["nature", "relationships", "life", "imagination"], format: "장편동화", formatEn: "Longer story",
    reason: "소속감·편견·협력 속에서 인물이 자신과 타인을 보는 관점이 어떻게 바뀌는지 살펴요.",
    reasonEn: "Trace changing views of self and others through belonging, prejudice and cooperation.",
    support: "4학년은 긴 글 읽기 지원이 필요해요. 위협·죽음 소재를 살피고, 소설 속 생태와 과학 사실을 구분해요.", supportEn: "Grade 4 may need reading support. Consider threat and death themes and distinguish fictional ecology from verified facts.",
    official: "공공도서관에서 1권 서지를 확인했습니다. 4~6학년 공동 읽기는 우리 제안이에요.",
    officialEn: "The public library confirms volume 1 metadata. Shared reading in grades 4–6 is our proposal.",
    url: "https://lib.nyj.go.kr/jinjeop/plusLoanBestResultDetail.do?bookKey=147606248&publishFormCode=BO&recKey=147606245&searchLibraryArr=MC&searchType=LOANBEST", evidence: "direct",
  },
  {
    id: "long-long-night", title: "긴긴밤 (큰 판형 양장본)", author: "루리 글·그림", edition: "문학동네 · 2021 큰 판형 양장본", isbn: "9788954684033",
    grades: [5, 6], interests: ["life", "relationships", "feelings"], format: "동화", formatEn: "Story",
    reason: "상실·돌봄·연대와 결말의 의미를 근거로 이야기하는 후보예요.", reasonEn: "Explore loss, care, solidarity and the ending through evidence-based discussion.",
    support: "죽음·전쟁·상실 소재가 있어요. 개인의 사별 경험을 발표시키지 않고 다른 책 선택도 허용해요.", supportEn: "Includes death, war and loss. Do not require sharing bereavement experiences; allow an alternative book.",
    official: "출판사는 5~6학년 동화로 분류합니다. 여기서는 큰 판형 판본을 지정했어요.",
    officialEn: "The publisher categorizes it for grades 5–6. This suggestion names the large-format edition.",
    url: "https://dl.nanet.go.kr/detail/MONO12026000000756", evidence: "direct",
  },
  {
    id: "charlotte-web", title: "샬롯의 거미줄", author: "엘윈 브룩스 화이트 글 · 가스 윌리엄즈 그림 · 김화곤 옮김", edition: "시공사/시공주니어 · 확인 판본 2018", isbn: "9788952787590",
    grades: [5, 6], interests: ["life", "relationships", "expression"], format: "장편동화", formatEn: "Longer story",
    reason: "우정과 편견을 이야기하고 이름과 표현이 타인을 보는 시선을 어떻게 바꾸는지 살펴요.",
    reasonEn: "Discuss friendship and prejudice, and how naming and language change perceptions.",
    support: "분량을 함께 나누어 계획하고 동물 도축·죽음 소재를 미리 살펴요.", supportEn: "Plan the reading load together and consider animal slaughter and death themes beforehand.",
    official: "출판 메타데이터에 초등 5~6학년 키워드가 있습니다. 공교육 필독 지정이라는 뜻은 아니에요.",
    officialEn: "Publisher metadata includes a grades 5–6 keyword. This does not mean a mandatory school reading designation.",
    url: "https://bnk.kpipa.or.kr/home/v3/addition/adiPromoMetaDataView/seq_20220621000000005580", evidence: "direct",
  },
  {
    id: "hen-outside-yard", title: "마당을 나온 암탉 (양장본)", author: "황선미", edition: "사계절 · 2000 양장본", isbn: "9788971967447",
    grades: [5, 6], interests: ["life", "relationships", "society"], format: "동화", formatEn: "Story",
    reason: "자유·선택·돌봄에 대해 같은 결말의 여러 해석을 근거와 함께 비교해요.", reasonEn: "Compare interpretations of the ending through freedom, choice and care.",
    support: "포식·죽음 소재가 있어요. 가족 형태나 돌봄에 한 가지 답을 강요하지 않아요.", supportEn: "Includes predation and death. Avoid a single prescribed answer about family or care.",
    official: "출판사에 추천·교과서 수록 이력이 있으나 현행 수록 여부는 미확인입니다. 5~6학년은 우리 제안이에요.",
    officialEn: "The publisher lists recommendation and textbook history; current inclusion is unverified. Grades 5–6 are our proposal.",
    url: "https://www.sakyejul.net/bbs/m/publishing_data_view.php?ep=ep993587793575e55ff04653&gp=all&item=B0437&type=publishing", evidence: "direct",
  },
  {
    id: "holes-in-our-body", title: "우리 몸의 구멍", author: "허은미 글 · 이혜리 그림", edition: "길벗어린이 · 초판 표기 2000 / 현행 소개 ISBN", isbn: "9788955821185",
    grades: [1, 2], interests: ["nature", "life"], format: "정보책·과학그림책", formatEn: "Information picture book",
    reason: "그림과 설명에서 정보를 찾고 알고 있던 것·새로 알게 된 것·더 궁금한 것을 나누어요.",
    reasonEn: "Find information in illustrations and explanations, then compare prior knowledge, new learning and questions.",
    support: "몸의 생김새를 평가하거나 사적인 신체 경험을 발표시키지 않아요. 비유와 실제 설명을 구분해요.", supportEn: "Do not judge bodies or require personal disclosures. Distinguish analogy from factual explanation.",
    official: "출판사 권장 연령에 초등 1~2학년이 명시되어 있어요. 수업 활동은 우리 제안입니다.",
    officialEn: "The publisher explicitly includes grades 1–2. The proposed classroom activity is ours.",
    url: "https://gilbutkid.co.kr/216993336/?idx=618", evidence: "direct",
  },
  {
    id: "potato-flowers-poems", title: "감자꽃: 권태응 동시집", author: "권태응 글 · 신슬기 그림", edition: "푸른책들(보물창고) · 2014", isbn: "9788961703833",
    grades: [3, 4], interests: ["nature", "expression", "feelings"], format: "동시선집", formatEn: "Poetry collection",
    reason: "소리 내어 읽고 리듬·이미지·마음에 남는 표현을 서로 다르게 느껴 보는 시 읽기 후보예요.",
    reasonEn: "Read aloud and explore different responses to rhythm, imagery and memorable language.",
    support: "옛 생활 어휘를 도와주세요. 일부 시만 읽으면 부분 읽기로 기록하고 암송이나 정답 해석을 강요하지 않아요.", supportEn: "Support older vocabulary. Record selected poems as partial reading and avoid compulsory memorization or one correct interpretation.",
    official: "국립중앙도서관 정보나루에서 동시선집 서지를 확인했습니다. 3~4학년 배치는 우리 제안이에요.",
    officialEn: "National Library metadata confirms this poetry collection. Grades 3–4 are our proposal.",
    url: "https://data4library.kr/bookV?seq=2368083", evidence: "direct",
  },
];

export function filterBookSuggestions(grade: number | null, interest: BookInterest | null): BookSuggestion[] {
  return bookSuggestions.filter(book => (grade === null || book.grades.includes(grade)) && (interest === null || book.interests.includes(interest)));
}

export function findSuggestedBook(books: Book[], isbn: string): Book | undefined {
  const pattern = new RegExp(`(^|\\D)${isbn}(?=\\D|$)`);
  return books.find(book => book.source?.kind === "paper" && pattern.test(book.source.note));
}

export function suggestedBookInput(suggestion: BookSuggestion): { title: string; pages: StoryPage[]; source: BookSource } {
  return {
    title: suggestion.title, pages: [{ text: "", en: "", art: "forest" }],
    source: {
      kind: "paper", author: suggestion.author, url: suggestion.url, rights: "reference", coverage: "metadata",
      note: `ISBN: ${suggestion.isbn}\n판본: ${suggestion.edition}\n제안 학년: ${suggestion.grades.join("·")}학년 (우리 수업 설계)\n유형: ${suggestion.format}\n이용 범위: 서지·추천 정보만. 책 전문·삽화·음원 미제공. 종이책을 직접 준비하세요.\n${suggestion.official}`,
    },
  };
}
