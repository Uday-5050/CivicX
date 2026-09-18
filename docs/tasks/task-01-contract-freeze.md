# Task 01 - contract freeze and repository baseline

Status: complete for documentation. No feature implementation was performed by this task.

Date checked: 17 September 2026.

## Verified repository baseline

- Repository: C:\Users\saran\Desktop\civix
- Current branch: feature/institutional-lifecycle-b-fix.
- HEAD and origin/main: 9d2c371 (feat(admin): expose moderation and report data).
- The frontend was restored to the GitHub version before this task. No frontend files were changed here.
- One pre-existing local backend edit exists at server/backend/src/modules/industry/industry.routes.ts. It was preserved and must not be reset.
- Backend stack: Express, TypeScript, and Mongoose. Website: React, Vite, and TypeScript. Mobile: Flutter.
- Current routes are mounted under /api and responses use {success, data, meta}.
- Existing tests cover health, submissions, and university behavior. They do not prove the full institutional workflow.

## Verified current implementation

Present and reusable:

- Citizen authentication, report submission, idempotency key, Cloudinary attachment metadata, classification preview, comments, and personal report listing.
- University challenge listing and decision endpoint with proposal validation.
- Initial admin institution/status, submission listing, moderation, report aggregation, review, route, and project-close endpoints.
- Initial project board, project evidence, project milestone review, project records, industry discovery, and collaboration request endpoints.
- Citizen status values currently include submitted, under_review, assigned, in_progress, and resolved.

Confirmed gaps:

- Institution stores only name, type, and account status. There is no capability profile, capacity, accepting-work flag, department, or verified roster model.
- Admin routing accepts arbitrary member name/email/role data and creates a copied UniversityChallenge; it does not reserve capacity or retain proper routing history.
- University acceptance currently requires a complete proposal and writes the challenge, project, and source submission in separate operations.
- Project stores one evidence object per stage, so revisions and review history are overwritten. Review currently advances the stage automatically.
- Several project writes check version in memory before saving rather than using an atomic database filter.
- Industry discovery exposes all non-deployed projects with every support type; there is no approved-proposal/publication gate or contribution-offer model.
- Collaboration access and project listing need a complete authorized-project list and accepted-membership path.
- Admin audit currently returns an empty response and moderation decisions are not represented as durable records.
- Closure has no complete deployment handoff/history/reopen flow and uses separate project/submission writes.
- Existing frontend APIs and screens must be rechecked against the proposed endpoints before screen implementation.

## Frozen workflow and permissions

Progress state:

    submission: submitted -> under_review -> assigned -> in_progress -> resolved
    project:    proposed -> funded -> prototyping -> piloted -> deployed

Separate state dimensions:

- disposition: active, duplicate, rejected, referred
- routing assignment: pending, accepted, declined, cancelled
- collaboration offer: pending, accepted, declined, withdrawn
- evidence/proposal review: pending, approved, rejected

| Role | Allowed scope |
|---|---|
| Citizen | Create and view own submissions, reply to own information requests, view public timeline/outcome |
| University coordinator/lead/member | View institution assignments and authorized projects; manage team, proposal, and evidence according to project role |
| Industry partner | Discover published redacted opportunities; submit offers; view project material only after accepted membership |
| Admin | Review/reroute records, manage institutions, review proposals/evidence, validate outcomes, close/reopen with audit |

Cross-cutting rules:

- AI recommends; humans decide routing, moderation, proposal approval, evidence approval, and closure.
- Information requests preserve the current progress state.
- Duplicate reports remain intact and linked; merging/deletion is not automatic.
- Only the next project stage can be entered.
- Evidence review identifies an immutable evidence revision. A review does not itself advance the project.
- Every consequential operation needs authorization, audit history, an idempotency/retry rule where applicable, and an atomic expected-version check.
- Private attachment/project downloads require authorization server-side.

## Contract changes recorded in docs/openapi.yaml

The x-civicx-proposed-contract extension records the proposed institutional operations without pretending they are implemented. It freezes:

- The /api prefix, response envelope, and existing /api/submissions compatibility.
- Submission and project progress states.
- Separate disposition, routing, collaboration, and review state dimensions.
- Role requirements for admin review/routing, university assignments, project proposals, industry offers, evidence/review/advance, and closure.
- Safeguards for AI advisory behavior, one active assignment/project, transactions, immutable evidence revisions, approved-review-based advancement, and private files.

The extension is a planning contract. A feature task must add concrete request bodies, response schemas, error cases, fixtures, and server implementation before calling an operation available.

## Legacy migration decision

Keep existing UniversityChallenge records readable during migration. Treat sourceSubmissionId as a historical link, not a second editable copy of the report. New assignments use a dedicated routing-assignment record. New projects use stable UUID strings and retain challengeId/submissionId references. A migration task must map accepted legacy challenge project IDs to the new project record and report ambiguous or missing references; it must not silently duplicate projects.

## Task cards

Every feature card must include prerequisites, scoped files, request/response examples, permission checks, success/failure cases, concurrency/idempotency behavior, tests, and evidence of completion.

| ID | Task | Completion evidence |
|---|---|---|
| 02 | Add institution capability profiles, departments, capacity, accepting-work flag, and verified roster | Profile validation; suspended/pending exclusion; wrong-institution denial tests |
| 03 | Add transaction helpers, atomic version/uniqueness helpers, audit events, and notification outbox | Rollback, stale-version, duplicate-retry, and audit persistence tests |
| 04 | Add persistent moderation, submission detail, information requests, disposition, and public timeline | Decision survives reload; replies return to queue; duplicate originals preserved |
| 05 | Add durable classification job/result model and deterministic baseline | Provider failure does not lose submission; job retry is idempotent; labeled fixtures |
| 06 | Add explainable university matching and admin routing UI | Top matches include score reasons; no-match queue; capacity/routing race tests |
| 07 | Replace copied challenge acceptance with assignment decision and atomic one-project creation | Concurrent acceptance creates one project; decline permits explicit reroute |
| 08 | Add authorized project list, memberships, proposal revisions, and proposal review | Multiple devices find authorized projects; history and role boundaries verified |
| 09 | Add published opportunities, partner profiles, matching, and invitations | Unpublished/private content hidden; actual support needs only |
| 10 | Add contribution offers, cash/in-kind validation, university decision, and access grants | Industry self-approval denied; one membership grant; accepted access persists |
| 11 | Add immutable milestone evidence/review revisions and explicit lead advancement | Skips, stale versions, old review reuse, and rejected evidence behave correctly |
| 12 | Add deployment handoff, outcome validation, atomic closure, and audited reopen | Premature closure fails; report/project update together; history retained |
| 13 | Add notifications and public timeline delivery | Correct recipients; no duplicate events; no private data leakage |
| 14 | Add analytics definitions, history-based funnel counts, and CSV export | Seed totals reconcile with dashboard and export |
| 15 | Add configurable AI adapter and evaluation after manual/rules workflow | Invalid/provider failure fallback; labeled evaluation results |
| 16 | Run cross-client regression, migration rehearsal, and demo setup | Fresh synthetic setup completes all gates without changing production data |

## Task 01 completion checks

- [x] Original problem statement and workflow plan read.
- [x] Current branch, commit, dirty files, and frontend restoration verified.
- [x] Existing routes, models, and client contracts inspected.
- [x] State machine and role permissions frozen.
- [x] Proposed API operations and safeguards recorded in OpenAPI extension.
- [x] Legacy UniversityChallenge migration rule recorded.
- [x] Subsequent implementation cards with acceptance evidence created.
- [x] No feature code, production data, deployment, or push performed by Task 01.

Next authorized work is Task 02 only. Do not begin it as part of Task 01.
