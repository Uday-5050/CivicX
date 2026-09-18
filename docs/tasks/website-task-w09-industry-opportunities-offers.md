# Website task W09: published opportunities and support offers

Status: complete

W09 completes the handoff from an approved university project to an industry partner. It replaces the legacy industry discovery/request screens with a published opportunity, a structured support offer, and an explicit university decision.

## Verified implementation

- A university lead or mentor can publish one opportunity for an owned project only after at least one proposal revision is approved.
- The opportunity contains a title, a public summary, and one or more requested support types. Published responses are redacted to the project title, university, department, domain, summary, and requested support.
- Industry users see published opportunities and a tracker for offers belonging to their own institution. They cannot submit a second offer for the same opportunity.
- Offer payloads contain only the support type, responsibilities, message, and optional cash/in-kind fields. Cash amounts use integer minor units and require a three-letter currency. Offers without cash require an in-kind description.
- A university coordinator or mentor can accept or decline an offer with `expectedVersion`. Acceptance creates one `industry_partner` project membership in the transaction and exposes the existing authorized project board. Decline grants no project access.
- The new university screen uses `/university/offers` and `/university/offers/:offerId/decision`. The new industry screen uses `/industry/opportunities`, `/industry/offers`, and `/industry/opportunities/:opportunityId/offers`.
- Legacy discovery and collaboration routes remain available for compatibility, but the website no longer uses them for the institutional workflow.

## Acceptance checks

- Client contract tests cover opportunity listing/publication, strict offer creation, offer listing, and optimistic university decisions.
- Backend tests verify the approved-proposal prerequisite, cash/in-kind validation, duplicate offer protection, one-time access grant, stale decision rejection, and the full citizen-to-industry lifecycle.
- Client build and test suite pass. Backend build and targeted industry/lifecycle tests pass.
- Lint reports existing React warnings only; no TypeScript or build errors remain. `git diff --check` is run before the task is marked complete.
- No deployment, push, production data write, or credential change is part of W09.

## Follow-up

W10 can focus on milestone evidence review, outcome validation, and closure polish now that an accepted industry partner can open the authorized project board.
