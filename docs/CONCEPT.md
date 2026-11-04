# Stepback — Product concept

## 1. One sentence

> Record the avoiding action you learned from a close call, and hand it to the next person like a voucher pinned to a café wall.

## 2. Where it started

- A heavy truck turning right over a pedestrian at an intersection. A car striking a maintenance vehicle stopped in the fast lane. A small private jet going down after takeoff. Crash footage is everywhere; a place that turns it into **something I can do tomorrow** is rare.
- None of us decides when we leave this world. But stepping back from an avoidable hazard is something we can do today.
- Even when the other person made the mistake, **getting out of the way and having nothing happen** beats an insurance claim or an excuse to rest. That value became the app's first sentence: *Nothing happening is the biggest win.*

## 3. Reframing the problem

Surface problem: "there is no app that warns me about hazards."
The real problem has three layers.

| Layer | Problem | Stepback's answer |
|---|---|---|
| Knowledge | Accident information is consumed as fear and never translated into action | Every case is forced into **hazard (source) → exposure (state) → avoidance (action)** |
| Participation | Close calls go unrecorded because they are embarrassing or "nothing happened" | A no-blame reporting culture, no need to name people or places, the message that near misses are the most valuable data |
| Persistence | Goodwill fires once and stops | A one-time ticket that creates a loop of reciprocity (section 4) |

## 4. Economics: a positive-sum loop

### 4.1 The original: vouchers on a café wall

A customer pays a little extra → a voucher goes up on the wall → a student takes it down and eats for free.
Owner (revenue, reputation), giver (joy) and student (a meal) all end up better off and nobody loses. It is a **Pareto improvement**, the same structure as Naples' *caffè sospeso* and Korea's "Mirinae" shops.

### 4.2 Mapped onto Stepback

| Café | Stepback | What they get |
|---|---|---|
| Owner | The person who records a case | Their experience becomes a case; they can see how many took the lesson (recognition) |
| Customer paying extra | The person who pins a ticket | Expresses "this lesson protected me" and hands it on (meaning) |
| Student taking a voucher | The person who takes a ticket | The lesson plus a note someone left for them (protection and welcome) |
| The wall | The ticket wall | A place where goodwill is visible (social proof) |
| Voucher value | Safety-fund pledge | Returned as "avoiding tools": reflective strips, grab bars, rear warning lights (v1 records pledges only) |

### 4.3 Why one-time

A "like" copies infinitely, so it is not scarce and hands nothing to anyone.
A ticket can be taken by **exactly one person** and then leaves the wall. Someone who received something scarce wants to give back (reciprocity), so takers pin tickets on other cases and the loop keeps turning.

Rules enforced by the server: you cannot take your own ticket; one ticket per case per visitor; both giver and taker are recorded as having taken the lesson.

### 4.4 Where money sits

In v1 money exists only as a **pledge**. Wiring payments first turns the product into a donation platform and pushes the core asset, the cases and lessons, into the background. Pledge totals are public to build trust, and spending is limited to "avoiding tools" to keep the purpose clear. The currency is configurable so the same code runs anywhere.

## 5. Sociology: a no-blame reporting culture

- **Non-punitive near-miss reporting (the aviation ASRS model)**: a big part of how aviation cut its accident rate. No punishment means reports accumulate, and accumulated reports change the system.
- **Heinrich's ratio (1 : 29 : 300)**: behind one serious injury are 29 minor ones and 300 near misses. To prevent the big one, collect the near misses. That is why the default outcome is `near_miss`.
- **The Swiss-cheese model**: accidents happen when the holes in several layers line up. The avoiding action is the one layer you control.
- **Social proof**: "17 people have taken this lesson" moves safe behaviour from "fussy" to "normal".
- **We record structures, not people**: "that driver was reckless" protects nobody. "Next to a turning truck, take one step back" protects someone. So the form has no fields for perpetrator or victim.

## 6. Marketing: what spreads is an action, not fear

- The unit of sharing is **one sentence of avoiding action**. One card, one sentence, one link.
- The share button bundles title, avoiding action and link, so even someone who never opens the app walks away with the sentence.
- The risk badge (severity × likelihood) shows priority at a glance while scrolling.
- The counters on the home page signal "there are people here".
- Next: a weekly digest ("the three most-taken lessons this week"), seasonal campaigns (black ice in winter, water in summer), and partnerships with driving schools, schools, churches and housing communities, including putting a physical ticket wall up offline.

## 7. Vocabulary (used identically everywhere in the app)

| Term | Meaning | Example |
|---|---|---|
| Hazard | The source of potential harm | A truck's right-side blind spot, wet tile, a stopped vehicle in a live lane |
| Exposure | The state that puts me in its path | Within 1 m of the truck's side, glancing at a phone in the fast lane |
| Risk | Severity × likelihood (5×5) | 5 × 3 = 15 → High |
| Avoidance | My action that breaks the exposure | Take one step back; use the fast lane only to pass |
| Risky habit | A common habit that creates exposure | Phone while waiting at the light |

## 8. Engineering principles

1. Every SQL statement lives in the Repo in `server/db.js`. Routes stay thin.
2. Domain rules (risk, validation, vocabulary) live in `server/domain/`; the frontend fetches the same values from `/api/meta`.
3. No build step. The frontend is ES modules plus a hash router; a view is a function that returns DOM.
4. One dependency: express. The database is built-in `node:sqlite`.
5. Tests exercise the whole flow over real HTTP (`npm test`).
6. Internationalized from the start: UI strings in one dictionary per locale, server labels localized per request, currency and dates formatted by `Intl`.

## 9. Roadmap

| Stage | Scope | Why |
|---|---|---|
| v1 (now) | Cases, lessons, ticket wall, pledges, browser-local identity, en/ko | See whether the loop turns |
| v1.1 | Report and hide, merge duplicates, link previews | Quality |
| v1.2 | Accounts (social login), "my tickets / my lessons" pages | Sustained participation |
| v2 | Payments plus a public ledger of fund spending, offline ticket walls | Keep trust while money flows |
| v2.x | Browse by place type or region, weekly digest, images and video, more locales | Reach |

## 10. Open questions

- How do we invite a taker to **pin a ticket in turn** without nagging? (One prompt, right after taking.)
- When pledges become real money, who spends it and how is that shown transparently?
- How far do we go with fatal cases? The line between protecting bereaved families and sharing the lesson.
- Does a "lesson taken" click become a changed behaviour? (A light check-in one week later: "did you do it?")
