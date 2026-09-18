# CivicX website and AI integration plan

Date: 18 September 2026. Status: W01-W12 complete. A01-A04 are implemented and locally verified with rules plus a mocked Gemini-compatible request; one controlled live Gemini call remains blocked until a valid key/quota is supplied. W13 visual polish and W14 browser acceptance remain.

## Outcome and scope

Make the citizen → administrator → university → industry → validated outcome workflow usable through the website, with optional real AI suggestions and reliable manual operation. Keep React/Vite/TypeScript, Express/TypeScript/Mongoose, existing authentication, /api, and the {success,data,meta} envelope. Preserve existing local changes and the restored CivicX design. This phase does not rebuild Flutter, deploy, push, or change production data.

The previous 16 tasks provide a foundation, not proof of complete website integration. Their automated API tests do not replace browser/device checks. This plan explicitly includes the integration gaps found during inspection.

## Verified starting state

| Area | Current code evidence | Required change |
|---|---|---|
| University inbox | client/src/api/university.api.ts calls /university/challenges and the legacy decision payload | Use /university/assignments and expectedVersion; acceptance must not require a proposal |
| Industry workspace | industry.api.ts and IndustryWorkspace.tsx use legacy project discovery and collaboration requests | Use published opportunities and support offers; remove payload fields rejected by strict validation |
| Project navigation | ProjectBoard.tsx reads only civicx_project_id from localStorage | Load authorized projects from the API and navigate by URL ID |
| Project actions | UI grants editing based on university account role, uses window.prompt, and sends author on records | Derive controls from project membership; structured forms; send only accepted fields |
| Admin | API client exposes basic lists and old moderation decisions | Add report detail, recommendations, routing, evidence/proposal review, closure and history |
| Analytics | government.api.ts requests /government/*; backend mounts /admin/analytics | Use actual analytics/CSV contracts and admin access; do not invent a government account role |
| AI adapter | Server supports rules and an OpenAI-compatible JSON provider with timeout, redaction, validation and fallback | Connect the real report path and verify actual provider behavior |
| AI submission path | submission.routes.ts explicitly enqueues provider rules and awaits processing | Select configured provider; process durably outside the submission request |
| AI jobs | Jobs persist but server.ts starts no classification worker; running jobs lack lease recovery | Add worker, bounded retries and restart recovery |
| Human corrections | Classification completion replaces submission.analysis, which moderation also edits | Separate recommendations from authoritative admin decisions |
| Workflow prerequisites | Opportunity publishing does not require approved proposal; advancement consumes an approved review without checking it is the latest evidence | Enforce these server rules before enabling dependent screens |
| Transactions | withMongoTransaction falls back to nontransactional work on standalone MongoDB | Use a local replica set for acceptance evidence; do not claim rollback guarantees from standalone tests |

Do not replace database credentials or inspect secret values for planning. No provider key or paid model is selected by this plan.

## Website structure and visual direction

Keep existing components and migrate incrementally. Add API modules and feature components where they belong; do not rename the repository or rewrite working screens at once.

- Shared workspace shell: CivicX brand, role navigation, notifications, account/language menu, breadcrumbs, page title and primary action.
- Citizen: home, report form, report detail/tracker, information replies, notifications.
- Admin: review queue, report detail/matching, institutions/rosters, proposal/evidence queues, outcomes, analytics and audit.
- University: assignments, institution profile/roster, authorized projects, team/proposals, opportunities/offers, delivery board.
- Industry: opportunities, offer tracker, accepted projects, permitted records.
- Project URL: #/projects/:id with team/proposals/evidence/outcome views. Hash routing may remain; bookmarked URLs and browser back must work.
- Follow the existing blue/green identity, readable typography and restrained civic illustrations. Use consistent spacing, borders, status badges and form layouts. Replace decorative placeholder icons with consistent accessible icons.
- Motion supports navigation, expanding detail and save feedback; default 150–250 ms, respect reduced motion, avoid continuous effects over working forms. Preserve input focus and values during loading.
- Include keyboard/focus states, semantic tables, 360 px mobile layouts, English/Hindi parity and honest loading/empty/error states. No fabricated activity, impact totals or success messages.

## AI flow and boundaries

Browser → authenticated Express API → durable submission/job → worker → server-side provider adapter → validated recommendation revision → admin review UI.

1. Save the report and enqueue analysis atomically, or use a repairable outbox with a test proving no saved report is stranded. Return the tracking ID before the remote call completes.
2. A worker claims a job with a lease, bounded concurrency and attempt count. Recover abandoned leases after crashes. Retry transient failures with capped backoff; configuration/authentication errors fall back without repeated paid requests.
3. Build a minimal text payload from title, description and approved taxonomy. Redact contact identifiers and exact addresses where unnecessary. Do not send account records, tokens, private IP, media, or signed file URLs. Treat report text as untrusted data and ignore embedded instructions.
4. Validate category against the shared taxonomy, priority against the enum, and all output bounds. Output must contain only summary, suggested category, priority and supporting signals/reasons. Never execute generated HTML, links or instructions.
5. Save requested provider, actual provider, model/prompt version, input hash, timing, usage when available and sanitized failure code. Keep administrative classification separate. A late result cannot overwrite human edits or change workflow status.
6. Rules fallback is labeled as fallback. The website shows pending, processing, completed, fallback or failed independently of report status. Persist those distinctions through a reload.
7. AI may suggest classification, priority and possible duplicates. University matching remains the explainable capability/capacity scorer; AI can help extract tags only after those tags are validated. Admin explicitly chooses routing. No auto-acceptance, merging, milestone approval or closure.
8. Duplicate candidates are suggestions referencing existing authorized records. Scope retrieval before model access; do not leak another citizen's details. Start with indexed text/category/location matching. Semantic embeddings and media analysis are deferred.

Existing server configuration names: AI_PROVIDER, AI_API_URL, AI_API_KEY, AI_MODEL, AI_TIMEOUT_MS, AI_MAX_INPUT_CHARS. Keep keys only in backend environment/host secret storage, never VITE_* or browser requests. At the configuration task, choose a provider/model using its current official documentation, quality measurements and the user's budget. Do not assume any OpenAI-compatible service supports every JSON option.

## Ordered implementation task cards

Each row is one assignment. Read the named areas, update OpenAPI and request/response fixtures for changed contracts, implement only that row, and record actual checks. Backend additions listed below are explicit prerequisites, not something to hide behind UI logic.

| ID | Task and files to inspect | Deliverable | Acceptance checks |
|---|---|---|---|
| W01 | Contract and screen inventory: client/src/api, components, App.tsx, backend routes | Endpoint/payload/role matrix, screen map, baseline screenshots, known gaps and shared taxonomy decision | Every visible action maps to an existing or explicitly proposed API; preserve dirty files/design; identify unsupported actions |
| W02 | Shared shell and components: App.tsx, styles, auth context | Role navigation, reusable buttons/forms/dialogs/status/loading/error components; auth and onboarding corrections | Refresh/back/bookmarks work; password toggle works; industry onboarding is selectable; pending accounts see truthful status; wrong-role links fail safely |
| W03 | Client API contracts: api/client.ts, types and feature API modules | Typed wrappers for assignments, authorized projects, memberships, proposals, opportunities/offers, evidence, closure, analytics; consistent 401/403/409 handling | Fixtures match real envelopes; no extra author/organization/projectTitle fields in strict payloads; token refresh retries once; preserve edits on conflict |
| W04 | Institution readiness: institutions routes, university/admin screens | Capability/departments/capacity editor, admin verification, active roster management | Pending/suspended profiles cannot receive work; wrong-institution writes fail; verified roster appears for team selection |
| W05 | Citizen report and tracker: SubmissionWorkspace, CitizenDashboard | Clear form validation, attachments/progress/retry, status and disposition, public timeline and information replies | Submit/refresh shows same record; failed submission retains inputs; no automatic resubmit; no false resolved label for referral/duplicate; duplicate-warning behavior requires server support |
| W06 | Admin moderation/routing: AdminDashboard, admin API, routing services | Searchable queue, original report/evidence, review/clarification/duplicate/referral actions, top matches with reasons/capacity, routing history | Review→route works; no-match and decline/reroute are usable; enforce department/domain eligibility and atomic capacity reservation before sign-off |
| W07 | University assignment inbox: UniversityInbox, university API | New assignment detail, accept/decline/clarification, navigate to created project | Acceptance without finished proposal; retries return same project; wrong institution denied; two requests cannot create two projects |
| W08 | Project list/team/proposals: ProjectBoard, projects API, proposal routes | API-backed project list, URL detail, verified team picker, proposal revisions and admin review | Fresh browser finds projects without localStorage ID; students cannot manage team; returned proposal can be revised; add mentor endorsement contract if required before marking original gate complete |
| W09 | Published opportunities and offers: IndustryWorkspace, collaboration screens/routes | Approved-proposal publication, actual support needs, offer form/tracker, university decision, accepted partner project navigation | Server blocks unapproved publication and self-approval; integer minor-unit cash requires currency, in-kind detail validates; private material inaccessible before acceptance; legacy discovery cannot bypass redaction |
| W10 | Milestone delivery board: project/admin routes and ProjectBoard | Immutable evidence history, admin review queue, lead-only advance action, deliverables/tests/IP controls | Separate review and advance; server rejects skip/stale/rejected/superseded approval; enforce approved proposal/resource evidence for funded; closed projects read-only; membership-based permissions enforced in API responses too |
| W11 | Outcome and closure: project/admin screens and closure model/routes | Deployment handoff, measured outcome form, admin validation, closure/reopen history, citizen result | Collect operator/maintenance/handoff and actual outcome evidence; add missing persistence/reads first; close updates original report; reopen preserves history; private IP/attachments require authorized delivery |
| W12 | Notifications/analytics: AccountWorkspace, GovernmentDashboard, notification and analytics APIs | Unread badge, scoped deep links, REST refresh, actual admin metrics/filters/CSV and audit display | Notifications open correct record; no private data leak; filters/CSV reconcile; remove unsupported /government/* calls and invented role; labels match metric definitions |
| A01 | Provider preparation: adapters/ai, config, .env.example | **Implemented:** Gemini 3.5 Flash-Lite choice, server-only config, admin-safe status, structured-output stub test | Missing key remains usable with rules; mocked request verified. Controlled live call waits for a valid key/quota. |
| A02 | Durable AI processing: submission routes, classification models/services, worker entrypoint | **Implemented:** configured provider selection, repairable enqueue, worker, lease recovery, retry/backoff, revisioned results and fallback state | Submission no longer waits for remote AI; expired work is recovered; results are revisioned; report status is independent. |
| A03 | Website analysis integration: citizen/admin detail and analysis API | **Implemented core:** owner polling, admin analysis/revision display and authorized conflict-safe retry | Draft preview remains local, polling is bounded, and suggestions never mutate workflow. Duplicate-candidate retrieval remains a separate future capability. |
| A04 | AI evaluation and operating limits: fixtures, adapter tests, worker metrics | **Partially live-gated:** English/Hindi fixtures, taxonomy validation, redaction, injection-resistant prompt, timeout/retry/fallback limits and safe metadata | Local and mocked tests are implemented. Provider accuracy, latency and quota measurements wait for a valid key and available Gemini quota; no quality claim is made yet. |
| W13 | Website polish and regression: all touched screens and styles | Responsive spacing, useful motion, accessibility, Hindi copy, keyboard/error handling, lazy loading where justified | 360/768/1440 px layouts; reduced-motion works; focus stays usable; forms retain input; no uncaught errors or perpetual loading; repeat screenshots against baseline |
| W14 | Final cross-role browser acceptance: isolated replica-set fixtures and browser tests | Repeatable synthetic seed with safe local target guard, browser lifecycle tests, evidence report and refreshed demo guide | Real UI completes reporting→routing→acceptance→proposal→offer→review/advance→closure→citizen outcome; fresh sessions, 403/409, provider failure and delayed response tested; no production writes |

Suggested order: W01–W12 establishes the usable website with rules; A01–A04 connects and evaluates remote AI; W13–W14 finishes release validation. W01 is the first coding assignment, not the entire table.

## Contract additions to propose before implementation

These are proposed, not existing routes. W01 must inspect and freeze their schemas before callers are built:

- GET /api/admin/submissions/:id/analysis: job state, safe provider/fallback metadata, current suggestion and revision history. Citizen reads get a smaller owner-only projection through existing report detail.
- POST /api/admin/submissions/:id/analysis/retry: reason, expected analysis revision, idempotency key; bounded authenticated admin retry. Append a revision rather than replacing the record linked to human review.
- GET /api/projects/:id/milestone-evidence and GET /api/projects/:id/milestone-reviews: authorized immutable histories with stable IDs and pagination.
- Project detail/outcome projection: expose validated public outcome to the report owner without including internal IP, team contact data or unrestricted file URLs.
- If proposal endorsement, partner capability matching/invitations, handoff records or secure downloads are absent, record explicit prerequisite task extensions to W08/W09/W11. Do not simulate completion in the browser.

Keep separate states: report progress; report disposition; assignment status; proposal review; offer status; evidence review; project stage/closure; analysis processing/provider outcome. A failed AI request is not a failed report.

## Integration gates

- Gate 1 after W07: real browser submission is reviewed, routed and accepted into exactly one project.
- Gate 2 after W09: authorized team and approved proposal lead to accepted industry support with correct access.
- Gate 3 after W12: evidence-controlled delivery closes the original report, with notification and reconciled analytics.
- Gate 4 after A04: actual configured provider participates in report analysis; failures fall back; humans retain control; recorded evaluation meets agreed thresholds.
- Gate 5 after W14: complete browser scenario and negative paths pass against a replica set. Existing phone behavior remains compatible; a physical Android check is recorded separately.

Current scope does not promise an AI chatbot, agentic auto-routing, payments, media understanding, vector infrastructure, new mobile screens or a new hosting setup. Add those only through a separately agreed task.

## Instructions for Luna

Implement only task [W01/A01/etc.] from docs/website-ai-integration-plan.md. Read repository instructions, the relevant existing modules, OpenAPI and fixtures first. Preserve local changes and CivicX's restored visual design. Reuse the shared API client and server authorization. Do not invent endpoints, roles, statuses, counters or successful responses. For a missing backend prerequisite, implement only the explicitly scoped contract and tests before connecting its screen. Keep provider keys server-side; use synthetic data on an isolated local replica set. Run meaningful affected tests and builds, report actual results and remaining gaps, and update only this task's completion evidence. Do not push, deploy, modify production data or advance to the next task automatically.

For each task, record objective, prerequisites, affected files, request/response examples, success and failure behavior, permission checks, verification evidence and unresolved blockers. Use short verified checkpoints. Do not mark a UI task complete based only on an API test, and do not mark AI integration complete based only on a mocked provider.
