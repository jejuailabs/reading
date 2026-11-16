# 온책읽기 전체 수업 흐름 구현 감사

기준일: 2026-11-16. 범위: 현재 `reading` 소스와 기존 PRD의 정적 읽기. 이 감사에서 앱 코드·환경·기존 프로젝트를 변경하지 않았고, 서버·외부 API·유료 검증을 실행하지 않았다. 이 문서만 추가했다. 아래의 ‘구현’은 명시한 로컬 범위의 동작을 뜻하며 실제 학교 운영 준비 완료를 뜻하지 않는다.

## 1. 판단

현재 제품은 **읽기·듣기 → 내 질문 → 근거와 생각 → 낭독극 또는 책 초안 → 고정 완성본**의 로컬 체험을 제공한다. 반면 **책 선정 이유 → 학년·차시별 읽기 전/중/후 계획 → 실제 학급 참여 → 단계별 보고서·템플릿·PDF → 교사 관찰과 평가**를 이어 주는 데이터와 운영 기능은 아직 없다. 기존 PRD에는 상당 부분 설계돼 있지만, 현재 코드에 구현됐다고 간주하면 안 된다.

## 2. 단계별 실제 구현

| 흐름 | 상태 | 현재 확인한 동작 | 남은 핵심 |
|---|---|---|---|
| 책 탐색·선정 | 부분 | 제목·내용 소개 검색, 전래/이솝/창작/우리 책 모음, 권장 학년 표시, 수업에 담기 | 학년·문해 지원·수업 시간·주제·교과·권리·인쇄 조건으로 추천 및 선정 이유 설명, 여러 권 비교 |
| 수업 계획 | 부분 | 한 여정의 책 한 권 선택, 읽기/질문/생각 나눔/낭독극/창작 5개 활동 켜기·끄기 | 여러 학급·단원·차시, 목표와 시간, 읽기 전/중/후 배치, 계획 저장·복제·재사용·학년 조정 |
| 읽기 전 | 없음에 가까운 부분 | 책 소개, 고전의 권장 학년, 고정 읽기 도움 질문 | 표지·제목 예측, 배경지식·경험, 읽기 목적과 어휘 지원을 교사가 선택하는 수업 활동·기록 |
| 읽는 중 | 구현: 로컬 | 장면 이동·글자 크기·마지막 위치, 장면에서 질문으로 이동, 고전 음성 재생·다운로드, 창작책 기기 음성 | 안정적인 문단/구절 근거 표시, 학생별 읽기 지원, 실제 참여·기기 관측·교사 관찰 구분, 종이 활동 연결 |
| 학생 질문·사고 확장 | 부분 | 빈 질문 차단, 개인 질문 기본, 책/장면 참조, 자유 생각 기록, 공유 토글, 제한된 실제 AI 질문 코칭 | 질문 수정 이력, 근거 구절·판본 고정, 질문 유형별 선택 도움, 교사 선별·피드백, 실제 공유 권한 |
| 토론 | 시연 | 예시 질문 2개와 자신의 공유 질문 목록 | 실제 다른 학생의 참여, 모둠·토론 주제, 발언/답글·근거 연결, 생각 변화, 교사 진행 도구 |
| 읽은 후·표현 | 부분 | 낭독극 역할 보기·배역 입력·성찰, 질문에서 책 초안으로 연결, 페이지 수정·프로젝트 보관·완성본 저장 | 여러 책에 맞는 대본, 역할·분량 조절, 실제 공동 저작, 읽기 전 생각과 비교하는 성찰·종합 |
| 단계별 보고서·템플릿 | 미구현 | ‘나의 기록’의 질문·책 수와 완성본 목록 | 읽기 전/중/후 학생 기록지, 차시 요약, 교사 관찰 보고서, 학급/학생별 선택 출력·빈 서식 |
| 인쇄·PDF | 인쇄 부분 / PDF 미구현 | 고전은 전권용 인쇄 DOM, 창작·발행책은 현재 장면 인쇄, 낭독극 대본 인쇄 | 실제 PDF 파일 생성·다운로드, 판본·템플릿 버전 고정, 학생용/교사용 분리, 재생성·회수·상태 관리 |
| 교사 평가·운영 | 시연 | 활동 토글, 종이 참여 일괄 표시, 최근 로컬 이벤트와 수량 | 관찰 기준·학생별 근거·초안/교사 확정, 학급 명단·권한, 누적 보고서, 접근·보존·삭제·학교 운영 |

탐색은 [Library](C:/Users/na/Desktop/vibe2/reading/src/components/reading-app.tsx:74), 계획은 [TeacherWorkspace](C:/Users/na/Desktop/vibe2/reading/src/components/operations.tsx:17), 읽기는 [ReaderWorkspace](C:/Users/na/Desktop/vibe2/reading/src/components/reading-workspaces.tsx:15), 질문/공유 목록은 [InquiryWorkspace](C:/Users/na/Desktop/vibe2/reading/src/components/reading-workspaces.tsx:53), 기록 화면은 [Records](C:/Users/na/Desktop/vibe2/reading/src/components/reading-app.tsx:95)에서 확인했다.

고전이 교사 책 선택에서 빠지는 것은 아니다. [catalog 합성](C:/Users/na/Desktop/vibe2/reading/src/lib/catalog.ts:27)이 `classicBooks`와 `originalBooks`를 합쳐 내보내며, 서재·여정·교사 선택기가 모두 이를 사용한다.

## 3. 저장·협업·권한의 실제 경계

1. [localRepository](C:/Users/na/Desktop/vibe2/reading/src/lib/local-repository.ts:9)는 `sessionStorage`에 전체 상태를 저장한다. 같은 탭의 새로고침 복원은 지원하지만, 장기 보관·다른 기기·실시간 협업·학급 공유를 제공하지 않는다. 브라우저의 탭 복원 여부를 제품의 영속 보장으로 삼을 수 없다.
2. [ReadingProvider](C:/Users/na/Desktop/vibe2/reading/src/components/provider.tsx:15)는 상태가 바뀔 때 전체 상태를 자동 저장한다. 별도 ‘생각 기록’·‘탭에 저장’ 버튼은 실제 저장 시점과 혼동될 수 있다. 자동 저장과 제출/교사 확정을 분리해 이름·상태·revision 계약을 맞춰야 한다.
3. [PrototypeState](C:/Users/na/Desktop/vibe2/reading/src/lib/model.ts:18)는 여정 책 1개, 활동별 표식 1개, 질문들, 프로젝트·완성본, 이벤트를 가진다. 학교·학급·학생 참여·차시·보고서·평가 모델은 없다. UI의 ‘우리 반’은 실제 학급 데이터 범위가 아니다.
4. [역할 선택](C:/Users/na/Desktop/vibe2/reading/src/components/reading-app.tsx:48)은 로컬 상태를 바꾼다. 로그인·인가가 아니다. [Firebase 설정](C:/Users/na/Desktop/vibe2/reading/src/lib/firebase-config.ts:1)은 SDK를 초기화하지 않으며 `requireLocalPrototype()`는 local 이외 모드를 막는다.
5. [공유 화면](C:/Users/na/Desktop/vibe2/reading/src/components/reading-workspaces.tsx:82)은 고정 `peerQuestions`와 자기 질문의 `shared` 플래그를 보여 준다. 실제 공동 저작 역시 없다. 초안은 한 탭의 한 프로젝트이고, 프로젝트 선택·보관은 가능하다.
6. [recordEvent](C:/Users/na/Desktop/vibe2/reading/src/lib/model.ts:43)는 최근 100건만 남긴다. 이벤트의 `type/resource/time`만으로 학생별 성취나 단계별 수업 보고서를 복원할 수 없다. [AdminWorkspace](C:/Users/na/Desktop/vibe2/reading/src/components/operations.tsx:145)도 로컬 시연임을 표시한다.

## 4. 출력과 revision에서 먼저 정할 계약

### 현재 출력의 차이

- [고전 인쇄](C:/Users/na/Desktop/vibe2/reading/src/components/classic-reader.tsx:97): `window.print()`를 연다. [전권 DOM](C:/Users/na/Desktop/vibe2/reading/src/components/classic-reader.tsx:104)은 표지·모든 장면·질문용 빈 줄·출처를 구성한다. 화면 도움 질문과 학생의 실제 질문/답변을 보고서로 출력하는 것은 아니다.
- [창작/완성본 인쇄](C:/Users/na/Desktop/vibe2/reading/src/components/reading-workspaces.tsx:47): 현재 장면만 DOM에 있다. 완성본이 여러 페이지여도 전권 PDF가 생성되지 않는다.
- [낭독극](C:/Users/na/Desktop/vibe2/reading/src/components/creative-workspaces.tsx:22): 고정 샘플 대본에 브라우저 인쇄를 제공한다.
- 브라우저 인쇄창에서 사용자가 ‘PDF로 저장’을 선택할 수 있는 것과, 앱이 검증된 PDF 파일을 생성하고 다운로드하는 것은 구별해야 한다. 현재 `/api`에는 [reading-ai route](C:/Users/na/Desktop/vibe2/reading/src/app/api/reading-ai/route.ts:1)만 있으며, 보고서/PDF 생성·내보내기 작업 API는 없다.
- [globals.css](C:/Users/na/Desktop/vibe2/reading/src/app/globals.css:17)의 전역 A4 `@page`와 [classics.css](C:/Users/na/Desktop/vibe2/reading/src/app/classics.css:5)의 전역 A5 `@page`가 함께 존재하고, [layout](C:/Users/na/Desktop/vibe2/reading/src/app/layout.tsx:3)은 후자를 뒤에 불러온다. A5 규칙이 고전 밖 출력에도 영향을 줄 수 있는 전역 범위 충돌을 정적으로 확인했다. 이번 감사에서는 실제 프린터/PDF 렌더 결과를 재검증하지 않았다. 출력 전용 문서나 명명된 페이지 등으로 용지 규칙을 분리해야 한다.

### 버전과 원본 보존

- [editPage](C:/Users/na/Desktop/vibe2/reading/src/lib/model.ts:58)는 원본 배열을 덮어쓰지 않고 project revision을 올린다. [publishProject](C:/Users/na/Desktop/vibe2/reading/src/lib/model.ts:63)는 페이지를 복제해 별도 완성본을 만든다. 이후 초안 수정과 완성본이 분리되는 장점은 유지해야 한다.
- 그러나 완성본에 `sourceProjectId/sourceProjectRevision` 계보가 없고, 질문은 `bookId + page index`만 가진다. 질문 자신의 `revision`은 출처 판본 revision이 아니다. 문단 ID·인용 구절·판본과 연결된 안정적 근거가 필요하다.
- 질문의 생각 입력은 [textarea onChange](C:/Users/na/Desktop/vibe2/reading/src/components/reading-workspaces.tsx:82)에서 즉시 상태를 바꾸지만, revision은 ‘생각 기록’의 [reviseQuestion](C:/Users/na/Desktop/vibe2/reading/src/lib/model.ts:54)에서만 증가한다. 현재 revision을 그대로 내보내기 캐시 키로 쓰면 같은 revision 아래 내용이 바뀔 수 있다.
- 보고서·PDF는 생성 순간의 **출처 판본 + 근거 항목 revision + 수업 계획 revision + 템플릿 revision + 언어 + 학생/교사 출력 범위**를 묶은 불변 스냅샷을 사용해야 한다. 이후 수정은 기존 파일을 몰래 덮어쓰지 않고 새 버전을 생성한다. 동일한 스냅샷의 파일은 재사용한다.

## 5. AI·낭독극·저작의 정확한 범위

실제 AI 질문 코칭과 교사용 3개 동화 구성안은 제한된 개발 파일럿으로 구현됐으며, 앞선 승인 범위의 브라우저 검증 2회가 [검증 기록](C:/Users/na/Desktop/vibe2/reading/docs/12_ai_reuse.md:143)에 남아 있다. 이번 감사에서는 호출하지 않았다. 이 성공은 전 학년의 교육적 품질 검증·학교 인증·상시 서비스 가용성을 뜻하지 않는다.

[AI UI](C:/Users/na/Desktop/vibe2/reading/src/components/reading-ai.tsx:10)의 응답은 컴포넌트 상태이므로, 질문 코칭 결과가 자동으로 영속 보고서 근거가 되지는 않는다. [useAiPlan](C:/Users/na/Desktop/vibe2/reading/src/components/creative-workspaces.tsx:118)은 선택한 구성안의 3개 장면을 초안으로 옮기고 이전 작업을 보관한다. 삽화는 준비된 `forest` 그림으로 시작한다. 완성 동화 전문·장면별 새 삽화가 자동 생성되는 기능과는 다르다.

[TheaterWorkspace](C:/Users/na/Desktop/vibe2/reading/src/components/creative-workspaces.tsx:15)는 `wind-post`의 고정 대본을 사용한다. 다른 책의 여정에서 들어오면 독립 활동임을 표시한다. 책마다 각색 대본 생성, 전체 인원에 맞춘 역할 분배, 실시간 협연·녹음·관찰 루브릭은 없다.

고전 리더는 저장된 장면 음성과, 해당 책·언어에 파일이 있으면 저장된 AI 전권 낭독을 재생한다. [음성 패널](C:/Users/na/Desktop/vibe2/reading/src/components/classic-reader.tsx:91)은 속도·장면 연속 듣기·음성 파일 다운로드를 지원한다. 전권 음성은 장면과 자동 동기화되지 않는다. 새 글의 온디맨드 AI 낭독과 혼동하지 않는다.

## 6. 구현을 수렴시킬 최소 데이터·화면·API

아래는 **제안**이다. 현재 존재하는 API나 구현이라고 표시하지 않는다. 기존 [PRD 08 엔터티](C:/Users/na/Desktop/vibe2/reading/docs/08_platform_architecture.md:188)와 [활동 연결 계약](C:/Users/na/Desktop/vibe2/reading/docs/08_platform_architecture.md:256)을 확장하며, 별도 중복 단원 모델을 만들지 않는다.

| 기존 도메인에 추가할 계약 | 목적 |
|---|---|
| `reading_units` + `journey_plan_revisions` + `lesson_sessions`에 학년군·목표·읽기 전/중/후·시간·도움·출력 선택 | 수업 계획 한 번으로 화면·활동지·보고서의 기준을 공유 |
| `activity_instances` + 선택적 `journey_activity_bindings` | 질문·읽기·낭독극·저작은 독립 실행 가능, 여러 수업 연결과 해제는 원본 보존 |
| `editions/edition_revisions` + 안정적인 page/paragraph anchor | 온라인·종이·질문·낭독극·보고서가 같은 판본과 근거를 참조 |
| 각 모듈의 학생 근거 항목과 통합 evidence 참조 규격 | 작성자·학급 범위, 종류, 출처/수업 참조, revision, 공개 범위, 종이/자기보고/교사 관찰 출처를 분리 |
| 기존 질문/토론 세션에 실제 참여자·답글·근거·생각 변화 | 공유 질문을 모아 놓는 것과 토론 수행을 구별 |
| `inquiry_observations` 등 기존 관찰에 기준·근거 참조·초안/교사 확정 | 전원 일괄 자동 평가 없이 필요한 1~2개 기준만 관찰 |
| `report_snapshots`(추가 제안) + 기존 `export_jobs` | 단계·학생·학급별 근거 스냅샷, 템플릿/언어/판본, 승인, 파일 형식·상태·권리·회수 계약 |

학교·학급·membership·참여 세션과 서버 인가는 위 데이터의 전제다. 현재 로컬 역할 선택을 운영 권한으로 승격하면 안 된다. Firebase·저장·서버 PDF·외부 AI 연결은 각각 비용과 범위를 확인한 뒤 사용자의 명시적 승인 안에서 구현·실행한다. 이 감사는 그 연결을 승인하거나 실행하지 않는다.

화면은 새 메뉴를 계속 늘리기보다 기존 구조에 맞춘다.

1. **서재**: 조건별 책 추천과 비교, 선정 이유·권리·예상 읽기 분량 확인 → 수업 계획으로 담기.
2. **교사 수업 준비실/홈 여정**: 읽기 전·중·후 차시 카드, 목표·시간·활동 선택, 이전 계획 복제. 기본 수업은 읽기와 학생 질문으로 시작하고 낭독극·창작은 선택한다.
3. **전문 작업 공간**: 몰입 리더·질문/토론·낭독극·저작 메뉴는 그대로 독립 사용 가능. 현재 활동과 연결된 수업만 표시한다.
4. **공통 기록·출력 패널**: 학생 기록지·빈 활동지·교사용 진행안·차시 요약·관찰 보고서를 같은 근거에서 선택한다. PDF 다운로드와 프린터 인쇄를 별도 행동으로 표시한다.
5. **교사 학급 보기**: 미참여 숫자 순위보다 도움 필요한 학생·기록 충돌·교사 확인 필요 항목을 먼저 보여 준다. 평가 확정은 별도 행동이다.

API는 PRD 08의 계획된 `/api/v1` 계약을 따라 단원/차시 CRUD·복제, 활동 연결/해제, revision을 확인하는 근거 저장, 보고서 미리보기/스냅샷/교사 확정, export 생성/상태/다운로드를 단계적으로 구현한다. 지금 소스에 이들 endpoint는 없다. 동일 단원의 이름만 바꾼 별도 원장을 새로 만들지 않는다.

## 7. 교사 일을 늘리지 않는 수용 기준

- 학생이 원문을 읽고 질문 하나를 남기는 경로가 기본이다. 활동 5개를 모두 끝내야 수업 종료되는 규칙을 만들지 않는다. 현재 초기값은 [모든 활동 활성화](C:/Users/na/Desktop/vibe2/reading/src/lib/model.ts:37)이므로 학년·시간별 최소 계획을 제공하는 편이 낫다.
- 계획, 학생 기록, 교사 보고서, 활동지에서 같은 내용을 다시 입력하지 않는다. 기존 근거를 가져오고 수정한 부분만 재생성한다.
- 자동 저장, 학생 제출, 공개, 교사 확정의 상태를 구분한다. 저장 버튼을 누르지 않아 기록이 사라진 것처럼 느끼거나 모든 입력마다 제출을 요구하지 않게 한다.
- [종이 참여 일괄 표시](C:/Users/na/Desktop/vibe2/reading/src/components/operations.tsx:23)는 현재 포함된 모든 활동에 표식을 준다. 운영에서는 차시·실제 실시 활동·대상과 예외를 한 번 선택하는 방식이 필요하다. 종이 참여 표식을 이해도나 디지털 완독률로 바꾸지 않는다.
- 평가는 수업마다 전원·전 항목 입력을 요구하지 않는다. 오늘의 관찰 기준 1~2개와 근거를 가진 초안만 제시하고 교사가 확정한다. 관찰되지 않은 학생은 ‘미관찰’이지 낮은 성취가 아니다.
- 출력은 인쇄 전 장수·용지·학생용/교사용·포함 자료를 보여 주며, 답이나 교사 메모가 학생용에 섞이지 않아야 한다. 빈 서식과 이미 작성된 보고서를 구분한다.
- 학년 차이는 단순 글자 크기만으로 해결하지 않는다. 1~2학년의 말/그림/교사 대필, 3~4학년의 구절 근거, 5~6학년의 복수 근거와 관점 비교를 동일 활동의 선택 지원으로 구성한다. 실제 학년별 검증이 필요하다.
- ‘교사 일이 줄었다’는 제품 문구보다 준비·출력·수업 중 개입·평가에 걸린 시간, 다음 반 재사용 때 추가 수정량을 측정한다. 현재 코드는 시간 절감 효과를 입증하지 않는다.

## 8. 구현 우선순위

1. **근거와 판본을 잃지 않는 기반**: 독립 자원·활동 연결, 질문/페이지 안정 ID와 revision, 계획/보고서 저장 계약, 실제 인가·영속 저장을 위한 adapter 경계.
2. **한 단원의 전체 흐름**: 추천/선정 → 전·중·후 계획 → 읽기/질문/토론 → 학생 기록과 교사 차시 요약. 샘플 한 학년군에서 끝까지 검증하되 전 학년 지원 옵션을 모델에 둔다.
3. **출력 완성**: 동일 판본의 온라인/전권 인쇄, 빈 활동지/학생 기록/교사 진행안, 실제 PDF 아티팩트·스냅샷·다운로드. 고전과 창작 완성본을 같은 출력 계약으로 맞춘다.
4. **학급 운영 확장**: 실제 공유·협업, 선택 관찰·교사 확정, 계획 복제, 여러 학급/판본, 회수·삭제·사용량 관리. 낭독극·공동저작은 선택 활동으로 같은 근거/출력 계약에 붙인다.

우선순위는 독립 실행을 막는 순차 강제 규칙이 아니다. 각 단계의 완료 기준은 화면 개수보다 **한 번 입력한 기록이 다음 단계와 출력에 정확히 이어지고, 원본·권한·판본을 지키는지**로 둔다.
