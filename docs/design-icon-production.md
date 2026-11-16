# 색연필 그림 아이콘 제작안

2026-11-16. 기준: 사용자가 확정한 가벼운 색연필 마을 그림. **16종 모두 구독 내장 imagegen으로 생성 완료. 총 16회, 재시도 0회, 별도 이미지 API/프로젝트 API 키 사용 0회.** 사용자 승인 범위 16회를 모두 사용했으므로 추가 생성은 새로운 범위로 취급한다.

## 공통 제작 프롬프트

Use case: illustration-story. Asset type: a small hand-drawn navigation illustration for an elementary-school reading website. Match the user's approved airy colored-pencil story village: warm fine pencil outlines, visible gentle pencil texture, understated sage, butter yellow, soft terracotta and powder blue. One simple recognizable subject, centered, generous empty margin, no text, no logo, no border, no button shape, no 3D, no dark heavy shadows. Transparent background. Easy to recognize at 40–64 px. The attached illustration is a style reference only; create a fresh individual object, not a screenshot or UI mockup.

| 파일 | 개별 피사체 | 적용 |
|---|---|---|
| journey.png | 구불구불한 작은 길과 잎사귀 | 이야기 여정 |
| library.png | 작은 나무 책장과 세 권의 책 | 서재 |
| reader.png | 활짝 펼친 책과 작은 잎사귀 | 읽기 |
| question.png | 물음표처럼 휘어진 새싹과 두 말풍선 | 내 질문 |
| theater.png | 작은 보라색 커튼의 야외 무대 | 낭독극 |
| studio.png | 색연필 세 자루와 열린 스케치북 | 책 공방 |
| records.png | 책갈피가 꽂힌 작은 기록 노트 | 내 기록 |
| classroom.png | 낮은 둥근 책상과 작은 의자 셋 | 우리 수업 |
| listen.png | 책을 감싸는 가벼운 헤드폰 | 듣기 |
| bookmark.png | 꽃잎 모양 끝을 가진 종이 책갈피 | 책갈피 |
| upload.png | 그림이 담긴 원고와 위쪽 작은 화살표 | 가져오기 |
| pdf.png | 접힌 모서리의 종이 세 장과 리본 | PDF |
| print.png | 책장이 나오는 작은 크림색 프린터 | 인쇄 |
| team.png | 다른 색의 연필 셋이 한 종이에 모임 | 팀 저작 |
| ideas.png | 연필 끝 위의 작은 반짝임과 새싹 | 구상 도움 |
| home.png | 주황 기와의 작은 책방 | 처음으로 |

## 제작·통합 기준

- 내장 imagegen 도구로 각 자산을 생성한다. 새 유료 API·구독으로 자동 전환하지 않는다.
- 별도 과금 여부/한도를 확인하거나, 불확실성을 설명한 해당 제작 범위 승인을 받은 다음 생성한다.
- 프로젝트 최종 자산은 `public/illustrations/icons-v1/`에 저장한다. 원본 색연필 시안과 기존 정적 자산은 보존한다.
- 새 아이콘은 실제 메뉴/기능 버튼에 연결한다. 텍스트 레이블은 남기고 장식 이미지 alt는 비운다.
- 작은 이동/닫기 기호까지 그림을 과도하게 키우지 않는다. 주 기능은 개별 그림 아이콘을 사용하고 44px 터치 영역과 명확한 포커스를 유지한다.
- 라이트는 넓은 흰 여백, 다크는 따뜻한 먹색 바탕. 투명 가장자리와 실제 가독성을 두 테마에서 검사한다.

## 실제 파일과 연결

`public/illustrations/icons-v1/`의 16개 PNG에 원본을 보관하고, 동일 그림의 256px WebP를 UI에서 불러온다. 별도 원본 사본은 `artifacts/illustration-concepts/icons-v1/originals/`에도 보존한다. 이 변환은 크기·형식 최적화만 하며 색·구성·투명 배경은 바꾸지 않는다. `scripts/prepare-ui-icons.mjs`로 재현한다.

`src/components/icons.tsx`에서 주요 메뉴/활동의 Icon을 개별 생성 그림으로 매핑하고 `BookToolIcon`으로 책갈피·PDF·업로드 버튼을 연결한다. `storybook-refresh.css`와 `storybook-type.css`는 화면 전체의 흰 배경·버튼·간격·글꼴 기준이다. 고운돋움/고운바탕은 무료 OFL 공식 글꼴을 로컬 WOFF2로 제공한다. 그림 자체의 프롬프트는 위 공통 사양과 개별 피사체 표이며, 제공된 원본 마을 그림은 스타일 참조로만 사용했다.

루트 생성 library 원본: `C:/Users/na/.codex/generated_images/01a1e173-f343-7fc3-b992-a1ee02f9a860/exec-33907845-96e7-49f1-96a5-297c0e0eef69.png`. 다른 원본도 내장 도구의 generated_images 폴더에 그대로 남겨 두었다.
