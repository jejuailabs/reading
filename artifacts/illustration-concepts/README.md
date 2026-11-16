# 삽화 콘셉트와 정적 자산 기록

사용자는 최종 화면 방향으로 **흰 배경에 여백이 넉넉하고 가는 색연필 선이 보이는 그림책 일러스트**를 선택했습니다. 이 선택을 `pencil-v2` 자산 세트에 반영합니다. 원본 콘셉트는 비교·회고를 위해 보존하고 선택안으로 덮어쓰지 않습니다.

## 생성 방식과 앱 기능의 구분

여정 배경은 사용자가 선택해 제공한 정확한 이미지를 `pencil-selected/journey.png`에 보관합니다. 바닷마을·달빛·숲·우체통 장면은 이 방향에 맞추어 디자인 작업 중 내장 `image_gen`으로 생성한 래스터 자산입니다. 완성된 다섯 이미지를 정적 WebP 파일로 변환해 앱에 연결했습니다. 앱에서 책을 열거나 삽화를 바꾸는 동작은 저장된 파일을 선택할 뿐 생성 API를 호출하지 않습니다.

교사 동화 제작의 구성안은 여전히 로컬 mock이고, 앱의 생성형 AI·외부 삽화 서비스·Firebase는 연결되지 않았습니다. 디자인 자산 생성과 사용자별 책을 실시간 생성하는 제품 기능을 같은 것으로 표시하지 않습니다. 이 문서는 이미지 파일의 존재만으로 인물·지역 사실·저작권 검수가 끝났다고 주장하지 않습니다.

## 선택한 자산 세트

| 파일 | 연결된 사용 위치 |
|---|---|
| `../../public/illustrations/pencil-v2/journey.webp` | 이야기 여정 배경 |
| `../../public/illustrations/pencil-v2/coast.webp` | 바닷마을 표지·장면 |
| `../../public/illustrations/pencil-v2/night.webp` | 달빛 표지·장면 |
| `../../public/illustrations/pencil-v2/forest.webp` | 숲 표지·장면 |
| `../../public/illustrations/pencil-v2/mail.webp` | 우체통·편지 장면 |

위 경로는 저장소 루트 기준 `public/illustrations/pencil-v2/` 아래의 다섯 파일입니다. **다섯 원본·WebP 파일의 존재와 `src/components/artwork.tsx` 연결을 확인했으며, 홈/서재 이미지 로딩·태블릿 글자 크기·편집기 미리보기·언어/테마·모바일 배치의 브라우저 검증을 완료했습니다.** 세부 확인 범위와 스크린샷·빌드 결과는 [검증 기록](../pencil-v2-verification.md)을 참조하세요. 제작 기록에 따라 Sharp의 WebP 품질 88로 변환했으며 크기 변경·자르기·색상 변경은 하지 않았습니다. WebP 다섯 파일의 총크기는 968,812바이트입니다. 앱은 `next/image`의 `unoptimized` 설정으로 이 파일을 사용합니다.

원본은 다음 경로에 보관하며 선택안의 생성 프롬프트 기록은 `pencil-selected/prompts.json`에 있습니다. 확인하지 않은 모델 버전·해상도를 추정해 기입하지 않습니다.

| 원본 | 웹 자산 |
|---|---|
| `pencil-selected/journey.png` | `journey.webp` |
| `pencil-selected/coast.png` | `coast.webp` |
| `pencil-selected/night.png` | `night.webp` |
| `pencil-selected/forest.png` | `forest.webp` |
| `pencil-selected/mail.png` | `mail.webp` |

초기 `src/components/artwork.tsx`의 SVG 임시 삽화를 정적 래스터 자산으로 교체했습니다. 메뉴 아이콘 등 UI에 필요한 SVG는 별개입니다. 선택안은 흰 바탕의 가벼운 선과 색을 유지하고, 본문·버튼·활동명은 이미지 안의 글자 대신 실제 UI 텍스트로 표시합니다.

## 보존된 회화풍 자산

`painterly-v1`의 다음 PNG 원본 다섯 개는 문서 작성 시점에 존재를 확인했습니다. 선택된 색연필 세트와 분리하여 보존합니다.

| 파일 | 이전 콘셉트의 용도 |
|---|---|
| `painterly-v1/journey-village.png` | 여정 마을 |
| `painterly-v1/wind-post-cover.png` | 바람 우체국 표지 |
| `painterly-v1/moon-seed-cover.png` | 달빛 씨앗 표지 |
| `painterly-v1/village-map-cover.png` | 우리가 그린 마을 표지 |
| `painterly-v1/reply-letter-scene.png` | 답장 장면 |

## 네 가지 비교안과 선택 원본

| 보관 경로 | 방향과 상태 |
|---|---|
| `light-v2/01-flat.png` | 플랫 일러스트 비교안 · 보존 |
| `light-v2/02-pencil.png` | 색연필 일러스트 비교안 · 사용자 선택 방향 |
| `light-v2/03-paper.png` | 종이 표현 비교안 · 보존 |
| `light-v2/04-outline.png` | 윤곽선 일러스트 비교안 · 보존 |
| `light-v2/prompts.json` | 비교안 생성 프롬프트 기록 |
| `pencil-selected/journey.png` | 사용자가 선택해 제공한 여정 이미지 원본 |

선택하지 않은 플랫·종이·윤곽선 세 콘셉트도 비교 기록으로 유지합니다. 네 비교안·선택 원본·이전 회화풍 원본을 서로 덮어쓰지 않으며, 웹용 변환은 `public/illustrations/pencil-v2`의 별도 파일로 관리합니다. 선택 방향에 맞춰 추가 생성한 네 장면 원본도 `pencil-selected`에 보관합니다.

새 자산을 적용할 때에는 원본 보존, 화면별 이미지 대응, 흰 배경과 UI의 경계, 글자 가독성, 작은 화면에서의 잘림과 대체텍스트를 함께 확인합니다. 이 문서 수정만으로 이미지 생성·화면 검증이 완료된 것으로 기록하지 않습니다.

## 고전 모음 표지 추가

2026-11-16 `classics-v1/korean.png`와 `classics-v1/aesop.png`를 내장 이미지 생성 도구로 새로 제작했습니다. 선택한 색연필 스타일과 흰 여백을 유지하며, 전래동화와 이솝우화의 모음 표지로 사용합니다. 개별 장면을 재현한 삽화는 아닙니다. 프롬프트와 생성 모드는 [prompts.json](classics-v1/prompts.json)에 저장했습니다. 웹 자산은 `public/illustrations/classics-v1`의 WebP이며 원본을 덮어쓰지 않습니다. 서재·리더에서 로딩과 모바일 배치를 확인한 [검증 기록](../classics-verification.md)을 함께 보관합니다.
