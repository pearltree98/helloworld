# External evaluation and decision record (2026-11-05)

Five evaluators reviewed the full source with the same adversarial prompt
(`tools/eval/evaluation-prompt.md`): ChatGPT, Gemini, Grok, Claude Opus (which also ran the server and
reproduced attacks), and the Claude session that built it.

| | ChatGPT | Gemini | Grok | Claude Opus | Build session |
|---|---|---|---|---|---|
| Verdict | (c) narrow and rebuild | (b) fold the app, keep the frame | (c) narrow and rebuild | (b), rebuild as (c) only if the experiment succeeds | (c); the frame is the asset |
| Ticket | demote | remove | remove | split into "thanks to author" + "did you do it?" follow-up | artificial scarcity |
| Public deploy as is | no | no (0/10) | no (1/10) | no (1/10, reproduced) | no |
| Advice verification | P0 | none, fatal | none | none; risk badge is self-rated | none |
| Priority error | yes | yes (1/10) | yes (2/10) | yes (2/10) | yes |
| First audience | delivery riders | delivery riders | workplace safety officers | delivery riders (the maintainer is one) | whichever the maintainer can reach |

## Where all three agree (treated as settled)

| Finding | Consequence |
|---|---|
| The asset is the frame *hazard → exposure → avoidance*, not the app | Protect the frame; everything else is negotiable |
| The ticket is artificial scarcity and is not self-explanatory | Remove it from the core flow |
| Forged `X-Visitor-Id`, no rate limit, no reporting: unsafe to expose | Do not deploy publicly as is |
| Nothing checks whether an "avoiding action" is correct | Safety review is P0 for any future version |
| 15 languages, charter and licences came before user 1 | Priority error; do not add more breadth |
| Code quality is fine and nearly irrelevant to the decision | Stop writing code until the premise is tested |

Two evaluators independently chose urban delivery motorcycle riders; Grok chose workplace safety officers
(construction, manufacturing, logistics). What the picks share: people exposed to the same hazard daily, for whom
reporting has a real payoff. The general public does not meet that condition. Caveats: safety officers already have
EHS software, so that path turns the project into a B2B tool rather than the everyday public good it set out to be;
and the first experiment must run in a community the maintainer can actually reach.

## Where they differ

- ChatGPT: **(c)** narrow to one audience, add safety review, rebuild.
- Gemini: **(b)** drop the standalone app; keep the frame as a content format that lives where people already watch crash footage (video comments, rider forums, card-news channels).

Gemini added two structural points the others missed:
1. Wikipedia and OpenStreetMap self-correct because one artefact is edited by many (revert). A feed of individual posts cannot self-correct, so moderation cost falls entirely on the maintainer. Any future version should be *jointly edited documents*, not posts.
2. Behaviour changes at the moment of exposure (triggers, environment), not when reading calmly beforehand. A standalone site cannot intervene at that moment.

## Defects reproduced by Claude Opus and re-confirmed here

All four reproduce on the current branch. They are defects of the build session, not of the evaluators.

| Defect | Where | Effect |
|---|---|---|
| Visitor ids returned in list and detail responses (`c.*`, `t.*`) | `server/db.js` | Anyone can replay any id: renaming `stepback-team` rewrote the author name on every seed case. Any user can be impersonated. The "no visitor ids" promise held only for `/api/export`. |
| No rate limit, forgeable identity | `server/app.js` | 200 fresh ids inflated one case's lesson count by 200 in about two seconds; 1,000 spam cases in under two seconds. |
| Hash router only | `web/` | `/case/1` returns 404; no per-case preview tags; invisible to search engines and chat link previews. |
| Own-ticket rule bypass | identity model | A second browser id takes your own ticket; disposable ids can empty the wall. |

Further findings from the same review, accepted:

- `cases` has no language column, so the Korean UI shows English seed cases; "per-language communities" in the charter is not in the code.
- The 5×5 risk badge is self-rated by the author but displayed like a measurement; spam rated 5×5 takes over the "highest risk" sort.
- Legal conflict created by the build: content is CC BY-SA (irrevocable) and exportable by anyone, while Korean law (정보통신망법 44조의2) obliges prompt removal on a victim's request. Deletion was promised nowhere and the licence was promised first. With zero outside contributions, now is the cheapest moment to change the content licence.
- Heinrich's 1:29:300 is presented as fact in the form; it is 1931 unpublished insurance data and should not be quoted as evidence.
- "Nothing happening is the biggest win" can read as "got away with it", which lowers perceived risk (near-miss bias, Dillon & Tinsley 2008). Keep the principle but pair every near miss with "this was a warning".
- The strongest kill argument: every safety reporting system that works runs on self-interest (ASRS immunity, verdicts on 한문철TV, fixes from 안전신문고). Stepback removed all three and kept only altruism, and its only device to recruit altruism, the ticket, gives the taker nothing.
- The seed has no motorcycle case although the maintainer is a delivery rider, and nothing in the repo records a conversation with a single real user.

## Factual corrections to the evaluations

- ChatGPT reported that the case form loses input after a validation error (severity: high). Verified false in a browser: all fields survive the repaint (`web/js/views/newCase.js`, `kept`).
- ChatGPT could not run the tests in its sandbox; they pass here (13/13).

Grok's experiment asks for stated intent ("would you write one?"). Stated intent is a weak signal; actual
three-line submissions remain the primary metric, with reaction counts as a secondary one.

## The experiment that decides between (b) and (c)

Final design (Claude Opus's version, adopted because the maintainer is a rider and can reach rider groups directly).
Seven days, zero code.

1. A three-question form (Naver Form or similar): ① where ② what was dangerous (one line) ③ next time I avoid it by… (one line).
2. Post it, with the group owner's permission, in two or three rider group chats or cafés the maintainer is already in, on day 1 and day 4. No individual DMs: a DM measures persuasion, not demand.
3. Record the total membership N of those groups on day 1.
4. Each day, turn one submission into a card (`tools/cards`) and post it back to the same groups.
5. Count distinct authors over seven days.

| Result | Decision |
|---|---|
| ≥ 15 distinct authors (or ≥ 1.5 % of N when N > 1,000), and ≥ 50 % of avoiding actions are if-then shaped | (c): riders only, place + one line + photo, thanks-to-author instead of tickets, safety review, deletion before licence |
| 6–14 | Keep the frame as card content only; repeat once in another group |
| ≤ 5 (or < 0.5 % of N) | (a)/(b): stop the app; the frame survives as a format |
| Stop signal regardless of count: ≥ 30 % of submissions blame a named person, plate or company | "No blame" does not hold in this group; rethink the premise |

## Result

_To be filled in after the experiment._

- Community:
- Dates:
- Cards posted:
- Submissions (strangers, three-line format):
- Shares / saves:
- Decision:
