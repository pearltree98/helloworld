# Stepback public-good charter

Stepback exists so that fewer people get hurt by everyday hazards. It is a public good: free to use, free to copy, and built so that nobody can turn it into a business. This charter says what that means in practice, where the ideas come from, and how the project is governed.

## 1. Commitments

1. **Free for everyone, forever.** No paid tier, no premium features, no paywall.
2. **No advertising.** Nothing on the site is for sale, and no space is sold.
3. **No tracking.** No analytics scripts, no third-party cookies, no profiling. The only identifier is a random id the browser keeps for itself so that "one lesson per person" can be counted.
4. **No money inside the product.** There are no payments, pledges, tips or funds. A ticket is a lesson and a note, never a coupon for anything.
5. **Open content.** Every case and ticket is published under Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0). Anyone may copy, translate, print and build on it, as long as they credit the source and share alike.
6. **Open data.** The whole public dataset can be downloaded by anyone at `/api/export`, with no visitor ids in it.
7. **Open code.** The software is licensed under the GNU Affero General Public License v3 (AGPL-3.0). Anyone may run their own copy; anyone who runs a modified copy as a service must publish their changes.
8. **No blame.** Cases describe structures, not people. The form has no field for a perpetrator or a victim, and nothing on the site is meant to shame anyone.
9. **Transparent costs.** Hosting and domain costs are published. If donations are ever accepted to cover them, the ledger is public and donations buy no influence.
10. **Forkable by design.** If the people running Stepback ever drift from this charter, points 5–7 guarantee that anyone can take the code and the data and continue.

## 2. Where the ideas come from

Platforms that have stayed useful and trusted for decades share a few design choices. Stepback copies them deliberately.

| Example | What it does | What Stepback takes from it |
|---|---|---|
| **Wikipedia / Wikimedia Foundation** | Funded mainly by many small individual donations; refuses advertising to protect independence; all text under CC BY-SA. | No ads, open content under CC BY-SA, and the principle that the funder must never be able to steer the content. |
| **OpenStreetMap** | A volunteer-run foundation with one employee; data released under a share-alike licence (ODbL) that anyone, including companies, may use as long as improvements are shared back. | Open data export, share-alike licensing, minimal organisation. |
| **iNaturalist** | Became an independent non-profit in 2023; platform and data stay free; audited financials and tax filings are posted publicly. | Public ledger of costs; non-profit as the only acceptable legal form if one is ever needed. |
| **NASA Aviation Safety Reporting System (ASRS)** | Pilots report near misses to NASA, not to the regulator that could punish them. Reports are confidential and the regulator grants limited immunity. The separation is what makes honest reporting possible. | No blame, no identity required, and a strict wall between "recording what happened" and "judging who was at fault". |
| **Suspended coffee / meal vouchers on the wall** | A customer pays forward; a stranger redeems. A small, visible, one-time gift. | The ticket wall, kept entirely non-monetary: the gift is a lesson and a note. |

## 3. Why no money at all

The earlier design had an optional "safety-fund pledge". It was removed on purpose.

- **Trust.** The first question anyone asks a free service that touches money is "who keeps it?" Removing money removes the question.
- **Governance cost.** A fund needs a legal entity, accounting, auditing, and rules for spending. All of that is overhead that does not protect anyone from a reversing car.
- **Motivation crowding.** Economics has a well-documented effect where attaching a price to a prosocial act reduces the act. A note that says "this lesson kept me safe" is worth more unpriced.
- **The examples above.** Wikipedia, OpenStreetMap and ASRS all keep money out of the product itself and handle costs at the organisation level, in public.

If hosting ever needs funding, the model is Wikimedia's: many small donations, published accounts, no single donor large enough to matter.

## 4. Economics of a public good

A lesson is **non-rivalrous** (my reading it does not use it up) and, once published, **non-excludable** (nobody can be kept from it). Goods like that are under-produced by markets, which is exactly why they need a non-market structure. Stepback supplies three things a market would not:

- A **shared format** (hazard → exposure → avoidance) so that one person's close call is usable by a stranger.
- A **reciprocity device** (the one-time ticket) that turns a reader into a contributor without paying them.
- **Social proof** (lesson counts) that makes the safe choice look normal.

The result is positive-sum: the recorder gains recognition, the reader gains protection, the next reader gains a note, and nobody pays.

## 5. Governance, after Ostrom

Elinor Ostrom's work on long-lived commons gives eight design principles. Stepback maps to them as follows; items marked *later* are not yet built.

| Ostrom principle | Stepback |
|---|---|
| Clear boundaries | The resource is the set of cases and tickets; anyone may read, anyone may contribute within the no-blame rule. |
| Rules fit local conditions | Each language community keeps its own cases and translations; the same structure, local content. |
| Collective choice | Rules live in this charter and in the open repository; changes are proposed and discussed in public. *Later: a published process for charter changes.* |
| Monitoring by the users | All content is public and exportable, so anyone can audit it. *Later: a report button and a public moderation log.* |
| Graduated sanctions | *Later:* hide first, then restrict, then block, with each step and its reason logged publicly. |
| Cheap conflict resolution | *Later:* a public issue tracker for disputes about a case. |
| Right to organise | Guaranteed by the AGPL and CC BY-SA: any group may fork and run their own. |
| Nested enterprises | Language communities inside one shared codebase and dataset. |

## 6. Sociology, in short

- **Near-miss reporting works only without punishment** (ASRS). Hence no blame and no identity.
- **Heinrich's ratio (1 : 29 : 300)**: big accidents sit on top of many near misses. Collecting the small ones is the point.
- **Social proof** moves behaviour more than warnings. Counts are shown; fear is not.
- **Reciprocity** is triggered by a scarce, personal gift, not by an infinitely copyable like. Hence the one-time ticket.
- **Commons-based peer production** (Benkler): people contribute to a shared good when the unit of contribution is small, the format is clear, and the result is visibly used. Hence three fields and a public count.

## 7. What this charter does not do

It does not promise that the site will exist forever. It promises that if it stops, nothing is lost: the code and data are already in everyone's hands.
