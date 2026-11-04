# Stepback API

All responses are JSON. Errors look like `{ error, message, errors? }`.

## Visitor identity (v1)

| Header | Meaning |
|---|---|
| `X-Visitor-Id` | `[A-Za-z0-9_-]{8,64}`, minted and kept by the browser. A write without one gets an id issued in the response header of the same name. |
| `X-Visitor-Name` | URL-encoded display name (20 chars). Updated on every write. |

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/meta?lang=<code>` | `locales` ([{code,name,dir}]), localized categories, outcomes, risk levels; `content_license`, `code_license`; field `limits` |
| GET | `/locales/<code>.json` | The full locale file (UI strings, labels, About page) |
| GET / POST | `/api/me` | Read / set my display name `{ nickname }` |
| GET | `/api/stats` | Totals for cases, lessons, tickets; cases by category |
| GET | `/api/export` | Open data: every public case and ticket, with the content licence, without visitor ids |
| GET | `/api/cases?category=&sort=recent\|risk\|lessons&q=&limit=&offset=` | List cases with risk score, lesson and ticket counts |
| POST | `/api/cases` | Create a case (fields below) → 201 |
| GET | `/api/cases/:id` | Case + `learned` (did I take the lesson) + `tickets` |
| POST | `/api/cases/:id/lessons` | "I take this lesson" (idempotent) → `{ lesson_count }` |
| POST | `/api/cases/:id/tickets` | Pin a ticket `{ message }` → 201 |
| GET | `/api/tickets?status=wall\|taken` | Tickets on the wall / already handed on |
| POST | `/api/tickets/:id/take` | Take a ticket. 409 codes: `already_taken`, `own_ticket`, `one_per_case` |

## Case fields

| Field | Required | Notes |
|---|---|---|
| `title` | ✓ | ≤ 80 chars |
| `category` | ✓ | `road` `walk` `home` `work` `transit` `air` `water` `outdoors` `other` |
| `situation` | ✓ | What happened (≤ 2000) |
| `hazard` | ✓ | The source of harm (≤ 500) |
| `exposure` | ✓ | The state that put me in its path (≤ 500) |
| `avoidance` | ✓ | What I can do (≤ 1000) |
| `risky_habit` | | A common habit that raises the risk (≤ 500) |
| `severity` | ✓ | 1–5 |
| `likelihood` | ✓ | 1–5 |
| `outcome` | | `near_miss` (default) `observed` `injury` `fatal` |
| `location_text` | | Type of place (≤ 120) |
| `source_url` | | http(s) link (≤ 500) |

Responses add `risk_score` (= severity × likelihood), `risk_level` (`low` ≤ 4, `moderate` ≤ 9, `high` ≤ 15, `critical` ≤ 25), `lesson_count`, `tickets_on_wall`, `tickets_taken` and `author_name`. Labels for keys come from `/api/meta`.

## Validation errors

`errors` maps field names to codes the client localizes:

```json
{ "title": { "code": "required" }, "situation": { "code": "too_long", "max": 2000 } }
```

Codes: `required`, `too_long {max}`, `invalid_url`, `invalid_choice`, `out_of_range {min,max}`.
