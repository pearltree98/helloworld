# External evaluation and decision record (2026-11-05)

Four evaluators reviewed the full source with the same adversarial prompt
(`tools/eval/evaluation-prompt.md`): ChatGPT, Gemini, Grok, and the Claude session that built it.

| | ChatGPT | Gemini | Grok | Build session |
|---|---|---|---|---|
| Verdict | (c) narrow and rebuild | (b) fold the app, keep the frame | (c) narrow and rebuild | (c); the frame is the asset |
| Ticket | demote | remove | remove | artificial scarcity |
| Public deploy as is | no | no (0/10) | no (1/10) | no |
| Advice verification | P0 | none, fatal | none | none |
| Priority error | yes | yes (1/10) | yes (2/10) | yes |
| First audience | delivery riders | delivery riders | workplace safety officers | whichever the maintainer can reach |

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

## Factual corrections to the evaluations

- ChatGPT reported that the case form loses input after a validation error (severity: high). Verified false in a browser: all fields survive the repaint (`web/js/views/newCase.js`, `kept`).
- ChatGPT could not run the tests in its sandbox; they pass here (13/13).

Grok's experiment asks for stated intent ("would you write one?"). Stated intent is a weak signal; actual
three-line submissions remain the primary metric, with reaction counts as a secondary one.

## The experiment that decides between (b) and (c)

Seven days, no code.

1. Pick one community the maintainer can post in.
2. Post one or two cards a day (`tools/cards`), plus recent real incidents rewritten in the same three lines.
3. Under each card: "If you have had a similar close call, leave three lines: the source / the state / how you avoided it. No names."
4. Count unsolicited three-line submissions from strangers over the seven days.

| Result | Decision |
|---|---|
| ≥ 15 submissions | (c): narrow audience, safety review, jointly-edited cases |
| 5–14 | Repeat one more week in a different community |
| < 5 | (b): no app; keep the frame as a content format only |

## Result

_To be filled in after the experiment._

- Community:
- Dates:
- Cards posted:
- Submissions (strangers, three-line format):
- Shares / saves:
- Decision:
