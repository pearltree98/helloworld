# 미리봄 API

모든 응답은 JSON. 오류는 `{ error, message, errors? }` 형태.

## 방문자 식별 (v1)

| 헤더 | 설명 |
|---|---|
| `X-Visitor-Id` | `[A-Za-z0-9_-]{8,64}`. 브라우저가 만들어 보관. 쓰기 요청에 없으면 서버가 발급해 응답 헤더로 돌려준다. |
| `X-Visitor-Name` | URL 인코딩된 별명 (20자). 쓰기 요청마다 갱신된다. |

## 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/meta` | 분류, 결과 유형, 위험도 구간 |
| GET | `/api/me` · POST `/api/me` | 내 별명 확인 / 변경 `{ nickname }` |
| GET | `/api/stats` | 사례·교훈·티켓·약정 합계, 분류별 수 |
| GET | `/api/cases?category=&sort=recent\|risk\|lessons&q=&limit=&offset=` | 사례 목록 (위험도·교훈 수·티켓 수 포함) |
| POST | `/api/cases` | 사례 작성 (아래 필드) → 201 |
| GET | `/api/cases/:id` | 상세 + `learned`(내가 교훈을 받았는지) + `tickets` |
| POST | `/api/cases/:id/lessons` | "이 교훈을 받습니다" (멱등) → `{ lesson_count }` |
| POST | `/api/cases/:id/tickets` | 티켓 붙이기 `{ message, pledge_krw? }` → 201 |
| GET | `/api/tickets?status=wall\|taken` | 티켓 벽 / 건네진 티켓 |
| POST | `/api/tickets/:id/take` | 티켓 받기. 409: `already_taken` · `own_ticket` · `one_per_case` |

## 사례 필드

| 필드 | 필수 | 설명 |
|---|---|---|
| `title` | ✓ | 80자 |
| `category` | ✓ | `road` `walk` `home` `work` `transit` `air` `water` `other` |
| `situation` | ✓ | 무슨 일이 있었나 (2000자) |
| `hazard` | ✓ | 위해 요인 — 해의 원천 (500자) |
| `exposure` | ✓ | 노출 상태 — 나를 그 앞에 둔 상태 (500자) |
| `avoidance` | ✓ | 피하는 행동 — 내가 할 수 있는 것 (1000자) |
| `risky_habit` | | 위험을 높이는 흔한 행위 (500자) |
| `severity` | ✓ | 1~5 |
| `likelihood` | ✓ | 1~5 |
| `outcome` | | `near_miss`(기본) `observed` `injury` `fatal` |
| `location_text` | | 장소 유형 (120자) |
| `source_url` | | http(s) 링크 (500자) |

응답에는 `risk_score`(= severity × likelihood), `risk_level`(`low` ≤4, `moderate` ≤9, `high` ≤15, `critical` ≤25), `risk_label`, `lesson_count`, `tickets_on_wall`, `tickets_taken`, `author_name` 이 덧붙는다.
