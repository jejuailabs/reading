# 운영 배포 HTTP 검증

검증 시각: **2026-11-16 14:38:16 KST** (`2026-11-16T05:38:16.239Z`).

대상: [온책읽기 운영 사이트](https://reading-bice-six.vercel.app)

## 결과

**13개 경로가 모두 기대한 HTTP 상태를 반환했다.** 일반 페이지·정적 자산 11개는 200, AI GET 경로 2개는 의도한 비활성 안내인 503이다. 리다이렉트는 없었다.

| 대상 | GET 경로 | 상태 | Content-Type / 확인 내용 |
|---|---|---:|---|
| 홈 | `/` | 200 | `text/html; charset=utf-8`, HTML 문서 시작 확인 |
| 서재 | `/library` | 200 | `text/html; charset=utf-8`, HTML 문서 시작 확인 |
| 공방 | `/studio` | 200 | `text/html; charset=utf-8`, HTML 문서 시작 확인 |
| 고운돋움 | `/fonts/GowunDodum-Regular.woff2` | 200 | `font/woff2`, WOFF2 파일 시그니처, Content-Length 445,956 |
| 고운바탕 | `/fonts/GowunBatang-Bold.woff2` | 200 | `font/woff2`, WOFF2 파일 시그니처, Content-Length 492,060 |
| 서재 아이콘 | `/illustrations/icons-v1/library.webp` | 200 | `image/webp`, RIFF/WEBP 시그니처, Content-Length 13,516 |
| 공방 아이콘 | `/illustrations/icons-v1/studio.webp` | 200 | `image/webp`, RIFF/WEBP 시그니처, Content-Length 21,488 |
| PDF 아이콘 | `/illustrations/icons-v1/pdf.webp` | 200 | `image/webp`, RIFF/WEBP 시그니처, Content-Length 15,562 |
| 저장된 한국어 낭독 | `/audio/classics-ai/heungbu-nolbu/ko.mp3` | 200 | `audio/mpeg`, MP3 프레임 시작, Content-Length 2,889,984 |
| 저장된 영어 낭독 | `/audio/classics/heungbu-nolbu/en-01.mp3` | 200 | `audio/mpeg`, ID3 시작, Content-Length 210,332 |
| PDF.js 워커 | `/pdf.worker.min.mjs` | 200 | `application/javascript; charset=utf-8`, JavaScript 주석 시작 |
| 텍스트 AI GET | `/api/reading-ai` | 503 | JSON `code: AI_APPROVAL_REQUIRED`, `Cache-Control: no-store` |
| 이미지 AI GET | `/api/book-image` | 503 | JSON `code: IMAGE_APPROVAL_REQUIRED`, `Cache-Control: no-store` |

## 실행 범위와 증거

- 공개 사이트에 **읽기 전용 GET**만 보냈다. POST, 생성·추론 요청, 계정 조회, 환경 변수 조회, 원격 변경, 재배포는 실행하지 않았다.
- 정적 MP3는 이미 배포된 파일의 제공 여부만 확인했다. 새로운 TTS 생성은 없었다.
- 페이지·정적 파일은 첫 응답 청크와 헤더를 읽은 뒤 본문 수신을 취소했다. 파일 전체의 디코딩·재생 성공을 의미하지 않는다. Content-Length는 서버가 보낸 값이며, 전부 내려받아 센 바이트 수가 아니다.
- AI 경로는 작은 JSON 응답을 끝까지 읽어 상태·공개 코드를 확인했다. 이 검사는 **GET의 고정 비활성 응답**을 검증한 것이며, POST 실행 가능 여부를 실제 호출로 시험하지 않았다.
- [기계 판독용 응답 기록](production-verification-http.json)에 경로, 상태, Content-Type, Content-Length, 캐시 헤더, 첫 청크 시그니처, 응답 시간, AI 공개 JSON을 저장했다.
- 초기 샌드박스 요청은 로컬 네트워크 정책 `EACCES`로 차단됐다. 읽기 전용 네트워크 접근 허용 후 확인한 위 결과가 유효한 운영 응답이다. 초기 차단을 사이트 장애로 판단하지 않았다.
- 범용 웹 열기 도구는 대상 URL을 읽지 못했으므로, 실제 Node HTTPS GET 결과를 근거로 사용했다.

## 배포 식별 정보

아래 식별 정보는 root의 배포 완료 인계에서 받은 값이다. 이 HTTP 검사에서 Vercel 관리 API나 GitHub를 조회해 다시 검증하지 않았다.

- GitHub main: `6aa8393`
- Vercel deployment: `dpl_Ex4hkhbqeHiGrSxrxrrSiUicgpvL`
- Team / project: `jejuai` / `reading`
- Project ID: `prj_tEa5OhXkSYDAlIo3xDS4SDgcORnc`

## 운영 브라우저 확인 · root CUA 관찰

다음은 동일 운영 origin에서 root가 직접 수행하고 전달한 브라우저 결과다. 위 HTTP 검사 담당자가 별도로 클릭을 재현했다는 뜻은 아니다.

- `/reader/heungbu-nolbu`: 첫 장면의 책갈피를 저장한 뒤 두 번째 장면으로 이동했다.
- 저장된 기존 AI 낭독 파일을 재생했다. 오디오 요소에서 `paused=false`, `readyState=4`, `currentTime=7.620122`가 관찰됐으며, 확인 후 일시정지했다. 새 TTS 생성 요청이 아니라 배포된 음원의 재생이다.
- 책 전체 PDF 다운로드를 실행해 `C:/Users/na/Downloads/흥부와 놀부.pdf`를 받았다.
- `/learn/heungbu-nolbu`: FORM-03 새 기록을 만든 뒤 빈 양식 PDF를 다운로드해 `C:/Users/na/Downloads/흥부와 놀부-FORM-03-blank-v1.pdf`를 받았다.

## 실제 운영 다운로드 PDF 독립 확인

다운로드된 두 파일을 로컬 Poppler와 PDF.js로 읽었다. PDF 원본을 수정하지 않았고 새 이미지·AI 생성, 외부 API, Git push, 재배포는 실행하지 않았다.

| 파일 | 크기 | 페이지·용지 | 독립 확인 결과 |
|---|---:|---|---|
| `흥부와 놀부.pdf` | 64,176 bytes | 표지 포함 7쪽 · A5 419.53 × 595.28 pt | 표지와 6장면의 한글 본문, 마지막 사과·화해 결말, `1 / 7`~`7 / 7` 추출 확인 |
| `흥부와 놀부-FORM-03-blank-v1.pdf` | 35,933 bytes | 2쪽 · A4 595.28 × 841.89 pt | `책과 첫 만남`, `FORM-03 v1`, 빈 양식 표시, 1~7번 문항과 `1 / 2`·`2 / 2` 확인 |

- 두 PDF 모두 `/FontFile2` 참조 2개와 나눔고딕·나눔고딕 Bold 서브셋(`NanumGothic`, `NanumGothicBold`)이 포함된다. 쪽 번호는 Helvetica를 사용한다.
- 시각 검사는 책 PDF의 물리적 2쪽과 빈 활동지의 1·2쪽을 렌더링하여 수행했다. 확인한 페이지의 한글, 행간, 답변 줄, 그림 응답 칸, 꼬리말이 정상이고 겹침·잘림·깨진 한글이 관찰되지 않았다.
- 책은 텍스트 고전 판본으로 출력되며 임의의 샘플 그림이 덧붙지 않았다. 빈 활동지는 답변 없이 작성 공간을 제공한다.
- 증거: [책 PDF 첫 본문 쪽](qa-2026-11-16/production-book-2.png), [FORM-03 1쪽](qa-2026-11-16/production-form03-1.png), [FORM-03 2쪽](qa-2026-11-16/production-form03-2.png).
- 전체 페이지별 추출 결과, 파일 SHA-256, 폰트 정보: [PDF 검사 JSON](production-verification-pdf.json).
- Poppler의 Symbol/ArialUnicode 표시 폰트 경고와 PDF.js의 standardFontDataUrl 경고가 있었으나, 검사한 렌더링과 한글 추출에서 관련 결함은 관찰되지 않았다.

## 남는 검증 경계

이 기록은 위에 명시한 HTTP·브라우저 경로와 다운로드 결과에 한한다. 모든 도서·양식·기기, 새로고침 후 책갈피 영속성, 전체 백업 복원, 실물 프린터 출력까지 재검증했다는 뜻은 아니다. 책 PDF 나머지 6쪽은 텍스트를 확인했으며 이번에 시각 렌더링까지 확인한 책 페이지는 2쪽이다.
