// References support the traditional story background; they are not imported book text.
// Research scope and reuse boundaries: docs/11_classic_sample_sources.md.
export const classicSources: Record<
  string,
  { title: string; url: string; note: string; noteEn: string }
> = {
  "heungbu-nolbu": {
    title: "한국민족문화대백과사전 · 흥부전",
    url: "https://encykorea.aks.ac.kr/Article/E0066012",
    note: "제비와 박씨, 형제의 선택을 다루는 흥부전 전승을 참고했습니다. 동물이 다치는 사건은 남기되 구체적인 가해와 고통 묘사는 줄였습니다.",
    noteEn:
      "This story draws on the Heungbujeon tradition of a swallow, a gourd seed, and the brothers' choices. It retains the injury to the bird while reducing explicit descriptions of violence and pain.",
  },
  "sun-moon-siblings": {
    title: "한국민족문화대백과사전 · 해와 달이 된 오누이",
    url: "https://encykorea.aks.ac.kr/Article/E0062663",
    note: "남매가 호랑이를 피하고 해와 달이 되는 전승을 참고했습니다. 어머니의 죽음은 짧게 알리고 신체 훼손과 피의 묘사는 생략했습니다.",
    noteEn:
      "This story draws on the traditional tale of siblings who escape a tiger and become the sun and moon. The mother's death is stated briefly, with descriptions of mutilation and blood omitted.",
  },
  "old-man-lump": {
    title: "한국민족문화대백과사전 · 혹부리 영감 설화",
    url: "https://encykorea.aks.ac.kr/Article/E0063887",
    note: "이 설화의 기원과 전승 경로에는 여러 견해가 있습니다. 몸의 모습은 인품을 판단하는 기준이 아닙니다.",
    noteEn:
      "Scholars hold different views about this tale's origins and transmission. A person's appearance is not a measure of their character.",
  },
  "rabbit-turtle-king": {
    title: "한국민족문화대백과사전 · 토끼전",
    url: "https://encykorea.aks.ac.kr/Article/E0059167",
    note: "토끼가 용궁에서 꾀로 빠져나오는 토끼전 전승을 참고했습니다. 간을 약으로 삼으려는 설정은 이야기 속 위험한 요구이며 의학 정보가 아닙니다.",
    noteEn:
      "This story draws on Tokkijeon, in which a rabbit uses wit to escape an underwater palace. The demand for a liver as medicine is a dangerous premise within the tale, not medical information.",
  },
  "kind-brothers": {
    title: "한국민족문화대백과사전 · 예산 이성만 형제 효제비",
    url: "https://encykorea.aks.ac.kr/Article/E0037944",
    note: "서로를 생각하는 형제의 전승을 참고했습니다. 인물과 효제비의 기록이 설화의 모든 장면을 역사적 사실로 증명하는 것은 아닙니다.",
    noteEn:
      "This story draws on the tradition of two brothers caring for each other. Records of the brothers and their commemorative monument do not establish every scene in the tale as historical fact.",
  },
  "aesop-hare-tortoise": {
    title: "Project Gutenberg · The Hare and the Tortoise",
    url: "https://www.gutenberg.org/cache/epub/21/pg21-images.html",
    note: "Townsend의 오래된 영문 판본에 수록된 경주 이야기를 참고했습니다. 빠르기의 차이보다 두 인물의 선택과 과정을 함께 살펴보세요.",
    noteEn:
      "This story draws on the race in Townsend's historical English edition. Explore the characters' choices and progress as well as their different speeds.",
  },
  "aesop-lion-mouse": {
    title: "Project Gutenberg · The Lion And The Mouse",
    url: "https://www.gutenberg.org/cache/epub/21/pg21-images.html",
    note: "Townsend의 오래된 영문 판본에 수록된 사자와 생쥐 이야기를 참고했습니다. 몸집과 관계없이 서로 어떤 도움을 줄 수 있는지 생각해 보세요.",
    noteEn:
      "This story draws on the lion and mouse fable in Townsend's historical English edition. Consider how characters can help each other regardless of their size.",
  },
  "aesop-fox-grapes": {
    title: "Project Gutenberg · The Fox and the Grapes",
    url: "https://www.gutenberg.org/cache/epub/21/pg21-images.html",
    note: "Townsend의 오래된 영문 판본에 수록된 여우와 포도 이야기를 참고했습니다. 여우가 한 말과 실제로 확인한 것을 구분해 보세요.",
    noteEn:
      "This story draws on the fox and grapes fable in Townsend's historical English edition. Distinguish what the fox says from what the fox has actually established.",
  },
  "aesop-wind-sun": {
    title: "Project Gutenberg · The North Wind and the Sun",
    url: "https://www.gutenberg.org/cache/epub/21/pg21-images.html",
    note: "Townsend의 오래된 영문 판본에 수록된 북풍과 태양의 겨룸을 참고했습니다. 서로 다른 행동이 나그네에게 어떤 영향을 주었는지 비교해 보세요.",
    noteEn:
      "This story draws on the contest between the North Wind and the Sun in Townsend's historical English edition. Compare how their different actions affect the traveler.",
  },
  "aesop-town-country-mouse": {
    title: "Project Gutenberg · The Town Mouse and the Country Mouse",
    url: "https://www.gutenberg.org/cache/epub/21/pg21-images.html",
    note: "Townsend의 오래된 영문 판본에 수록된 두 생쥐의 방문 이야기를 참고했습니다. 도시와 시골의 우열보다 각 인물이 중요하게 여기는 조건을 살펴보세요.",
    noteEn:
      "This story draws on the two mice's visits in Townsend's historical English edition. Explore what matters to each character rather than ranking town and country life.",
  },
};
