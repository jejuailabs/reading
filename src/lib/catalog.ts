import type { Book } from "./model";
import { classicBooks } from "./classic-catalog";

// Original fictional text written for this prototype. No imported book text or AI calls.
const originalBooks: Book[] = [
  {id: "wind-post", title: "바람 우체국", en: "The Wind Post Office", subtitle: "마음을 전하는 작은 여행", subtitleEn: "A little journey that connects us", tag: "오늘의 책", tagEn: "Today's book", art: "coast", color: "coral", revision: 1,
    pages: [
      {text: "애월의 작은 바닷마을에 바람이 불었어요.\n돌담을 넘고 지붕을 지나, 편지 한 장이 소라의 발밑에 내려앉았지요.\n\n‘이 편지는 누구에게 가는 걸까?’\n봉투에는 이름 대신 작은 파도 하나가 그려져 있었어요.", en: "A breeze blew through a little coastal village in Aewol.\nOver a stone wall and past the rooftops, a letter landed at Sora's feet.\n\n‘Who is this letter for?’\nThere was a little wave on the envelope, but no name.", art: "coast"},
      {text: "소라는 바닷가의 빨간 우체통으로 걸어갔어요.\n‘주인을 모르는데 편지를 넣어도 될까?’\n\n바람이 봉투를 살짝 뒤집었어요.\n뒷면에는 ‘내 이야기를 들어 줄 친구에게’라고 적혀 있었지요.", en: "Sora walked to the red postbox by the sea.\n‘Can I post a letter if I don't know who it belongs to?’\n\nThe breeze turned the envelope over.\nOn the back it said, ‘To a friend who will listen to my story.’", art: "coast"},
      {text: "소라는 편지를 혼자 열지 않았어요.\n마을 친구들에게 작은 파도를 보여 주었지요.\n\n‘나는 바다에 가고 싶을 때 이런 그림을 그려.’\n‘나는 마음이 출렁일 때 그리는데.’\n같은 그림에도 서로 다른 이야기가 숨어 있었어요.", en: "Sora did not open the letter alone.\nShe showed the little wave to her friends.\n\n‘I draw that when I want to visit the sea.’\n‘I draw it when my feelings are restless.’\nThe same picture held different stories.", art: "forest"},
      {text: "해가 질 무렵, 아이들은 답장을 쓰기로 했어요.\n‘우리는 네 이야기를 들을 준비가 되어 있어.’\n\n받는 사람은 아직 몰랐지만, 기다리는 친구들은 생겼어요.\n바람은 답장을 품고 다시 바다 쪽으로 불었답니다.", en: "At sunset, the children decided to write back.\n‘We are ready to listen to your story.’\n\nThey still did not know the reader, but now that reader had friends waiting.\nThe breeze carried their reply toward the sea.", art: "mail"},
    ]},
  {id: "moon-seed", title: "달빛 씨앗", en: "The Moonlight Seed", subtitle: "기다림 속에서 자라는 것들", subtitleEn: "Things that grow while we wait", tag: "상상 이야기", tagEn: "Imagination", art: "night", color: "lilac", revision: 1,
    pages: [
      {text: "윤이는 달빛처럼 반짝이는 씨앗을 찾았어요.\n‘어떤 꽃이 피어날까?’\n작은 화분에 흙을 담고 씨앗을 심었지요.", en: "Yuni found a seed that sparkled like moonlight.\n‘What kind of flower will grow?’\nShe planted it in a little pot.", art: "night"},
      {text: "매일 물을 주어도 싹은 보이지 않았어요.\n친구는 기다려 보자고 했고, 윤이는 흙속이 궁금했어요.\n땅 밑에서도 무언가 달라지고 있을까요?", en: "Even with water every day, no sprout appeared.\nHer friend said to wait. Yuni wondered about the soil.\nCould something be changing underneath?", art: "night"},
      {text: "어느 아침, 아주 작은 잎이 고개를 내밀었어요.\n윤이는 그 옆에 새 씨앗을 심었어요.\n이번에는 보이지 않는 시간도 기다려 주기로 했지요.", en: "One morning, a tiny leaf appeared.\nYuni planted another seed beside it.\nThis time, she would make room for the quiet days too.", art: "night"},
    ]},
  {id: "village-map", title: "우리가 그린 마을", en: "The Village We Drew", subtitle: "서로 다른 길이 만나는 지도", subtitleEn: "A map where different paths meet", tag: "우리 동네", tagEn: "Our community", art: "forest", color: "sage", revision: 1,
    pages: [
      {text: "아이들이 큰 종이에 마을 지도를 그렸어요.\n한 친구는 나무를, 다른 친구는 바닷길을 먼저 그렸지요.\n그런데 지도에 빈 곳이 남았어요.", en: "The children drew a village on a big sheet of paper.\nOne began with a tree, another with the coast.\nBut one part of the map was still empty.", art: "forest"},
      {text: "‘이 길은 누가 알고 있을까?’\n말없이 앉아 있던 친구가 연필을 들었어요.\n그 길 끝에는 친구가 매일 가는 작은 도서관이 있었지요.", en: "‘Who knows this path?’\nA quiet friend picked up a pencil.\nAt the end of that path was the library they visited every day.", art: "forest"},
      {text: "모두의 길을 이으니 지도가 넓어졌어요.\n아이들은 지도를 다 그렸다고 말하지 않았어요.\n아직 들어 보지 못한 이야기를 위한 자리를 남겨 두었답니다.", en: "Their map grew as they joined each person's path.\nThey did not call it finished.\nThey left space for stories they had not heard yet.", art: "forest"},
    ]},
];

export const catalog: Book[] = [...classicBooks, ...originalBooks];

export const peerQuestions = [
  {ko: "소라는 왜 편지를 혼자 열지 않았을까?", en: "Why didn't Sora open the letter alone?", theme: "인물의 마음", themeEn: "A character's feelings"},
  {ko: "이름이 없어도 편지가 마음을 전할 수 있을까?", en: "Can a letter connect us without a name?", theme: "다른 생각", themeEn: "Another perspective"},
];

export const script = [
  {role: "narrator", ko: "바람이 작은 마을의 돌담을 넘어옵니다. 편지 한 장이 소라 앞에 내려앉습니다.", en: "The breeze passes over a stone wall. A letter lands in front of Sora."},
  {role: "child", ko: "어? 편지잖아. 그런데 받는 사람 이름이 없네?", en: "Oh, a letter! But there is no name on it."},
  {role: "wind", ko: "휘이이—. 이름만이 길을 알려 주는 건 아니지.", en: "Whoosh... A name isn't the only thing that shows the way."},
  {role: "child", ko: "파도 그림이라… 친구들에게 물어볼까?", en: "A little wave... Shall I ask my friends?"},
  {role: "narrator", ko: "소라는 봉투를 소중히 들고 친구들이 있는 곳으로 갑니다.", en: "Sora holds the envelope carefully and walks toward her friends."},
  {role: "wind", ko: "천천히 들어 봐. 같은 그림에도 다른 이야기가 있단다.", en: "Listen closely. The same picture can hold different stories."},
];
