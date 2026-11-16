# 최종 로컬 검증 기록

검증일: 2026-11-16 (Asia/Seoul). 작업 폴더: `C:\Users\na\Desktop\vibe2\reading`.

이번 기록은 최근 `WorkspaceGuide`의 화면 내 백업 교체 확인, `reader-pdf` 처리, 새 디자인·글꼴·정적 아이콘을 포함한 현재 소스에 대해 실행한 자동 테스트와 production build 결과이다. Git stage·commit·push, Vercel 배포, 새 이미지 생성, 실제 유료 API 호출은 실행하지 않았다. 원문 로그는 Git에서 제외되는 `.local/verification/`에 보관했다.

## Favicon

- 기존 `src/app/icon.svg`는 진녹색 바탕의 예전 선형 책 아이콘이어서 제거했다.
- 사용자 승인 내장 생성물 `artifacts/illustration-concepts/icons-v1/originals/library.png`를 정적 크기 변환하여 `src/app/icon.png`로 저장했다.
- PNG 256×256, alpha 있음, 52,691bytes. 원본의 색·그림 구성은 유지했으며 새 이미지 생성/API는 사용하지 않았다.
- 파일을 시각적으로 확인했고 production build의 경로 목록에 `/icon.png`가 포함되었다.

## npm test

명령: `npm test`.

결과: **성공, exit 0. 92개 통과 / 실패 0 / 취소 0 / 건너뜀 0.** 테스트 보고 시간 13,812.198ms.

```text
1..92
# tests 92
# pass 92
# fail 0
# cancelled 0
# skipped 0
# todo 0
READING_TEST_EXIT=0
```

주요 포함 범위:

- AI 텍스트/이미지 요청의 운영환경 차단, 별도 승인, 세션·입력·중복·예산·동시성·실패 예약 유지. 실제 환경/네트워크 접근을 금지하는 주입 테스트로 실행했다.
- 원고·온라인 링크·메타데이터 책 가져오기, 이미지 형식 제한, 책갈피와 기존 자료 보존.
- 책 공방의 초안 보존·고정 판본 독립성·검토·출처·복원 검증.
- 10편 고전과 양언어 원고, 장면별 MP3 본문 해시·재생 길이 검증.
- 20개 기록지, 자기 질문 원본·수정 이력·근거 보존, 독서 기록 독립성.
- 실제 다쪽 PDF 출력, 긴 본문 끝 보존, 빈 양식의 작성 내용 제외, 전권 장면 포함.
- PDF.js 가져오기 시 앞·중간·뒤 빈 쪽 보존, 스캔 문서의 OCR 미실행 구분.
- 최근 reader PDF 경로의 실제 표시 그림만 포함, 가짜 삽화 미추가, 원본 스냅샷, 24개 이미지 장면의 중복 변환 캐시·순차 디코드, 1600px 최대 변환, 원격 이미지 차단.
- 열어 보지 않은 이전 localStorage 공방/노트북까지 전체 백업에 포함하고 IndexedDB 우선 적용, 손상 데이터 거절.

경고는 있었으나 테스트 실패는 없었다. Node의 `MODULE_TYPELESS_PACKAGE_JSON` 재해석 경고와 PDF.js 테스트의 `standardFontDataUrl` 경고를 확인했다. 경고를 없애기 위해 동결된 앱 코드나 패키지 설정을 임의 변경하지 않았다.

## npm run build

명령: `NEXT_TELEMETRY_DISABLED=1`을 해당 명령 환경에 설정한 뒤 `npm run build`.

결과: **성공, exit 0.** Next.js 16.4.6/Turbopack. `prebuild`의 PDF.js worker·라이선스 동기화, 최적화 컴파일, TypeScript, 페이지 데이터 수집, 정적 페이지 생성, 최적화 마무리를 완료했다.

```text
Bundled PDF.js worker and licence synchronized.
✓ Compiled successfully in 3.9s
Finished TypeScript in 14.0s
✓ Generating static pages using 7 workers (3/3) in 3.5s

Route (app)
○ /_not-found
ƒ /[[...route]]
ƒ /api/book-image
ƒ /api/reading-ai
○ /icon.png

READING_BUILD_EXIT=0
```

Next.js는 빌드 때 로컬 환경 파일 존재를 보고했지만 비밀값은 출력하지 않았다. 생성 API를 실행하는 테스트나 배포 호출은 포함하지 않았다. 빌드에 API 경로가 존재한다는 사실은 운영 AI가 활성화되었다는 뜻이 아니다.

## 검증 범위의 한계

`WorkspaceGuide` 소스를 읽어 파일 선택 시 교체 확인이 초기화되고, 확인 체크 전에는 복원 버튼과 복원 함수가 실행되지 않으며, 교체 전에 현재 자료 백업을 내려받도록 되어 있음을 확인했다. 이 화면의 실제 클릭·다운로드·브라우저 복원 결과와 최종 디자인·모바일·다크·음성 재생·PDF 시각 검수는 루트 담당자의 별도 브라우저 QA 결과를 기준으로 한다. 이번 자동 검사 기록만으로 그 브라우저 검증까지 완료되었다고 주장하지 않는다.

원문 로그: `.local/verification/latest-test.log`, `.local/verification/latest-build.log`.
