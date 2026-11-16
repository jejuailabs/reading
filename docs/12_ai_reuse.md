# 기존 AI 코드 조사와 reading 이식 경계

확인일: 2026-11-16. 조사 범위는 `C:/Users/na/Desktop/vibe2`와 `C:/Users/na/Desktop/vibeproject` 아래의 관련 소스다. 최초 조사는 환경변수 값 없이 소스만 읽었다. 이후 명시적으로 승인된 텍스트 검증을 위해 `folio-local/.env.local`의 `OPENAI_API_KEY` 한 변수만 메모리에서 읽어 reading `.env.local`에 옮겼다. 값은 출력하지 않았고 기존 프로젝트·자격증명 JSON·다른 키·Firebase 설정을 변경하지 않았다. 공급자 관리 계정·청구/잔액 조회와 SDK 설치는 하지 않았다. 실제 텍스트 검증 2회의 응답 사용량과 로컬 원장 결과는 §8에 기록한다.

## 1. 현재 구현 상태

- `src/lib/server/reading-ai.ts`: 서버 전용 순수 입력 검증, 한국어/영어 프롬프트·JSON Schema 요청 구성, 원시 Responses 응답 파싱·결과 검증이다. 이 파일 자체에는 환경변수·키·네트워크·DB 접근이 없다.
- `src/lib/server/reading-ai-runtime.ts`: 이번 개발 검증에 한정한 OpenAI 텍스트 transport, 로컬 세션, 24시간 승인 기한, 호출 전 영속 예산 예약을 구현했다. 모델은 `gpt-6-luna`, 최대 10회·누적 예약액 US$1 이하다.
- `src/app/api/reading-ai/route.ts`: GET은 항상 HTTP 503으로 설정 상태를 숨긴다. POST는 개발 환경, Vercel 환경 아님, 정확한 loopback host/origin, 같은 출처 Fetch Metadata, 유효한 승인과 로컬 쿠키를 모두 만족해야 실행한다. 운영·원격 환경에서는 차단한다.
- 로컬 세션은 Firebase 교사·학생 인증이 아니다. 일반 운영 공개나 학교·학급 권한 확인이 준비되었다는 의미도 아니다. 운영 연결에는 아래 §6의 정식 서버 인증·소속·자원 권한·승인 체계가 별도로 필요하다.
- 자동 회귀 테스트에는 실제 공급자를 호출하지 않는 가짜 transport를 사용했다. 별도로 승인 범위 안에서 브라우저를 통한 질문 코칭·동화 구성안 생성 각 1회, 총 2회를 성공적으로 검증했다(§8). 준비된 샘플과 실제 AI 결과는 구분한다. **TTS·삽화·웹 검색은 이 텍스트 승인에 포함되지 않는다.**

## 2. 확인한 재사용 후보

아래 모델명은 기존 소스에서 관찰한 설정 기본값이다. `gpt-6-luna`는 2026-11-16 공식 모델 페이지에서 확인했고, 공식 요금 안내의 표준 처리·컨텍스트 272K 미만 기준은 입력 100만 토큰당 **US$0.10**, 출력 100만 토큰당 **US$0.50**다. 승인된 실제 호출 2회가 성공하여 현재 reading 로컬 설정에서 이 모델을 이용할 수 있음을 확인했다. 계정의 전체 모델 이용 권한·무료 잔여량·결제 상태는 조회하지 않았다. 소스의 과거 가격표를 현행 비용으로 사용하지 않는다. [GPT-6 Luna 모델](https://developers.openai.com/api/docs/models/gpt-6-luna), [OpenAI 공식 API 요금 안내](https://openai.com/api/)

| 후보 | 소스에서 확인한 기능 | reading에 가져올 부분 | 그대로 가져오지 않을 부분 |
|---|---|---|---|
| homework | OpenAI Responses를 서버 `fetch`로 호출. 기본 `gpt-6-luna`. 교사 Google 세션·학급 소유 검사, 입력 제한, 분·일 호출 쿼터, Firestore 트랜잭션 예약, 중복 lease, 10분 메모리 캐시, 사용량 메타데이터 | 요청/응답 분리, 초안 원칙, 본문을 비신뢰 데이터로 다루는 프롬프트, 중복·횟수 제한 설계 | 기존 Firebase·세션 쿠키·키·컬렉션, 지역 조사용 유료 웹 검색, 횟수 제한을 금액 승인으로 간주하는 방식 |
| nohakwon | Responses `text.format.json_schema` / `strict:true`, 본문 없는 출제 차단, 인용 근거 확인, 생성 후 독립 풀이 검증 | 정형 응답, 실제 원문 인용 확인, 결과 검증 | 생성+검증 2회 호출, AI 검증만으로 `approved` 전환, 객관식 단일 정답 중심 프롬프트. 초등 1~2학년 독서 코칭에는 별도 설계 필요 |
| folio-local | OpenAI 음성 합성 배치에 기본 비활성화, 제공자·모델·계획 fingerprint·승인기한·예약액·요청 횟수 확인. 실행 전 원장 저장. 결과 불명 시 자동 재시도 금지 | 명시적 비용 승인과 실제 호출을 분리하는 계약, 예약·원장·재시도 경계 | 로컬 파일 원장을 서버 동시 요청의 원자적 원장으로 간주하는 것, 과거 단가·모델·GPU 설정, 기존 API 키 |
| aiguidepage | Anthropic Messages(JSON)와 OpenAI 음성 합성/전사. 기본 `claude-sonnet-4-6`, `gpt-4o-mini-tts`, `gpt-4o-transcribe`. 기관 도구 권한, 일일 제한, 실행 잠금, 결과 Zod 검증 | 입력/공급자/결과 검증 모듈 분리 | 다중 공급자 추가, 문서 안내 기능을 그대로 동화 생성으로 표시, 승인 없는 음성 호출 |
| homework-spell | Google Cloud TTS, 기본 Neural2; 본문·언어·목소리·모델 해시 캐시, 문자 수 제한, Storage 저장, 기기 음성 대안 | 향후 읽기 음성 캐시 키와 주입 가능한 합성 의존성 구조 | 기존 Admin 인증·버킷·데이터·공유 캐시 권한. 합성 lease를 못 얻은 채 대기 후 재합성할 수 있는 경로는 보강 필요 |
| jejuinfo | `@mlc-ai/web-llm` 0.2.87, WebGPU worker에서 Qwen2.5 0.5B 후보 지역 순위 계산. 취소·시간 제한·JSON 검증 | 브라우저 실행 가능성 검토 자료 | 완성된 동화 생성기로 간주하지 않음. 모델 다운로드·기기 성능·한국어 장문 품질은 별도 검증 사항 |

이번에 확인한 주요 소스에서는 초등 전 학년의 지역·주제별 구성안 3개부터 일관된 삽화·출판본까지 완성하는 일괄 동화 제작기를 찾지 못했다. 기존의 요청·검증·사용량·승인 패턴을 reading의 도메인에 맞게 조합하는 방식이다.

### 근거 파일

- [homework AI 설정·호출](C:/Users/na/Desktop/vibeproject/homework/src/lib/server/ai.ts:20), [예약과 사용량 기록](C:/Users/na/Desktop/vibeproject/homework/src/lib/server/ai.ts:41), [교사·학급 검사](C:/Users/na/Desktop/vibeproject/homework/src/lib/server/ai.ts:96)
- [homework 입력·프롬프트](C:/Users/na/Desktop/vibeproject/homework/src/lib/server/ai-policy.ts:16), [원시 Responses 결과 파싱](C:/Users/na/Desktop/vibeproject/homework/src/lib/server/ai-policy.ts:106), [사용량 메타데이터](C:/Users/na/Desktop/vibeproject/homework/src/lib/ai-usage.ts:7), [서버 세션 검사](C:/Users/na/Desktop/vibeproject/homework/src/lib/server/auth.ts:14)
- [nohakwon 정형 요청](C:/Users/na/Desktop/vibeproject/nohakwon/apps/web/src/lib/server/ai.ts:145), [문항 생성·본문 근거·독립 검증](C:/Users/na/Desktop/vibeproject/nohakwon/apps/web/src/lib/server/ai.ts:453)
- [folio-local 승인과 예약](C:/Users/na/Desktop/vibeproject/folio-local/lib/narration/openai-batch.mjs:3), [승인 없는 실행 차단](C:/Users/na/Desktop/vibeproject/folio-local/scripts/narration-batch.mjs:56), [음성 transport](C:/Users/na/Desktop/vibeproject/folio-local/lib/narration/openai.mjs:3)
- [aiguidepage 공급자 연결](C:/Users/na/Desktop/vibeproject/aiguidepage/src/lib/server/maisa-providers.ts:25), [기관 권한·횟수 제한](C:/Users/na/Desktop/vibeproject/aiguidepage/src/lib/server/maisa-access.ts:9), [라우트의 인증 순서](C:/Users/na/Desktop/vibeproject/aiguidepage/src/app/api/ai-tools/[tool]/route.ts:15)
- [homework-spell TTS 핵심](C:/Users/na/Desktop/vibeproject/homework-spell/src/lib/server/tts-core.ts:39), [TTS 서버 인증·문자 수 제한](C:/Users/na/Desktop/vibeproject/homework-spell/src/lib/server/tts.ts:33)
- [jejuinfo 브라우저 모델 실행](C:/Users/na/Desktop/vibe2/jejuinfo/src/lib/trip/browser-ai.ts:46)

## 3. 서버 설정 이름 조사 결과

최초 조사에서는 변수 이름만 확인했다. 이후 승인된 복사 범위는 `folio-local/.env.local`의 `OPENAI_API_KEY` 한 변수뿐이다. reading `.env.local`의 기존 값은 보존했고, 브라우저에 노출되는 `NEXT_PUBLIC_` 변수로 만들지 않았다. GPT-6 Luna 텍스트 호출 가능 여부는 실제 검증으로 확인했으며, 무료 잔여량·전체 모델 이용 권한·기존 결제/자동 충전 상태는 관리 API로 조회하지 않았다.

| 소스 | 설정 이름 |
|---|---|
| homework 텍스트 | `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_TEACHER_MINUTE_LIMIT`, `AI_TEACHER_DAILY_LIMIT`, `AI_GLOBAL_DAILY_LIMIT` |
| nohakwon 텍스트 | `OPENAI_API_KEY`, `AI_MODEL`, `AI_VERIFY_MODEL` |
| aiguidepage | `CLAUDE_API_KEY`, `CLAUDE_MODEL`, `OPENAI_API_KEY`, `OPENAI_TRANSCRIBE_MODEL`, `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE`, `AI_USER_DAILY_LIMIT`, `AI_DAILY_LIMIT` |
| folio-local 음성 | `OPENAI_API_KEY`, `NARRATION_PROVIDER`, `NARRATION_ENABLED`; 별도 RunPod 경로의 `RUNPOD_API_KEY`, `RUNPOD_QWEN3_TTS_ENDPOINT_ID` |
| homework-spell Google TTS | `GOOGLE_TTS_ENABLED`, `GOOGLE_TTS_FAMILY`, `GOOGLE_TTS_VOICE_KO`, `GOOGLE_TTS_VOICE_EN`, `GOOGLE_TTS_API_URL`, `TTS_STUDENT_DAILY_CHARS`, `TTS_TEACHER_DAILY_CHARS`, `TTS_GLOBAL_DAILY_CHARS` |

주요 서버 예시는 OpenAI·Anthropic 전용 SDK 대신 표준 `fetch`를 사용한다. 읽은 패키지에서 Firebase Admin 및 일부 Zod 의존성을 확인했지만 reading에는 새 SDK나 의존성을 설치하지 않았다. Google TTS 예시의 `cloudAccessToken()`은 기존 앱의 Admin 자격증명에 결합되어 있으므로 복사하지 않는다.

reading에 추가한 서버 전용 설정은 `OPENAI_API_KEY`, `READING_AI_PILOT_ENABLED`, `READING_AI_PILOT_APPROVED_AT`, `READING_AI_PILOT_EXPIRES_AT`, `READING_AI_PILOT_SESSION_SECRET`다. `.env*`와 `/.local/`는 Git 제외 규칙에 포함된다. 개발 검증 활성화나 이 파일의 존재가 새로운 비용 승인으로 취급되지는 않는다.

`.env.example`의 텍스트 파일럿 항목은 `READING_AI_PILOT_ENABLED=false`, 빈 키·승인 시각·만료 시각·세션 비밀값으로 제공한다. 실제 값은 이 예시 파일에 기록하지 않는다. 기존 `PAID_OPERATIONS_ENABLED`와 `AI_PROVIDER_MODE`는 설계용 placeholder이며 현재 텍스트 runtime의 실행 조건이 아니다. 실제 실행 여부는 파일럿 승인 설정·기한·개발/loopback 경계·쿠키·원장 한도를 함께 검사하여 결정한다.

## 4. reading 입력·응답 계약

경로: `POST /api/reading-ai`. 로컬 개발 검증에서 먼저 `{ "operation": "pilot-session" }`을 POST하면 HttpOnly·SameSite=Strict·host-only 쿠키를 발급한다. 응답은 `{ready:true, scope:"local-development-text-pilot", expiresAt}`이며 키 존재 여부를 확인하거나 공개하는 응답이 아니다. 이어서 아래 질문/구성안 본문을 같은 출처에서 POST한다. 본문은 최대 40KB다. 운영/원격/만료 상태는 차단하며 GET도 설정 상태를 공개하지 않고 503으로 응답한다.

Next 개발 서버가 내부 요청 URL을 `localhost:3100`으로 정규화해도, 브라우저 Host가 `127.0.0.1:3100`이면 이 두 loopback 별칭의 차이만 허용한다. 실제 브라우저의 Host와 Origin은 정확히 일치해야 하며, 전달된 Host도 브라우저 Host와 일치해야 한다. 외부 주소·다른 포트·다른 출처는 계속 차단한다.

```json
{
  "code": "AI_APPROVAL_REQUIRED",
  "error": "AI 기능은 비용 승인과 서버 인증 연결 후 사용할 수 있어요."
}
```

### 질문 코칭

```json
{
  "operation": "questions",
  "gradeBand": "3-4",
  "locale": "ko",
  "sourceText": "학생에게 읽을 권한이 있는 현재 판본의 본문 일부",
  "studentQuestion": "학생이 직접 쓴 질문"
}
```

- 학년군: `1-2`, `3-4`, `5-6`. en/em dash는 하이픈으로 정규화한다.
- `locale`은 선택이며 `ko` 또는 `en`, 기본 `ko`다. 설명 문장은 선택 언어를 따르되 JSON 키·enum 값과 실제 본문 인용은 번역하지 않는다.
- 본문: 10~12,000자, 학생 질문: 3~500자. 불필요한 이름·학급 명부를 전달하는 필드는 없다. 허용되지 않은 추가 필드는 거부한다. 텍스트 내부 개인정보 제거는 향후 전송 경계에서 별도로 필요하다.
- 결과: `operation`, `coaching`, `evidenceQuote`, `evidencePrompt`, `questionStarters`, `teacherReviewNote`.
- 질문틀은 `literal`과 `inferential` 각각 하나다. 답안 필드는 없고, 프롬프트에서 정답·모범 답안 제공을 금지한다.
- 인용은 원문에 실제 있는 연속 문자열이어야 한다. 적절한 인용이 없으면 빈 문자열을 허용한다. 자동 검증은 구조·길이·인용 일치까지만 보장하며, 정답을 우회 노출하지 않았는지와 교육적 품질은 교사 검토가 필요하다.

### 이야기 구성안 3개

```json
{
  "operation": "story-outlines",
  "gradeBand": "1-2",
  "locale": "ko",
  "topic": "친구의 이야기를 듣기",
  "place": "제주 애월",
  "storyType": "동화"
}
```

- 주제: 2~160자. 지역: 선택, 최대 120자, 기본 빈 문자열. 이야기 타입: 선택, 1~80자, 기본 `동화`.
- 결과: `operation`, `outlines` 정확히 3개, `teacherReviewNote`.
- 각 구성안: `id`(outline-1~3 순서), 서로 다른 `title`, `premise`, `mainCharacter`, 장면 개요 `scenes` 정확히 3개, `discussionQuestion`, `localFactsToVerify` 최대 3개.
- 실제 지역의 사실 확인과 창작을 구분하며, 지역 이름만으로 사실·출처를 만들어 내지 않도록 지시한다. 전체 책 본문·삽화·오디오·학생 공동 편집을 생성하는 endpoint는 아니다.

## 5. OpenAI 요청·응답 준비

기존 서버의 `POST https://api.openai.com/v1/responses` 패턴을 참고했다. 순수 `reading-ai.ts`는 요청 body만 구성하며, 승인된 로컬 runtime만 모델 `gpt-6-luna`를 주입하고 실제 transport를 호출할 수 있다. 입력 body의 모델·승인·UID 지정은 거부한다.

- `store:false`, 질문 1,600 / 구성안 3,600 `max_output_tokens`를 지정한다. 토큰 상한은 금액 승인이나 공급자 청구 상한을 의미하지 않는다.
- 사용자 입력은 system 지시와 분리된 JSON 데이터로 전달한다. 웹 검색·이미지·음성·기타 도구를 등록하지 않는다.
- `text.format`에 `type:json_schema`, `strict:true`와 필수 필드·추가 필드 금지 구조를 넣는다. 이것은 형식 제약이며 사실성이나 교육적 적절성 검증을 대신하지 않는다. [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- 원시 응답의 `status:completed`, `output` 배열 안 `message`의 `content[].type:output_text`를 확인하여 JSON을 파싱한다. 거절·미완성·도구 출력·잘못된 JSON·본문 밖 인용·구성안 수 불일치는 실패 처리한다. SDK의 편의 필드 `output_text`만 있는 객체를 원시 HTTP 응답으로 간주하지 않는다. [OpenAI Responses 생성 API](https://developers.openai.com/api/reference/resources/responses/methods/create)
- 기존 사용량 응답에는 `usage.input_tokens`, `usage.output_tokens`, `usage.total_tokens`, 캐시 토큰 등의 필드가 있다. 현재 reading에서는 과거 단가 기반 금액 계산을 이식하지 않았다.
- 로컬 transport는 `background:false`, `stream:false`, `service_tier:default`, 60초 제한, redirect 차단을 고정하고 재시도·유료 대체 제공자를 구현하지 않았다. 응답은 최대 128KB다. 성공 시 `{result: ReadingAiResult, usage:{inputTokens,outputTokens,totalTokens,cachedInputTokens,serviceTier,estimatedUsd,callsUsed,reservedUsd,totalReservedUsd,maxCalls,maxUsd}}`를 반환한다.
- `.local/ai-pilot/ledger.json`은 승인 식별자·모델·기한·예약액·요청 식별자·상태·토큰 사용량을 보관한다. 본문·생성 텍스트·키는 저장하지 않는다. 독점 lock과 임시 파일의 원자적 교체로 예약을 먼저 저장하고, 그 뒤 한 번만 공급자를 호출한다.
- 입력 예약 상한은 전체 요청 JSON의 UTF-8 바이트 수 × 2 + 4,096 토큰 여유분이다. 입력은 US$0.10/M, 최대 출력은 US$0.50/M으로 계산하고 마이크로달러 단위로 올림한다. 입력 상한이 272K 이상이면 차단한다. 캐시 할인은 예약에 적용하지 않는다. 완료 후에도 예약액을 줄이지 않아 실패·불명 요청을 포함한 누적 한도를 보수적으로 유지한다.

## 6. 실제 연결 전 비용·권한 계약

현재 승인 상태: **사용자가 “AI 검증 최대 10회·US$1 승인”이라고 명시적으로 승인함**. 제공자는 OpenAI, 모델은 GPT-6 Luna, 범위는 이번 개발의 질문 코칭·동화 구성안 텍스트 검증이다. 로컬 설정 기한은 2026-11-16 11:49:23부터 2026-11-17 11:49:23까지(한국 시간, 24시간)다. 기존 프로젝트 서버 키의 reading 로컬 복사만 허용되었고, 유료 대체·자동 재시도·자동 충전 활성화는 허용되지 않았다. 실제 계정의 무료 잔여량·기존 결제 설정은 추정하지 않는다. TTS·삽화·웹 검색·배포·운영 사용은 이 승인 범위가 아니다.

아래는 정식 운영 연결의 계약이다. 이번 loopback 개발 검증은 제한된 로컬 쿠키와 파일 원장을 사용하며 학교·학급 인증을 대체하지 않는다.

1. 제공자 OpenAI, 실제 사용 가능한 모델 ID, 텍스트 입·출력 및 캐시 토큰 단가, 무료 잔여량과 초과 과금 조건을 확인한다. 확인할 수 없는 항목은 불확실하다고 설명한다. 기존 소스·키·계정 보유는 비용 승인 근거가 아니다.
2. 사용자에게 기능 범위(질문 코칭/구성안), 시험 호출 수, 예상 입력·출력 길이, 총예산, 기간, 세금·환율 등 불확실성을 설명하고 그 범위의 명시적 승인을 받는다. 모델·범위·예산·기간이 바뀌면 다시 승인받는다. 음성·삽화·웹 검색·배포·DB 비용은 이 승인에 자동 포함하지 않는다.
3. reading의 서버 세션, 학교·학급 membership, 활동 참여 권한 및 판본 접근 권한을 확인한다. 클라이언트의 역할 선택값과 요청 내 UID를 신뢰하지 않는다. 구성안 생성의 교사 권한과 학생 질문 코칭의 제한된 참여 권한을 구분한다. 기존 homework의 계정·DB·버킷·쿠키를 재사용하지 않는다.
4. 승인 정보를 provider/model/기능/학교·사용자 범위/만료일/호출 수/예약액과 묶어 서버에서 검증한다. 인증과 비용 승인을 통과한 뒤에만, 별도 승인된 저장소의 원자적 예약·중복 방지 원장을 사용할 수 있다. 키·프롬프트·학생 원문은 사용량 로그에 남기지 않는다.
5. 공급자 호출 전에 최대 요청 비용을 보수적으로 예약하고, 완료 후 실제 사용량으로 정산한다. 실패·시간초과·저장 실패는 실제 청구 여부가 불명확할 수 있으므로 자동 재시도·다른 유료 모델로 전환·무조건 예약 환불을 하지 않는다. 재시도는 원장 대조 후 승인 범위에서만 한다.
6. 서버 transport는 인증·승인·예약을 통과한 실행 경계에 주입하고, 외부 요청 시간 제한과 응답 크기 제한을 적용한다. 완료 초안은 자동 발행하지 않는다. 요청 횟수 쿼터·메모리 캐시·지출 알림만으로 전체 청구를 보장하지 않는다. 저장된 음성 재생도 Storage 요청·전송 비용이 있을 수 있다.

folio-local의 승인 구조는 이 순서를 위한 참고다. 현재 구현한 로컬 파일 원장을 서버리스·다중 서버용 원장으로 사용해서는 안 된다. 정식 인증과 공유 원자적 원장은 운영 연결 전 별도로 구현·검증한다. 남은 lock, 손상된 원장, 불명 요청은 자동 초기화하지 않고 기록을 먼저 대조한다.

## 7. 검증 범위와 남은 작업

- 이전 일회성 로컬 검증의 핵심 계약을 `tests/reading-ai.test.ts`에 영속화했다. TypeScript를 메모리에서 변환하고 VM에서 `server-only` 표식만 허용한다. 예상 밖 모듈 import, 환경변수 접근, 네트워크 호출은 실패하게 하며 실제 공급자·DB에 연결하지 않는다. 테스트용 응답은 합성 fixture이고 제품에 저장하거나 실제 AI 결과로 표시하지 않는다.
- 검증 대상은 학년·언어, 추가 입력·길이 차단, 닫힌 JSON Schema, 입력/지시 분리, 원문 인용, 질문 유형, 구성안 수·중복·순서·장면 수, 거절·미완성·도구 출력·잘못된 응답 처리다. `tests/reading-ai-runtime.test.ts`는 가짜 transport와 전용 임시 원장으로 운영·원격 차단, loopback 내부 별칭, 쿠키, 크기·기한 제한, 예약 선행, 실패 보존, 10회·US$1 상한, 동시 예약·손상 원장·남은 lock 차단을 검증한다. AI 관련 테스트 24개와 타입 검사를 통과했고, 전체 `npm test` **37개 통과** 및 `npm run build` 성공도 확인했다. 이 자동 회귀 테스트 자체에서는 실제 공급자를 호출하지 않는다.
- 실제 API 연결과 두 기능의 브라우저 흐름은 §8의 2회 실행으로 확인했다. 초등 전 학년·모든 주제·한국어/영어 전체의 교육적 품질, 운영 권한 체계, 계정 무료 잔여량·전체 쿼터는 별도 검증 사항이다. 소수의 성공 사례를 전체 품질 보장으로 해석하지 않는다.
- 기존 TTS 핵심은 서로 다른 요청자가 동일 음성을 요청할 때 lease 미획득 후 대기 시간이 지나면 합성 경로로 진행할 수 있다. reading으로 이식한다면 대기 종료 뒤 재확인/lease 재획득 또는 실패로 종료하도록 보강한다.
- 기존 nohakwon은 독립 AI 검증이 맞으면 문항을 `approved`로 바꾼다. reading에서는 교사 검토 전 초안 상태를 유지하고, 추론·감상 질문을 단일 정답 문항으로 축소하지 않는다.
- 원본 프로젝트 수정, 다른 키·Firebase 인증정보 복사, 무제한 유료 실행, TTS 또는 신규 유료 서비스 활성화는 이번 텍스트 구현에 포함되지 않는다.

## 8. 실제 브라우저 검증 기록 — 2026-11-16

승인된 GPT-6 Luna 텍스트 검증을 브라우저 UI에서 총 2회 수행했다. `.local/ai-pilot/ledger.json`의 두 요청 모두 `completed`로 확인했다. 최초의 loopback 별칭 문제로 차단된 handshake 요청은 제공자에 도달하지 않았고 원장을 생성하거나 유료 호출 횟수를 소모하지 않았다.

| 검증 | 입력 토큰 | 출력 토큰 | 합계 토큰 | 응답 사용량 기반 추정 비용 |
|---|---:|---:|---:|---:|
| 학생 질문 코칭 | 1,142 | 366 | 1,508 | US$0.0002972 |
| 동화 구성안 3개 | 695 | 1,101 | 1,796 | US$0.0006200 |
| 합계 | **1,837** | **1,467** | **3,304** | **US$0.0009172** |

위 비용은 응답 토큰 사용량에 확인된 표준 단가를 적용한 추정치이며 공급자의 최종 청구서를 조회한 값은 아니다. 두 호출의 누적 보수적 예약액은 **US$0.005067**이다. 실제 추정 사용액과 예산 보호용 예약액을 구분하며, 성공 후에도 원장의 예약액을 줄이지 않았다.

- 질문 코칭: 학생의 원래 질문이 그대로 보존되고, 본문 근거 인용과 탐색을 돕는 질문이 화면에 표시되는 것을 확인했다.
- 이야기 구성안: `제주 애월`, `초등 3~4학년`, `모험 동화`, `서로 다른 마음` 조건으로 서로 다른 구성안 3개가 표시되었다. 첫 구성안을 선택하면 3장면의 편집 가능한 초안으로 이어지고 이전 프로젝트가 보존되는 것을 확인했다.
- 이번 두 흐름의 검증 목표를 충족했으므로 **추가 API 호출은 하지 않는다**. 승인된 상한이나 남은 횟수가 추가 호출의 필요성을 의미하지 않는다. 코드·승인·예산·환경 설정은 이 기록 갱신으로 변경하지 않았다.
