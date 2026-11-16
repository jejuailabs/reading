# 07. 계정·학교·학급·권한 관리 PRD

문서 상태: 구현 전 제품 설계 · 기준일: 2026-11-16 · 요구사항 접두어: `AUTH`

이 문서는 Google 로그인을 기본으로 사용하는 초등 온책읽기 서비스의 신원 확인, 학교 소속, 학생 참여, 접근 권한과 개인정보 수명주기를 정의한다. Firebase Authentication·Cloud Firestore·Cloud Storage for Firebase를 설계 대상으로 삼는다. 사용자가 제공한 웹 설정과 서버 자격은 로컬 비밀 파일에 보관했으나 `FIREBASE_CONNECTION_ENABLED=false`, `FIREBASE_ANALYTICS_ENABLED=false`인 로컬 mock 단계다. 제공 프로젝트의 독립성·요금·기존 데이터는 아직 확인하지 않았고 실제 연결·운영 조회·과금 활성화는 하지 않았다. 설정 수령은 연결·과금 승인이 아니다.

reading은 homework와 별도의 Firebase 프로젝트·Auth 사용자 공간·Firestore·Storage·서비스 계정을 사용한다. 같은 기술과 Google 이메일을 사용해도 두 프로젝트의 UID·세션·권한이 같다고 가정하지 않는다. 프로토타입의 역할 선택과 로컬 저장은 화면 시연일 뿐 실제 인증·권한 검사·학교 격리의 증거가 아니다.

## 1. 목적과 범위

교사는 자신의 계정으로 수업을 시작하고, 학생은 Google 계정 유무와 관계없이 각자의 참여 신원으로 책을 읽고 답변하고 공동 책을 만든다. 학교·학급·작품·학생별 권한은 화면과 서버 및 데이터베이스에서 일관되게 적용한다. Google 로그인 성공, 이메일 도메인, 학급 코드 보유 중 어느 하나만으로 교사나 학교 관리자 권한을 주지 않는다.

포함 범위는 로그인·연결·소속 승인·역할·학급 초대·전학·교사 전출·계정 복구·탈퇴·동의·공개 범위·접근 로그다. 콘텐츠 저작권의 작품별 판정, AI 공급자 계약, 결제 실행은 별도 PRD의 책임이다. 이 문서의 관리 권한은 비용 발생 승인을 대체하지 않는다.

**제품 성과 목표 — 실측값이 아닌 검증 목표**

- 승인된 교사의 재방문 로그인과 학급 진입: 정상 네트워크에서 1분 안에 완료.
- Google 계정 없는 학급: 교사가 일괄 참여카드를 발급하고 학생이 개별 진입; 이메일 입력·공유 비밀번호·학생별 계정가입 작업 불필요.
- 학교 간 데이터 접근, 다른 학생 답변 접근, 임의 관리자 승격: 수용시험에서 허용 사례 0건.
- 학교 소속 회수 후 새 조회·수정 요청: 즉시 거부. 이미 내려받은 파일·인쇄물의 원격 회수는 보장하지 않음.

## 2. 기본 정책 결정

| 항목 | MVP 결정 | 이유 / 도입 전 확정할 조건 |
|---|---|---|
| 교사 로그인 | Google OAuth 기본. 개인 Google 계정도 가입 가능하나 학교 소속은 별도 승인 | Google 계정은 신원 수단이며 교사 재직 증명이 아님 |
| Google 요청 범위 | `openid`, `userinfo.email`, `userinfo.profile`만 | Drive·Gmail·Classroom 권한을 로그인과 묶지 않음. 추가 기능은 별도 동의·검토 |
| 학생 로그인 | 허용된 학교 Google 계정 또는 교사가 관리하는 개별 참여 신원 | 학교 관리자 정책으로 OAuth가 차단되어도 수업 참여 경로 제공 |
| 학생 공용 계정 | 제공하지 않음 | 학생별 기록·작성자 표시·권한 회수·공용 기기 전환이 가능해야 함 |
| 학교 가입 | 초대 또는 가입 신청 후 기존 학교 관리자 승인 | 이메일 접미사나 학교 이름만으로 자동 가입하지 않음 |
| 첫 학교 관리자 | 기관 요청 확인 후 플랫폼 관리자가 서버에서 부여 | 임의로 학교를 검색·등록한 사람에게 기존 학교 소유권을 주지 않음 |
| 개인 교사 체험 | 학교 학생 데이터가 없는 개인 작업공간 | 학교 승인이 끝나기 전에도 공개 고전·샘플 수업 탐색 가능 |
| 학생 실명 | 기본은 교사만 대응표를 보는 별칭 | 학교 업무상 필요한 식별 자료는 별도 보호 테이블에 최소 보관 |
| 기본 공개 범위 | 개인 초안은 본인·담당 교사, 공동작업은 지정 모둠 | 학급·학교·외부 공개는 승인된 버전에만 적용 |
| 학교 관리자 열람 | 소속·학급·이용 현황 관리. 개별 답변·음성·상담성 메모는 기본 열람 불가 | 학교 관리자 역할과 담당 교사 역할을 분리 |
| 플랫폼 지원 접근 | 기본 메타데이터만. 학생 본문 열람은 사유·범위·기한이 있는 지원 승인 | 운영 편의를 이유로 상시 전체 열람 권한을 주지 않음 |
| 학생 자료 학습 사용 | AI 모델 학습·광고 활용 기본 금지 | 제품 운영 목적과 별도 권리·개인정보 검토 없이 전용하지 않음 |
| 계정·자료 보존 | 학년 종료 뒤 90일 이내 정리 완료를 제품 기본안으로 제시 | 법정·계약상 보존 필요, 학교 정책, 백업 만료 주기는 도입 전 확정; 일률적 법정기한이라는 뜻 아님 |
| 공급자·요금 | 어떤 계정 관리 기능도 유료 업그레이드·SMS·SMTP·유료 SSO를 자동 활성화하지 않음 | 제공사·비용·무료 한도·초과 과금·기간을 설명하고 사용자 명시 승인 후 별도 실행 |

Google Workspace for Education의 18세 미만 외부 앱 접근은 관리자 설정에 따라 달라진다. 기본 로그인 정보만 요청하는 앱을 허용하는 설정도 있고 개별 승인·차단도 가능하므로, 모든 학교에서 자동으로 로그인된다고 약속하지 않는다. [Google 학교 관리자 안내](https://knowledge.workspace.google.com/admin/getting-started/editions/manage-access-to-unconfigured-third-party-apps-for-users-designated-as-under-18)

## 3. 역할과 권한 모델

권한은 `역할 + 유효한 학교 소속 + 학급/작품 관계 + 자원 상태 + 허용 동작`의 교집합으로 판단한다. 한 사람이 여러 학교에서 서로 다른 역할을 가질 수 있다. 학생 역할을 전역 `user.role` 하나로 고정하지 않고 학교별·학급별 관계를 저장한다.

| 주체 | 허용 범위 | 기본적으로 허용하지 않는 범위 |
|---|---|---|
| 교사 `teacher` | 소속 학교 안의 담당 학급, 수업 배정, 학생 참여 승인, 담당 학생 답변·진도, 맡은 공동작품 지도 | 타 교사 학급 학생 자료, 타 학교 자료, 학교 관리자 승격, 플랫폼 카탈로그 발행 |
| 학생 `student` | 배정된 읽기 자료, 자신의 답변·진도, 참여 중인 모둠 공동작품, 교사가 공개한 학급 결과 | 전체 명부·이메일, 다른 학생 개인 답변·평가, 동의 변경, 학생 초대, 외부 공개 |
| 학교 관리자 `school_admin` | 소속 승인·회수, 학교 설정, 학급 담당자 지정, 집계 이용량, 공개 정책, 학교 운영 감사 기록 | 다른 학교, 학생 개별 본문·음성의 상시 열람, 플랫폼 역할 부여, 임의 개인정보 동의 대행 |
| 플랫폼 관리자 `platform_admin` | 기관 확인, 플랫폼 운영, 학교 관리자 초기 지정, 장애·권한 요청 처리 | 승인 없는 학생 콘텐츠 열람, 콘텐츠 저작권 허가 추정, 별도 과금의 자동 승인 |
| 콘텐츠 편집자 `content_editor` | 배정된 플랫폼 고전·질문·대본·권리자료의 편집·검수 워크플로 | 학생 명부·학급 답변·비공개 학생 책, 학교 관리자 기능 |

교사가 학교 관리자 업무도 맡는 경우 두 역할을 명시적으로 부여한다. 콘텐츠 편집자가 학생 공동책을 검수해야 하는 예외는 특정 작품 버전에 대한 별도 검수 초대로만 부여하며, 학교 전체 자료 접근으로 확장하지 않는다.

### 데이터 단위 권한

| 자원 | 학생 | 담당 교사 | 학교 관리자 | 플랫폼 관리자 / 콘텐츠 편집자 |
|---|---|---|---|---|
| 공개 고전 발행본 | 읽기·허용 인쇄/듣기 | 동일 | 동일 | 발행 워크플로 권한에 따름 |
| 학생 별칭·모둠 표시 | 자신의 학급에서 수업에 필요한 최소 표시 | 담당 학급 관리 | 학교 소속 관리에 필요한 최소 자료 | 지원 승인 없으면 비식별 집계 |
| 실명 대응표·법정대리인 정보 | 다른 학생 자료 불가 | 필요 권한을 별도 받은 담당자만 | 별도 개인정보 관리 권한 필요 | 기본 접근 불가 |
| 답변·읽기 기록 | 본인 기록 | 담당 학생 기록 | 집계만 | 기본 접근 불가 |
| 교사의 관찰 메모 | 기본 비공개, 학생용 피드백만 별도 노출 | 메모 작성·담당 권한에 따름 | 기본 접근 불가 | 기본 접근 불가 |
| 공동 책 초안 | 명시적으로 배정된 모둠·편집 구간 | 담당 학급 지도·검수 | 존재·운영상태 등 메타데이터 | 배정된 검수 자원만 예외 |
| 학생 녹음·사진 | 본인 및 승인된 공동작업 범위 | 담당 학급 | 기본 접근 불가 | 기본 접근 불가 |
| 소속·역할·동의 증빙 | 자신에게 허용된 조회·요청 | 승인된 학급 업무 | 학교 권한 범위의 업무 | 승인된 서버 관리 기능만 |
| AI 사용량·비용 | 비용 금액 미노출, 사용 가능 상태만 | 담당 범위 사용량 | 학교 집계 | 운영상 허용 범위. 비용 승인 권한과 별개 |

## 4. 핵심 사용자 흐름

### 4.1 교사 Google 로그인과 학교 연결

1. 로그인 화면에서 Google 로그인을 선택한다. 앱 이름, 기본 정보 사용 목적, 개인정보 안내를 보여 준다.
2. reading 전용 Firebase Auth의 Google 제공자에서 인증한다. 서버는 reading 프로젝트의 ID token을 검증하고 CSRF 방어가 있는 교환 경로에서 세션 쿠키를 발급한다. 검증된 UID로 `auth_bindings`와 내부 `profile`을 찾거나 만든다. [Firebase Google 로그인](https://firebase.google.com/docs/auth/web/google-signin)
3. 학교 소속이 없으면 개인 작업공간과 학교 가입 신청을 제공한다. 학교명 검색 결과만으로 학교 내부 자료를 보여 주지 않는다.
4. 초대 대상과 인증된 계정이 맞는지 확인하고, 기존 학교 관리자가 가입을 승인한다. 담당 학급은 별도로 배정한다.
5. 다중 학교 소속이면 명시적으로 작업 학교를 선택한다. 화면 상단에 현재 학교·학급을 계속 표시한다.

Google `hd`는 학교 도메인 확인의 참고 신호로 사용하되 역할 부여의 충분조건으로 쓰지 않는다. 요청의 `hd` 값이나 이메일 접미사만 신뢰하지 않고 검증된 토큰의 claim을 확인한다. 이메일 변경에도 사람의 내부 식별자는 유지한다. [Google OIDC 공식 문서](https://developers.google.com/identity/openid-connect/openid-connect)

### 4.2 Google 계정 없는 학생의 교사 관리 참여

이 흐름은 제품이 구현할 승인·연결 계층이며 Firebase가 제공하는 완성형 학급 로그인 기능이라는 뜻이 아니다. 학생별 일회용 참여카드와 Firebase custom token은 서로 다른 자격이다.

1. 교사가 학생별 안정적 UUID의 `profiles`와 해당 학급의 `class_memberships`를 일괄 생성하고 학급별 별칭을 지정한다. 인증 연결은 학생이 참여할 때 만든다. 실제 이메일이나 가짜 이메일 계정을 만들지 않는다.
2. 수업 시작 때 학급 입장 QR과 **학생별 일회용 참여카드**를 만든다. 학급 공통 코드는 입장 대기실만 열고 학생 명부·기록·작성 권한은 주지 않는다.
3. 서버가 티켓의 해시, 유효시간, 학생·학급 범위, 담당 교사 승인을 검증한다. 티켓만 가진 미승인 요청에는 학급 명부나 원문을 반환하지 않는다.
4. Firestore 트랜잭션에서 티켓을 소모하고 학생별 reading Auth UID와 `profiles`의 연결을 확정한 뒤 고유 `participation_session_id`의 참여 세션을 생성한다. Auth 사용자 생성·토큰 서명은 Firestore 트랜잭션과 원자적이지 않으므로 별도 멱등 단계로 처리하고 실패 중간 상태에는 권한을 주지 않는다.
5. 서버 Admin SDK가 그 학생의 UID와 참여 세션 참조를 담은 custom token을 발급한다. 클라이언트는 `signInWithCustomToken`으로 얻은 ID token을 서버에 교환하고 HttpOnly 세션 쿠키를 받는다. 교환 후 브라우저 Firebase 인증 상태는 정리한다. 교사·학급 공용 UID는 사용하지 않는다.
6. 모든 업무 요청은 활성 `auth_bindings`, 해당 `participation_sessions`, 현재 학교·학급 소속을 검사한다. 참여 세션의 기본 제안 기한은 90분이다. custom token의 1시간 교환 유효기간 또는 ID token의 1시간 수명이 수업 종료 정책을 대신하지 않는다.
7. 로그아웃·공용 기기 교대·교사 종료 시 참여 세션을 회수하고 쿠키·로컬 민감 캐시를 지운다. 다음 티켓은 같은 `profile_id`에 **새 참여 세션 ID**를 연결한다. 새 카드를 발급해도 이전 세션·토큰의 권한은 되살아나지 않는다.

티켓 원문·custom token·ID token·세션 쿠키는 로그·QR·공유 URL에 넣지 않는다. 티켓은 단일 사용이며, 발급된 custom token 자체가 자동으로 일회용이 된다고 가정하지 않는다. 재교환 요청도 활성 참여 세션·승인된 교환 상태를 검사한다. [Custom Tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens), [세션 쿠키](https://firebase.google.com/docs/auth/admin/manage-cookies)

### 4.3 학생 Google 계정 연결·계정 합치기

Firebase의 제공자 계정 연결·동일 이메일 충돌 처리와 이 서비스의 학생 기록 병합은 서로 다른 기능이다. Firebase의 Google 로그인에서 기존 자격 증명 연결이 일어나거나 별도 연결 절차가 필요해도, 그 결과만으로 서로 다른 학생 프로필·학교 소속을 합치지 않는다. [계정 충돌 처리](https://firebase.google.com/docs/auth/web/google-signin#handling_account-exists-with-different-credential_errors)

기존 학생 프로필에 Google 계정을 연결하려면 새 Google 인증, 기존 학생 참여의 확인, 담당 교사 승인, 필요한 법정대리인·학교 절차를 모두 통과한다. 이름·생년·이메일 유사도만으로 자동 병합하지 않는다. 충돌이 나면 양쪽 기록을 유지한 채 제한된 담당자에게 검토 요청을 보낸다. 연결 변경은 변경 전후 ID·승인자·사유를 기록한다. 마지막 로그인 수단을 제거해 복구 불가능해지는 변경은 차단한다.

## 5. 논리 데이터 모델

아래는 08 아키텍처 PRD와 공유하는 권한 모델이다. `profiles`는 사람의 안정적 식별자이며 프로필 자체가 권한은 아니다. 인증 세션, 학교 소속, 학급 소속을 각각 확인한다.

| 엔터티 | 핵심 필드 | 권한상 의미 |
|---|---|---|
| `profiles` | id, kind, lifecycle_status | 앱 내부 사람/참여 신원. OAuth 이메일과 분리 |
| `auth_bindings` | auth_user_id, profile_id, scope, expires_at, status, method, revoked_at, approved_by | 인증 UID를 앱 신원에 연결. 연결의 허용 범위/기한이며 학생의 개별 수업 기한은 participation_sessions로 추가 제한 |
| `participation_sessions` | id, auth_user_id, profile_id, scope, expires_at, status, ticket_id, exchange_status | 학생별 수업 참여 세션. 새 티켓 발급과 이전 세션 회수를 독립 관리 |
| `schools` | id, verified_status, policy_version | 학교 테넌트. 검증 대기 학교와 승인 학교 구별 |
| `school_memberships` | school_id, profile_id, role, status, valid_from, valid_until, approved_by | 활성 소속·역할의 최종 권한 근거 |
| `classrooms` | id, school_id, school_year, status | 특정 연도 학급. 폐쇄 학급과 현재 학급 구별 |
| `class_memberships` | school_id, class_id, profile_id, role, status, alias, grade_band | 담당 교사·학생·보조 교사의 학급 범위. 학생은 학급 내 별칭 사용 |
| `student_identifiers` | school_id, profile_id, permitted identifiers | 실명 대응표. 일반 프로필과 분리한 서버 전용 컬렉션/문서 |
| `participation_tickets` | token_hash, school_id, class_id, profile_id, expires_at, consumed_at | 일회용 참여 승인. 클라이언트 직접 읽기·쓰기 금지 |
| `project_memberships` | school_id, project_id, profile_id, capability | 공동 책의 읽기·의견·장면 편집 권한 |
| `consent_records` | subject_id, purpose, legal_basis, version, scope, evidence_ref, effective_at, withdrawn_at | 개인정보·외부 공개·작품 이용허락을 목적별 분리 |
| `publication_grants` | work_version_id, audience, approved_by, expires_at, revoked_at | 확정된 책 버전의 학급·학교·외부 공개 승인 |
| `support_access_grants` | requester, approver, school_id, resource_scope, reason, expires_at | 플랫폼 운영자의 예외 열람 범위 |
| `audit_events` | actor_profile_id, action, target_id, school_id, outcome, timestamp, request_id | 안정적 사람 ID로 역할·승인·외부 공개·내보내기·삭제 기록. 인증 UID는 필요한 감사 맥락으로 별도 보관하며 본문·토큰 제외 |

학교 업무 문서에는 `school_id`를 필수로 둔다. `schools/{school_id}/...` 경로 또는 명시적 school_id 필드와 참조 자원의 학교가 일치하는지 서버에서 검사한다. Firestore에 SQL 외래키·NOT NULL 제약이 있다고 가정하지 않고 서버 스키마 검증·트랜잭션·직접 접근을 허용한 경로의 Security Rules로 관계 불변조건을 지킨다. 플랫폼 고전 카탈로그는 분리하고 학교 ID 누락을 전체 접근 허용의 신호로 쓰지 않는다.

하나의 reading Auth UID는 동시에 서로 다른 사람에게 연결되지 않게 `auth_bindings/{auth_user_id}`의 결정적 문서 ID와 서버 트랜잭션으로 보호한다. 한 학생이 새 기기에서 인증해도 승인 후 같은 `profile_id`를 사용한다. `scope`, `expires_at`, `status`는 서버만 변경하며 Google binding도 학교 소속 검사를 생략하지 않는다. 학생의 일시 참여 범위는 `participation_sessions`가 추가로 좁힌다. 인증 제공자의 UID와 이벤트의 안정적 `actor_profile_id`는 구분한다.

## 6. 필수 기능 요구사항

| ID | 요구사항 | 수용 기준 |
|---|---|---|
| AUTH-001 | Google OAuth 기본 로그인을 제공한다 | 기본 범위만 요청하며 OAuth 취소·차단 후에도 계정/소속 중복 생성 없음 |
| AUTH-002 | 운영·개발 환경의 콜백을 분리하고 운영 리다이렉트를 명시 허용한다 | 외부 `returnTo`, 임의 호스트, 재사용된 콜백 코드로 세션 생성/이동 불가 |
| AUTH-003 | 서버는 reading 프로젝트의 검증된 ID token/세션 쿠키로 주체를 결정한다 | 클라이언트 UID·이메일·역할 객체 또는 homework 프로젝트 토큰으로 권한 부여 불가 |
| AUTH-004 | 학교 가입·담당 학급 배정을 별도 승인한다 | 학교 검색 또는 이메일 도메인 일치만으로 명부·답변 조회 불가 |
| AUTH-005 | 역할 변경은 서버 관리 명령으로만 처리한다 | 본인의 metadata/프로필 PATCH나 직접 DB 호출로 teacher/admin 승격 불가 |
| AUTH-006 | 교사 관리 학생 참여에 개별 승인·세션을 둔다 | 티켓 미승인·binding 미연결·참여 세션 만료 상태는 모든 학교 업무 접근 거부 |
| AUTH-007 | 학생 티켓은 단일 학생·학급·기한·사용 횟수에 묶는다 | 동시 제출 두 건 중 한 건만 성공, 다른 Auth UID의 재사용은 거부 |
| AUTH-008 | 학급 공통 코드와 학생 개인 권한을 분리한다 | 학급 QR만 아는 외부인이 학생 목록·작품 초안·답변을 볼 수 없음 |
| AUTH-009 | 공용 기기의 학생 교대를 지원한다 | 종료 뒤 뒤로가기·로컬 캐시·재접속에서 이전 학생 본문·토큰 노출 없음 |
| AUTH-010 | 앱 기록 연결·병합에는 검증·승인을 요구한다 | 이름이 같은 두 학생이 병합되지 않으며 OAuth 성공만으로 기록 이전 불가 |
| AUTH-011 | 다중 소속에서 현재 학교를 명시한다 | 다른 학교로 전환해도 이전 학교 자원 ID로 조회·편집할 수 없음 |
| AUTH-012 | 과목·학급 보조 교사를 제한 범위로 초대한다 | 초대 기간이 끝나면 담당 학급 조회·편집 권한 회수 |
| AUTH-013 | 학교 관리자와 학생 본문 열람 권한을 분리한다 | 관리자 기본 계정은 학급 집계만 보고 개별 답변·녹음 API는 거부 |
| AUTH-014 | 플랫폼 예외 열람에 승인·기한·감사 기록을 적용한다 | 지원 승인 범위 밖 자원 접근 거부, 만료 후 기존 탭 조회도 거부 |
| AUTH-015 | 콘텐츠 편집자와 학교 운영자를 분리한다 | 콘텐츠 편집자는 발행본을 편집해도 학생 테이블 목록을 가져올 수 없음 |
| AUTH-016 | Firestore/Storage 직접 접근 Rules와 서버 Admin SDK 인가를 각각 구현한다 | 클라이언트 get/list/create/update/delete 거부·허용과 서버 API 권한 테스트를 별도로 통과 |
| AUTH-017 | 쓰기 시 소유자·테넌트 변경을 검사한다 | 기존 문서와 새 필드·참조 학교를 함께 검사하며 다른 학교/학생으로 재귀속 불가 |
| AUTH-018 | 민감 필드는 별도 문서에 저장하고 서버 응답을 제한한다 | 학생 별칭 열람 응답에 실명·연락처·동의 증빙이 섞이지 않음 |
| AUTH-019 | Storage·검색·내보내기·실시간도 동일 권한을 적용한다 | 파일 경로·검색 필터·실시간 topic 조작으로 다른 범위 콘텐츠 접근 불가 |
| AUTH-020 | 역할·소속·binding 회수는 현재 DB 상태로 판단한다 | 오래된 JWT에 옛 역할이 남아도 새 업무 요청은 거부 |
| AUTH-021 | 전학과 교사 전출은 소속 종료/신규 승인을 통해 처리한다 | 과거 행의 school_id 일괄 변경이나 새 학교의 과거 학교 데이터 자동 열람 없음 |
| AUTH-022 | 학생 원작·음성·사진의 외부 공개를 목적별 승인한다 | 교사 승인만으로 부족한 동의가 없으면 외부 링크/공개 저장소 생성 불가 |
| AUTH-023 | 동의 철회·공개 회수·탈퇴 요청을 추적한다 | 접수·처리·실패·보존 예외가 표시되고 임의 무기한 대기하지 않음 |
| AUTH-024 | 계정 삭제 전에 접근 회수와 자료 처리를 완료한다 | 기존 세션으로 접근 불가, Auth·Firestore·Storage 삭제 단계의 실패/보존 예외를 구분 |
| AUTH-025 | 관리자 민감 작업에 재인증과 추가 인증을 적용한다 | 오래된 로그인만으로 관리자 승격·대량 내보내기·삭제 승인 불가 |
| AUTH-026 | 사용자에게 과금 권한을 자동 상속시키지 않는다 | 학교 관리자여도 별도 승인 없는 유료기능·API·업그레이드 실행 불가 |
| AUTH-027 | 권한 실패는 자료 유무를 노출하지 않는다 | 타 학교 자원의 응답은 일관된 접근 불가/404이며 제목·작성자 미포함 |
| AUTH-028 | 계정·티켓 오용을 제한하고 교사가 복구할 수 있게 한다 | 반복 오입력은 제한하고, 교사는 특정 학생 카드만 폐기·재발급 가능 |
| AUTH-029 | Admin SDK 서비스 계정·비밀키·인증 자격을 보호한다 | 관리자 개인키의 클라이언트 노출 0건. token·ticket·cookie는 필요한 인증 교환 외 일반 응답·로그·공유 URL에 노출하지 않음 |

## 7. Firebase 권한 구현 계약

### 7.1 인증과 인가

- P0 업무 접근은 서버 API와 Firebase session cookie를 기본으로 한다. Google 또는 custom token 로그인 뒤 얻은 **ID token**을 검증·교환한다. custom token을 ID token처럼 검증하거나 업무 API의 bearer로 받지 않는다. reading의 project ID·issuer/audience·서명·기한을 검증하며 homework 토큰은 거부한다. [ID token 검증](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- 쿠키는 host 범위·HttpOnly·Secure·SameSite 정책을 적용하고 세션 발급·변경 요청에 CSRF/Origin 검사와 최근 인증을 요구한다. 쿠키 발급 후 클라이언트 Auth 영속 상태를 지우는 서버 세션 모드를 기본으로 한다. Firebase session cookie는 Firestore/Storage 클라이언트 SDK용 ID token이 아니므로 두 경로를 혼용하지 않는다. [서버 세션 쿠키](https://firebase.google.com/docs/auth/admin/manage-cookies)
- `custom claims`는 서버 Admin SDK만 변경한다. 현재 역할·학교·학급·지원 승인·학생 참여 세션의 원본은 Firestore이고 오래된 claim만으로 권한을 부여하지 않는다. 사용자가 수정하는 프로필이나 로컬 역할 선택은 인가 근거가 아니다. [Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims)
- 관리자 승격·첫 학교 관리자 지정·학교 간 이전·병합·동의 변경·티켓 발급은 클라이언트 직접 쓰기를 차단한다. 서버는 최신 호출자 범위를 검증하고 Firestore 변경과 감사 사건을 같은 트랜잭션에 넣는다. 외부 Auth 작업은 별도 멱등 단계로 관리한다.

### 7.2 Firestore Security Rules와 서버 인가

Firestore·Storage Rules는 기본 거부이며 P0의 민감 업무 컬렉션은 브라우저 직접 접근을 열지 않는다. 필요가 입증된 공개 카탈로그 또는 제한된 후속 기능만 명시적으로 허용한다. `request.auth != null`만으로 모든 로그인 사용자에게 학교 자료를 열지 않는다. **Admin SDK/서버 라이브러리는 Firestore Rules를 우회한다.** 따라서 서버 API는 인증 후 별도로 학교·학급·자원·행위·현재 상태를 검사하고 서비스 계정 IAM도 최소 권한으로 둔다. Rules 테스트 통과가 서버 인가 검증을 대신하지 않는다. [Firestore Rules](https://firebase.google.com/docs/firestore/security/get-started)

Firestore Rules는 문서 전체 읽기를 허용하거나 거부하며 같은 문서의 특정 민감 필드만 숨기지 못한다. 실명 대응표·보호자 정보·교사 관찰 메모는 별도 비공개 문서로 분리하고 서버 응답은 허용 필드만 반환한다. 직접 클라이언트 쿼리를 허용할 경우 Rules는 사후 필터가 아니므로 학교·소유자 등 허용 조건과 쿼리 제약을 일치시킨다. [문서/필드 접근](https://firebase.google.com/docs/firestore/security/rules-fields), [쿼리 보안](https://firebase.google.com/docs/firestore/security/rules-query)

기본 논리식은 다음과 같다. 이는 실행 가능한 Rules 코드가 아니라 모든 구현 경로가 지켜야 하는 권한 계약이다.

```text
can_access(resource, action) =
  verified_session
  AND active_profile
  AND active_auth_binding(verified_firebase_uid, profile_id, resource.scope)
  AND active_participation_session_if_required(session_id, profile_id, resource.scope)
  AND active_school_membership(profile, resource.school_id)
  AND permitted_class_or_project_relationship(profile, resource)
  AND permitted_capability(role, action, resource.state)
  AND purpose_and_publication_rules_satisfied(resource, action)
```

이 식은 학교 업무 자원에 적용한다. 공개 카탈로그의 승인 발행본은 별도의 공개 읽기 정책을 사용하며, 공개 읽기 권한이 학생 비공개 기록까지 확장되지 않는다.

모든 서버 함수는 요청의 `school_id`를 권한 증명으로 받아들이지 않는다. 자원 ID로 실제 school_id를 조회하고 호출자의 소속과 대조한다. 검색·대량작업·내보내기·백그라운드 작업도 동일하다. 대량작업에는 승인 당시뿐 아니라 실행 시점의 권한·비용 승인을 재확인한다.

직접 쓰기를 허용하는 후속 경로는 필수 필드·타입·변경 가능 필드와 기존/새 `school_id`, `profile_id`, 참조 자원 범위를 함께 검사한다. 서버 경로에도 같은 검증이 필요하다. 컬렉션 그룹 쿼리·집계·검색 결과 수·페이지네이션이 학교 경계를 우회하지 않는지 별도 시험한다. Rules의 문서 조회 횟수 제한·읽기 비용도 데이터 구조 설계에 반영한다.

### 7.3 키·서버 경계·파일·실시간

Firebase 웹 설정의 `apiKey`, `projectId`, `authDomain` 등은 클라이언트 식별 설정이며 그 자체가 관리자 비밀키나 접근 통제가 아니다. Admin 서비스 계정 JSON/개인키·외부 공급자 키는 브라우저 번들·공개 환경변수·HTML·로그·버전 관리에 넣지 않는다. Firebase용 API 키 제한과 별도 유료 API 키를 구분한다. 제공받은 `.env.local`은 무시 목록에 두고 값은 문서·출력·스크린샷에 복제하지 않는다. [Firebase API 키](https://firebase.google.com/docs/projects/api-keys)

학생 자료는 비공개 Storage 접근 정책을 적용한다. 서버는 경로의 school_id뿐 아니라 자산 문서·소속·작품 권한을 확인한다. 파일 크기·타입·덮어쓰기·객체 경로를 제한하고 검수 전 업로드를 발행 경로와 분리한다. 민감 파일은 인증된 서버 다운로드 경로를 우선하고 공유 가능한 장기 다운로드 토큰 URL을 접근 통제로 사용하지 않는다. 승인된 단기 서명 URL도 만료 전 전달될 수 있으며 즉시 회수·이미 받은 사본 삭제를 보장하지 않는다. [Storage Rules](https://firebase.google.com/docs/storage/security)

실시간 공동작업은 초기 연결 인증만으로 권한이 유지된다고 가정하지 않는다. P0는 서버가 현재 권한을 재검사하는 저장·조회 경로로 시작한다. 후속 직접 Firestore listener를 도입하려면 클라이언트 ID token 경로, Rules, 소속/세션 회수 후 새 데이터 차단을 함께 구현·시험한다. 서버 스트림도 수신자 범위를 재검증하고 회수 시 연결을 종료한다. 공용 기기에서는 민감 Firestore 영속 오프라인 캐시를 기본 활성화하지 않으며 이미 기기에 전달된 데이터의 원격 회수를 보장하지 않는다.

### 7.4 로컬 mock과 실제 연결의 경계

현재 프로토타입의 교사/학생/관리자 전환은 합성 데이터 시연이다. Google 로그인 완료, 실학교 격리, 서버 권한 검증이 구현됐다고 표시하지 않는다. 설정이 존재해도 연결 플래그가 꺼져 있으면 Firebase SDK 초기화·원격 Auth/Firestore/Storage/Analytics 요청을 실행하지 않는다. 향후 Emulator Suite 검증은 별도 demo 프로젝트 ID와 에뮬레이터 연결을 명시해 운영 fallback을 막는다. 실제 연결 전에 제공 프로젝트가 reading 전용인지, 승인된 플랜·리전·비용·Rules·서버 자격 범위가 맞는지 확인한다. [로컬 에뮬레이터](https://firebase.google.com/docs/emulator-suite/connect_and_prototype)

## 8. 전학·전출·학년 전환·탈퇴

| 사건 | 처리 절차 | 보존/권한 원칙 |
|---|---|---|
| 학생 반 이동 | 기존 학급 membership 종료 → 새 반 승인 → 과제 접근 재계산 | 개인 답변 소유권 유지, 기존 모둠 편집 권한은 자동 종료 |
| 학생 전학 | 구 학교 membership 종료 → 새 학교에서 신원/동의 확인 → 별도 membership 생성 | 원 학교 행의 school_id를 새 학교로 바꾸지 않음. 필요한 개인 포트폴리오만 승인된 사본으로 이동 |
| 교사 전출·휴직 | 담당 학급 이전 승인 → 기존 접근 회수 → 필요한 관리 인수인계 | 사적 메모·학생 데이터가 개인 새 학교로 따라가지 않음 |
| 마지막 학교 관리자 이탈 | 후임 승인 후 이탈; 불가능하면 기관 확인을 통한 플랫폼 지원 | 누구나 학교를 탈취하도록 자동 승격하지 않음 |
| 학년 종료 | 편집 마감 → 보존/내보내기 안내 → 정책별 보관·익명화·삭제 | 새 학급에 과거 학생 자료 자동 공개 금지 |
| Google 계정 비활성화 | 학교 관리자가 해당 binding 회수, 개별 대체 참여 승인 | Google 오류를 우회하려고 교사 공용 계정을 배포하지 않음 |
| 개인정보 동의 철회 | 해당 목적의 새 처리·외부 공개 중지 → 관련 파일·링크 회수 → 보존 근거 분리 | 수업 필수 처리에 다른 적법 근거가 있는지는 학교가 확인. 일괄 삭제/일괄 거절하지 않음 |
| 학생/교사 탈퇴 | 주체 상태 비활성 → binding·membership·세션 회수 → 자산 정리 → Auth 삭제 | 공동작품은 합법적 보존 근거와 기여 표시를 따로 검토; 다른 학생 작품까지 무조건 cascade 삭제하지 않음 |

Firebase ID token은 보통 1시간 유효하고 refresh token 회수와 이미 발급된 자격의 검증은 구별해야 한다. 서버는 세션 쿠키/ID token의 회수 검사를 사용하고 현재 프로필·binding·학교 소속·참여 세션을 다시 확인한다. 소속 회수와 학생 카드 재발급은 먼저 앱 인가 상태를 바꾸며, 필요하면 refresh token도 회수한다. Auth 사용자 삭제가 Firestore 문서·하위 컬렉션·Storage 파일까지 자동 삭제한다는 가정은 하지 않는다. 자산 정리·합법적 공동작품 보존은 별도 작업으로 추적한다. [Firebase 세션 관리](https://firebase.google.com/docs/auth/admin/manage-sessions)

90분은 제품의 학생 참여 세션 정책 제안이다. Firebase session cookie의 설정 가능 범위나 기본 ID token 수명과 혼동하지 않는다. 서비스 활성화·추가 인증·Identity Platform 옵션·Storage·서버 운영은 무료라고 가정하지 않고 [09 비용 승인](09_admin_analytics_operations.md)의 공급자·단위·한도·초과 조건을 먼저 확인한다.

## 9. 개인정보·아동 권리·공개 범위

학교와 서비스의 개인정보처리자/수탁자 역할, 목적·항목·보관기간, 제공·국외 이전 여부는 실제 계약과 데이터 흐름에 맞춰 확정한다. 아동 별칭도 다른 자료와 결합해 식별 가능하면 개인정보가 될 수 있으므로 익명이라는 이름만으로 의무가 사라진다고 설명하지 않는다.

개인정보보호법 제22조의2는 만 14세 미만의 정보를 처리하면서 **동의가 필요한 경우** 법정대리인 동의·확인을 요구한다. 법령상 학교 업무 처리와 외부 홍보·서비스 선택 기능을 구분하며, 모든 수업 처리가 무조건 동의 기반이라고 일반화하지 않는다. 아동에게는 쉬운 언어로 알려야 한다. [현행 조문](https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029334761)

| 공개 수준 | 기본 접근 | 확장 조건 |
|---|---|---|
| `private` | 본인·담당 교사 | 특정 협업 초대 |
| `group` | 지정된 모둠과 담당 교사 | 교사의 학급 공개 승인 |
| `class` | 유효한 해당 학급 구성원 | 학교 공개 심사·필요 동의 |
| `school` | 승인된 해당 학교 구성원 | 외부 공개 심사·권리·목적별 동의 |
| `external` | 공개 승인된 고정 버전 | 개인정보·작품 이용권한·기간·철회 수단 확정 |

외부 공유는 무작위 URL을 아는 사람 모두가 열 수 있으면 사실상 외부 공개로 취급한다. 학급 QR과 외부 작품 QR을 구별하고, 비공개 작품을 단순 URL 은닉으로 보호하지 않는다. 학교 사진·영상의 홈페이지/SNS 게시에는 별도 동의가 필요하다는 교육부 안내를 반영한다. [교육부 개인정보 FAQ](https://privacy.moe.go.kr/privacy/page.do?mnu_uid=103&pageNo=19)

실명·사진·음성·본문 속 가족 사정·주소·친구 정보는 외부 공개 전 검사한다. 공개 동의가 없는 학생은 별칭·텍스트·비식별 삽화로 동등하게 참여한다. 개인정보 동의와 학생 창작물 이용허락은 별개 기록으로 관리한다. 교사가 수업을 냈다는 이유만으로 학생 작품이 교사 또는 플랫폼 소유가 되지 않는다. [KERIS 학생 과제 저작권 안내](https://www.kocw.or.kr/home/m/guide/copyrightList.do)

## 10. 실패 상황과 복구

| 상황 | 사용자에게 보이는 처리 | 서버·운영 처리 |
|---|---|---|
| Google `admin_policy_enforced` 등 학교 정책 차단 | 학교 관리자 승인 안내 + 교사 관리 학생 참여 선택 | 개인 계정 생성·나이 변경·보안 정책 해제를 우회책으로 유도하지 않음 |
| OAuth 취소·타임아웃 | 원래 화면으로 복귀, 다시 시도 가능 | 미완료 가입·초대 소비를 확정하지 않음 |
| 초대 대상 계정 불일치 | 계정 전환/관리자 문의 | 초대 대상 이메일·학교 내부 존재 여부를 과도하게 노출하지 않음 |
| 학생 카드 분실·다른 학생이 사용 | 교사에게 재발급 요청 | 해당 ticket/binding 폐기, 다른 학생 카드와 기록은 유지 |
| 쿠키 삭제·기기 교체 | 새 카드로 재참여 | 기존 프로필에 새 승인 참여 세션 연결. 이름으로 자동 복구 금지 |
| 계정 연결 충돌 | 연결 보류, 기존 자료 보존 안내 | 양측 증거·승인 확인 후 원자적 처리. 중간 상태 권한 확대 금지 |
| 권한 검사 DB 장애 | 접근 불가 및 임시 저장 상태 안내 | 권한을 확인할 수 없으면 허용하지 않음. 특권 키로 우회 금지 |
| 세션 만료 중 작성 | 서버 전송 전 재인증 안내 | 공개 기기에서 민감 본문 무기한 로컬 보관 금지. 저장 여부를 명확히 표시 |
| 소속 회수 중 공동 편집 | 편집 중지, 승인된 개인 결과 내보내기 안내 | 재접속·쓰기 거부, 실시간 접근 회수, 저장 완료 버전 보존 |
| 탈퇴 작업 일부 실패 | 접근 차단 완료/파일 정리 대기 등 단계 표시 | idempotent 작업 ID로 재시도, 삭제 실패를 성공으로 표시하지 않음 |

Google 차단 오류의 의미와 앱 승인 절차는 공식 개발자 안내를 따른다. [Google Workspace for Education 외부 앱 접근 안내](https://developers.google.com/workspace/classroom/best-practices/access-control-enhancements)

## 11. 검증 계획과 출시 기준

이 문서는 설계 단계이므로 아래 테스트를 실행했다고 주장하지 않는다. 구현 후 실제 배포 자격의 필수 검증이다. 비용이 발생할 수 있는 외부 테스트는 승인된 범위에서만 수행한다.

| 시나리오 | 연결 요구사항 | 통과 기준 |
|---|---|---|
| 학교 A 교사로 학교 B 자원 ID 직접 요청 | AUTH-004, 011, 016, 027 | API·파일·검색·내보내기 모두 자료 유출 0건 |
| 학생 A가 학생 B 답변의 작성자/학교 ID로 삽입·수정 | AUTH-017, 018 | DB 또는 권한 서버에서 거부, 원래 데이터 보존 |
| 로컬 role/프로필 값을 platform_admin으로 변조 | AUTH-005, 020 | 권한 변화 없음, 승격 API 직접 호출도 거부 |
| 미로그인 / 티켓만 보유 / 미연결 UID / 정상 학생 비교 | AUTH-006, 008 | 승인된 binding과 유효 참여 세션에만 개인 데이터 허용 |
| 티켓 동시 사용·만료·재사용·타 학교 코드 혼합 | AUTH-007, 028 | 각 조건에 정확히 거부, 정상 한 건만 연결 |
| 사용자 소속 회수 후 오래된 JWT 사용 | AUTH-020 | 새 조회·수정·다운로드 발급 즉시 거부 |
| 실시간 접속 후 모둠·학교 권한 회수 | AUTH-019, 020 | 합의한 실시간 회수 지연 목표 5초 이내 새 민감 데이터 수신 중지 |
| 모바일·공용 PC 학생 교대 | AUTH-009 | 이전 사용자 이름·본문·음성·세션이 다른 학생 화면에 남지 않음 |
| Firebase가 같은 이메일 제공자를 연결하거나 충돌을 반환하는 경우 | AUTH-010 | 별도 학생 프로필/학교 membership이 승인 없이 합쳐지지 않음 |
| 마지막 관리자 탈퇴·교사 전출·학생 전학 | AUTH-021, 024 | 학교 관리 가능성 유지, 이전 학교 데이터의 자동 이동 없음 |
| 동의 없는 학생이 포함된 공동책 외부 공개 | AUTH-022, 023 | 미승인 요소 수정/삭제/동의 확보 전 발행 차단 |
| 브라우저 번들·소스맵·일반 응답·로그 검사 | AUTH-029 | 관리자 개인키 노출 0건, 인증 교환 외 토큰·쿠키·티켓 평문 유출 없음 |
| 계정 삭제와 문서·파일 정리 부분 실패 | AUTH-024 | 접근은 차단된 채 처리 상태·재시도 가능, 공동저작물 무단 소실 없음 |
| 이전 티켓의 custom token/쿠키를 새 카드 발급 후 재사용 | AUTH-007, 020 | 새 세션이 기존 세션을 재활성화하지 않음 |
| homework Firebase 토큰 또는 다른 프로젝트 설정 주입 | AUTH-003, 016 | issuer/audience/서버 프로젝트 불일치 거부, 운영 fallback 없음 |
| mock 역할 선택 후 실제 API 직접 요청 | AUTH-003, 005 | 데모 역할 값이 서버 권한으로 인정되지 않음 |

테스트 데이터는 실제 아동 개인정보 대신 합성 데이터로 시작한다. 권한 표의 허용 사례도 함께 검증하여 정상 수업이 막히지 않게 한다. Firestore/Storage Rules의 직접 접근 테스트와 서버 Admin SDK 인가 테스트를 분리한다. get/list/create/update/delete·쿼리·검색·실시간·내보내기·관리자 경로를 포함하고, 학교·학급·모둠·세션 회수 조합을 fixture로 고정한다. 로컬 UI 테스트만으로 이 보안 시험을 통과했다고 기록하지 않는다.

## 12. 도입 전 확정 사항과 의존성

- **학교 도입 책임자:** 학교 확인 방법, 첫 관리자 지정, 실제 개인정보 처리 근거와 보호자 동의 확인 담당자.
- **제품 책임자:** 개인 교사 작업공간에서 학교로 콘텐츠를 옮길 때 학생자료 제외 규칙, 관리자 인수인계 규칙, 지원 열람 승인자.
- **보안 구현 담당:** Firebase client/Admin SDK 경계, Google 인증·세션 쿠키 교환, CSRF·XSS 대응, custom token/티켓/참여 세션 구분, Rules·서버 인가·실시간 회수.
- **학교/개인정보 담당:** 법정·계약 보존기간, 백업 만료, 공동작품 철회/삭제, 외부 공개 표기와 아동 설명문.
- **비용 승인권자:** Firebase·Google Cloud·서버 호스팅·저장/전송·추가 인증·관측 도구의 비용과 한도. 제공 설정의 기존 요금·리전·독립성을 확인하기 전 연결·과금 활성화하지 않음.

이 문서의 구현 순서는 로컬 시연 → Rules·서버 권한 모의 검증 → 승인된 reading 프로젝트 연결 → 교사 Google 로그인·학교 승인 → 개별 학생 참여 → 공동작품 권한 → 전학·탈퇴·공개 회수다. 외부 공개나 실시간 권한 회수가 준비되지 않으면 해당 기능을 비활성화한다. 실제 아동 데이터는 로컬 역할 시연에 사용하지 않는다.

## 13. 조사 및 설계 근거

공식 문서와 변경 내역을 2026-11-16 확인했다. 제공사 기능·플랜·SDK는 바뀔 수 있으므로 구현 시 재확인하며, 이 문서는 법률 자문이나 서비스 설정 완료 보고가 아니다.

- [Firebase Google 로그인](https://firebase.google.com/docs/auth/web/google-signin), [Custom Tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens), [세션 쿠키](https://firebase.google.com/docs/auth/admin/manage-cookies), [세션 회수](https://firebase.google.com/docs/auth/admin/manage-sessions): 인증 자격과 제품 참여 승인의 구별.
- [Firestore Rules](https://firebase.google.com/docs/firestore/security/get-started), [필드 접근](https://firebase.google.com/docs/firestore/security/rules-fields), [쿼리 보안](https://firebase.google.com/docs/firestore/security/rules-query), [Storage 보안](https://firebase.google.com/docs/storage/security): 클라이언트 직접 접근 통제와 서버 Admin SDK 인가의 분리.
- [API 키](https://firebase.google.com/docs/projects/api-keys), [ID token 검증](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [Emulator Suite](https://firebase.google.com/docs/emulator-suite/connect_and_prototype): 공개 식별 설정·서버 비밀·프로젝트 경계·로컬 검증.
- [Google OIDC](https://developers.google.com/identity/openid-connect/openid-connect), [학교 외부 앱 정책](https://knowledge.workspace.google.com/admin/getting-started/editions/manage-access-to-unconfigured-third-party-apps-for-users-designated-as-under-18): 인증 정보와 기관 권한·관리자 허용 조건의 구별.
- [개인정보보호법 제22조의2](https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029334761), [교육부 개인정보 FAQ](https://privacy.moe.go.kr/privacy/page.do?mnu_uid=103&pageNo=19), [KERIS 저작권 도움말](https://www.kocw.or.kr/home/m/guide/copyrightList.do): 아동 동의·외부 공개·학생 창작권의 분리.
