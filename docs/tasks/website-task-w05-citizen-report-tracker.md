# Website Task W05: Citizen report and tracker

Status: complete

## Objective

Make the citizen reporting flow reliable and honest: a report is only sent after explicit confirmation, local drafts survive failures, and the tracker shows the server's status, disposition, public timeline, evidence, and information requests.

## Verified starting state

- The form already used a local draft and an idempotency key, but draft attachment names were not restored and clearing a draft did not clear selected files.
- The tracker listed reports but did not load the owner-scoped detail, public timeline, or information-request routes.
- Disposition was returned by the server but was not displayed, which could make duplicate, rejected, or referred reports look like normal resolved reports.
- The backend currently exposes idempotency and disposition data, but it does not expose duplicate candidates for a pre-submit warning. The website does not fabricate that warning.

## Deliverables

- Added typed submission detail, timeline, information-request, reply, and public-timeline API wrappers.
- Added disposition and owner-scoped timeline/request types to the client contract.
- Updated the report form to use the shared canonical category values while keeping human-readable labels.
- Restored draft attachment names as a re-selection reminder; browser security prevents local files from being silently reused after reload.
- Ensured clearing a draft also clears selected files and image object URLs.
- Kept explicit review and confirmation as the only submission path. A failed request leaves the form and idempotency key intact for a deliberate retry; it never auto-submits when connectivity returns.
- Expanded the citizen tracker with:
  - assigned and in-progress filters;
  - disposition messaging for duplicate, rejected, and referred reports;
  - owner-scoped public timeline events;
  - information requests with explicit replies;
  - safe attachment rendering when an authorized file URL is unavailable.
- Added API contract tests for detail and information-reply routes.

## Acceptance evidence

- `npm run build` passes.
- Website tests pass: 3 test files and 8 tests.
- Lint completes with existing React warnings only; no lint error was introduced.
- `git diff --check` is clean.
- No automatic submission, duplicate merge, fabricated status, backend change, production write, or deployment was added.

## Deferred

- Server-provided duplicate candidates and duplicate confirmation remain deferred until the backend exposes a safe candidate contract.
- Durable provider analysis status/retry belongs to A01–A03. This task keeps the current rules preview and reports its failure independently from report submission.
- Admin moderation and routing screens belong to W06.
