# External evaluation and decision record (2026-11-05)

Three evaluators reviewed the full source with the same adversarial prompt
(`tools/eval/evaluation-prompt.md`): ChatGPT, Gemini, and the Claude session that built it.

## Where all three agree (treated as settled)

| Finding | Consequence |
|---|---|
| The asset is the frame *hazard → exposure → avoidance*, not the app | Protect the frame; everything else is negotiable |
| The ticket is artificial scarcity and is not self-explanatory | Remove it from the core flow |
| Forged `X-Visitor-Id`, no rate limit, no reporting: unsafe to expose | Do not deploy publicly as is |
| Nothing checks whether an "avoiding action" is correct | Safety review is P0 for any future version |
| 15 languages, charter and licences came before user 1 | Priority error; do not add more breadth |
| Code quality is fine and nearly irrelevant to the decision | Stop writing code until the premise is tested |

Both external evaluators independently chose the same first audience: urban delivery motorcycle riders.
Caveat: the first experiment must run in a community the maintainer can actually reach.

## Where they differ

- ChatGPT: **(c)** narrow to one audience, add safety review, rebuild.
- Gemini: **(b)** drop the standalone app; keep the frame as a content format that lives where people already watch crash footage (video comments, rider forums, card-news channels).

Gemini added two structural points the others missed:
1. Wikipedia and OpenStreetMap self-correct because one artefact is edited by many (revert). A feed of individual posts cannot self-correct, so moderation cost falls entirely on the maintainer. Any future version should be *jointly edited documents*, not posts.
2. Behaviour changes at the moment of exposure (triggers, environment), not when reading calmly beforehand. A standalone site cannot intervene at that moment.

## Factual corrections to the evaluations

- ChatGPT reported that the case form loses input after a validation error (severity: high). Verified false in a browser: all fields survive the repaint (`web/js/views/newCase.js`, `kept`).
- ChatGPT could not run the tests in its sandbox; they pass here (13/13).

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
