# CivicX: citizen-to-university-to-industry implementation plan

Planning date: 17 September 2026. This is a proposed implementation specification, not a claim that these features are complete. No application code was changed to produce this plan.

## 1. Source and product scope

Grounded in the supplied original problem statement 26043, "A digital platform to crowdsource societal challenges and facilitate collaborative problem solving through universities and industry partnerships."

The statement requires multimedia reporting, AI classification/prioritization/deduplication, validated university allocation based on expertise, multidisciplinary teams and proposals, industry collaboration, evidence-based delivery, stakeholder communication, and government analytics.

Important interpretation: this is a societal innovation portal. A routine maintenance complaint may need referral to a local body rather than a research project. Reviewers must explain referrals; never mark them resolved merely because they were forwarded.

The statement allows industry involvement in mentorship, funding, prototyping, testing, and deployment. Therefore the proposed default is: university investigates and prepares an approved proposal, then invites industry; after prototype testing, the partners agree a deployment handoff. The university stays accountable for the project throughout. Industry does not replace the university owner.

Keep React/Vite/TypeScript in client/, Express/TypeScript/Mongoose in server/backend/, Flutter in mobile/, Atlas, and Cloudinary. Preserve the restored GitHub visual design. Add functional screens using its existing styles; do not run another visual redesign.

## 2. The main workflow

Citizen submission -> automatic analysis -> admin validation -> university recommendation -> admin routing -> university acceptance -> team formation -> proposal review -> industry opportunity/invitations -> confirmed resources -> prototype -> pilot -> deployment -> admin outcome validation -> citizen-visible resolution.

One original submission is the source of truth. Routing attempts, project, proposal versions, industry offers, evidence, and outcomes all reference it directly or through its project. Do not create disconnected copies of the complaint.

### Step 1: submission

Citizen enters title, description, affected people, duration, structured location (district/block or municipality/village or ward), optional coordinates, and attachments. Category can be suggested by the citizen but is not authoritative. Return a tracking ID immediately after durable saving.

Record submitter context: individual, community group, Panchayat, urban local body, or government department. For the first demo these are declared contexts under a citizen account, not claims of verified official authority. Verified organization representation is a later onboarding extension required for the broader product.

Retain draft recovery and explicit retries. Use a stable clientSubmissionId plus citizen-scoped uniqueness for submission retries. Upload metadata must be server-issued and authorized. Inspect actual web/mobile attachment contracts before changing limits; the repository's current upload limits differ from the older plan.

### Step 2: classification and triage

Use a shared domain catalog covering education, healthcare, agriculture, water resources, sanitation, environment, energy, urban infrastructure/development, accessibility, public administration/service delivery, rural livelihoods, and other/needs-review. Support one primary domain and optional secondary domains.

Persist analysis with provider/version, input revision, primary/secondary domain suggestions, confidence when meaningful, urgency suggestion/reasons, duplicate candidates, required capability tags, and processing state. Keep the admin's final classification separate from suggestions.

Run analysis through a durable database-backed job with retries. A saved report must survive provider errors. Start with deterministic rules and labeled synthetic examples; label rule scores as scores, not calibrated probabilities. Add a real AI adapter after the full manual workflow works, then evaluate it. A rules-only demo is not completion of the statement's AI requirement.

Never automatically reject a report, merge duplicates, assign an institution, or claim a solution based on AI output. Duplicate detection shows candidates for review; different locations or causes can make similar reports distinct. If a citizen is asked to confirm a probable duplicate before creation, the warning must create no report and confirmation must preserve the same submission identity.

### Step 3: admin review

Admin sees original evidence, analysis, candidate duplicates, and location. Actions: start review, correct category/priority, validate for innovation work, request information, mark linked duplicate, reject with reason, or refer outside the innovation workflow with destination/reason.

Information requests create a public-to-reporter conversation and notification; the report remains under_review. A citizen reply returns it to the review queue. Duplicate originals remain intact, with a safe link to progress on the primary record. Reject/referral/duplicate decisions are persisted and auditable; none means resolved.

### Step 4: recommend and route a university

Approved universities maintain: departments, domains, research/expertise tags, faculty specializations, labs, innovation/incubation facilities, service districts, coordinator, accepting-work flag, and project capacity. Admin verifies profiles. Without this directory there is no defensible automatic matching.

First matching version: only consider active, accepting universities with available capacity and a relevant domain. Proposed scoring out of 100: domain fit 40; relevant expertise/faculty tags 30; required facilities 15; service-area fit 10; remaining capacity 5. These are configurable product defaults, not numbers prescribed by the problem statement. Each contribution must be explainable; missing fields earn no invented points. Tie-break by fewer active projects, then stable ID. Show the top three and matching reasons.

Admin chooses a university and department, writes a reason for an override, and sends an assignment. Do not make the admin invent mentor/student rosters. Capacity must be checked again at routing time, not only when recommendations are generated. One pending assignment per report; routing records retain prior attempts.

If there is no suitable match, keep the report in an unassigned queue. Admin can expand the search or correct the requested capabilities. Do not silently choose an unrelated university.

### Step 5: university evaluation and acceptance

University coordinator sees assignments for their institution and can accept, decline with reason, or request clarification. Clarification does not finalize the assignment; a later acceptance remains possible. Declines return the report to the admin routing queue. Configurable response deadlines generate reminders; reassignment requires an explicit admin action.

Acceptance atomically records the assignment decision, creates one project, creates its initial lead membership, and sets the report to assigned. It must not require a finished solution proposal. Duplicate clicks/retries must return or identify the same project; concurrent acceptance must never create two projects.

Coordinator then assigns an authenticated faculty lead/mentor and student members from a verified institutional roster. Store roles as project memberships, not arbitrary names or email strings. A coordinator may initially act as lead if eligible. Initial delivery supports one owning university and multiple departments; cross-university membership can follow later.

### Step 6: team investigation and proposal

Team records site findings, root cause, proposed solution, beneficiaries, work plan, risks, resources, expected budget, success metric, baseline, and target. Preserve proposal versions. The mentor endorses a submitted proposal; admin approves or returns it with reasons. Proposal approval does not mean the problem is solved.

Upon approval the project becomes eligible to publish a redacted industry opportunity. The university states actual support needs: funding, mentorship, equipment, prototyping, testing, manufacturing, deployment, or technology transfer. Do not label every project as needing every category.

### Step 7: industry matching and offers

Approved partner profiles cover organization subtype (industry/startup/MSME/CSR/research lab/innovation hub), sectors, capabilities, support types, service districts, and contact coordinator.

Rank eligible partners by domain, requested support, capabilities, and geography with displayed reasons. University explicitly sends selected invitations through the platform, or publishes an opportunity for eligible partners to discover. No automatic external email dispatch is necessary for the MVP.

Before acceptance partners see only the approved opportunity brief and published evidence, not citizen contacts, private discussions, or IP records. Invitation is not membership. Industry submits an offer describing contributions, responsibilities, timeline, and constraints. Cash offers use currency and integer minor-unit amounts; in-kind contributions record item/quantity/unit. This is commitment tracking, not payment processing.

University lead/coordinator accepts or declines an offer. Acceptance atomically grants project access once. Industry cannot approve itself. Preserve offer history, including declined/withdrawn attempts. Allow another offer revision through an explicit operation rather than bypassing uniqueness checks. Multiple accepted partners are allowed, each with defined responsibilities.

If there is no industry response, the university may continue with approved self-funding or in-kind resources. Industry participation is useful but not a mandatory cash gate. Accepted partners retain their authorized workspace through deployment and closure even if the opportunity leaves discovery.

### Step 8: project execution and milestone gates

Preserve milestone names: proposed -> funded -> prototyping -> piloted -> deployed. Treat them as ordered gates with entry checks, not a draggable status board.

| Target stage | Evidence required to enter |
|---|---|
| proposed | Acceptance creates the project; team and proposal are developed here |
| funded | Approved proposal plus confirmed resource plan: cash, self-funded, or in-kind commitments |
| prototyping | Approved prototype execution plan, assigned responsibilities, readiness evidence |
| piloted | Prototype deliverables and tests pass the defined criteria; pilot plan/site ready |
| deployed | Pilot outcomes accepted and deployment/maintenance handoff ready |

After entering deployed, actual installation/rollout evidence and outcome validation are still required before report closure. Entering a stage alone never proves its final outcome.

For each transition: lead submits immutable evidence revision for a targetStage -> admin reviews that revision -> lead calls advance with targetStage, approvedReviewId, and expectedVersion. Review never advances the project automatically. Rejecting evidence leaves the stage unchanged; new evidence creates a new review revision. Only the next stage is allowed, and an old approval cannot authorize revised evidence. Entering prototyping updates the citizen report to in_progress in the same transaction.

Students and accepted industry members can submit authorized deliverables/test records; lead controls formal evidence submission and advancement. Keep IP disclosures more restricted than general project documents. Version discussions, test results, and contributions appropriately. Historical milestones must remain readable.

### Step 9: deployment handoff and closure

University and participating industry document the solution package, deployment site, responsible operator, maintenance owner, training, operating costs, handover acceptance, and applicable IP/license terms. The platform records the agreed terms; it does not invent legal ownership rules.

Capture baseline, target, measured result, metric unit, measurement dates/method, beneficiaries, and evidence. Request citizen/local-body feedback. Positive citizen feedback alone is insufficient for admin closure; nonresponse also must not block forever. Admin can use documented site/local-body validation with an explanation.

Only admin validates the outcome and closes the project/report in one transaction. A negative result goes back to corrective work with reasons. The citizen sees the public outcome and timeline. Closed projects are read-only except for explicit, audited admin reopening with a new corrective cycle; retain the original closure history.

## 3. State, access, and communication

Keep citizen report progress compatible: submitted -> under_review -> assigned -> in_progress -> resolved.

Use separate disposition (active, duplicate, rejected, referred), information-request records, routing states (pending, accepted, declined, cancelled), proposal-review states, collaboration states, milestone review states, and project closure state. Do not overload the five citizen statuses. Rejected/referred/duplicate dispositions must be displayed prominently; the old progress value must not imply ongoing work.

Maintain a public progress timeline distinct from restricted audit logs/internal comments. Citizens see their own report, public updates, and information requests. Coordinators see their institution's assignments; project members see only authorized material. Admin sees review/assignment/outcome data. For the MVP government monitoring is an admin screen; add a separate read-only permission later, not shared admin credentials.

Persist in-app notifications for review questions, assignments, decisions, invitations/offers, evidence reviews, advancement, and closure. Insert an outbox event with the business transaction; a worker delivers notifications idempotently. REST inbox/timeline are authoritative. Push/email/socket delivery can be added later. Worker failures must not undo a saved report or authorized decision.

## 4. Persistence and API contracts

Extend current collections rather than creating a competing application. Suggested records: institutions with capability profiles; institution memberships; submissions; analysis jobs/results; routing assignments; projects; project memberships; proposal revisions; collaboration invitations/offers; milestone evidence/reviews; deliverables/test/IP records; comments/information requests; outcomes; audit events; outbox/notifications; upload metadata.

Keep existing client-facing ID formats stable: do not silently replace UUID project IDs with Mongo ObjectIds. Add stable foreign references and unique constraints, especially one project per submission and one pending routing assignment per submission. Decide legacy UniversityChallenge migration explicitly: it can become a routing-history record, but copied descriptions must not become a second editable source of truth.

Transactions are required for routing/capacity reservation, acceptance/project creation, membership grants, milestone/report updates, and closure. Use an isolated replica-set test database. Check expectedVersion in the database write filter; an in-memory check followed by save is insufficient. Make actions safely retryable and return 409 for stale edits.

Before implementation update docs/openapi.yaml with bodies, response fixtures, permissions, pagination, errors, and idempotency rules. Keep /api and the existing response envelope. Preserve /submissions for web/mobile compatibility. Proposed contract additions (not existing guarantees):

- Institution capability/roster APIs and university recommendation retrieval.
- Admin submission detail, persisted moderation actions, and POST /admin/submissions/:id/route.
- University assignment inbox/decision and clarification APIs; keep or version current /university/challenges routes deliberately.
- GET /projects for authorized lists; GET /projects/:id/board; project memberships and proposal revisions/reviews.
- Published opportunities, invitations, /industry/collaboration-requests and /university/collaboration-requests.
- POST /projects/:id/milestones/:targetStage/evidence; separate evidence-review and advance operations referencing immutable review IDs.
- POST /admin/projects/:id/close with actual outcome validation; explicit reopen operation.
- Scoped timeline, comments, notifications, audit, analytics, and CSV export.

Private evidence must use authorized attachment access. Inspect current Cloudinary storage: hiding a public URL in the UI does not make the asset private. Classify citizen/public/project/IP attachments and configure appropriate restricted delivery before claiming private evidence support. Do not treat arbitrary submitted URLs as owned uploads.

## 5. Current code findings to address

Read-only inspection on planning date found:
- Institutions only store name/type/account status; expertise and capacity profiles are missing.
- Routing requires admin-supplied team members, copies the report, and prevents another routing attempt after a decline.
- Acceptance requires a complete proposal; project/report writes are separate.
- Admin audit returns an empty array; moderation decisions are not durably modeled.
- Evidence is overwritten per stage; approval advances the project automatically.
- Optimistic checks are performed before save rather than atomic writes in several routes.
- Industry discovery lists all non-deployed projects with every support need, without a proposal-publication gate.
- Closure uses separate writes and lacks a full history/reopen flow.
- Existing frontend contract/navigation issues from the prior handoff must be rechecked after the frontend restoration.
- There is a pre-existing local edit to industry.routes.ts. Preserve and inspect it; do not reset it.

Existing successful builds and 14 older backend tests are not proof of this lifecycle. No new runtime behavior was tested while preparing this plan.

## 6. Luna task sequence and gates

Each row is a task card to implement separately. Backend behavior and tests precede its screen integration. If a row is too large for one verified change, split it into backend and UI cards rather than generating everything at once.

| Task | Deliverable | Acceptance evidence |
|---|---|---|
| 01 | Inspect repo, preserve local work, freeze contracts/state/access rules, document legacy migration | OpenAPI fixtures and checklist; no accidental breaking web/mobile contract |
| 02 | Institutional profiles and verified roster, profile editor | Suspended/pending institutions excluded; wrong-institution edits denied |
| 03 | Transactional workflow services, uniqueness/version helpers, audit/outbox | Rollback tests and stale-version conflicts; no partial outcomes |
| 04 | Persistent moderation, report detail, clarification and disposition UI | Decisions survive reload; reply returns to queue; originals preserved |
| 05 | Durable classification jobs and rules baseline | Submission succeeds with failed analysis; retry is deduplicated; labeled fixtures |
| 06 | Explainable university matcher and audited routing UI | Relevant top matches; no-match queue; capacity/routing races handled |
| 07 | University acceptance/decline/clarification and atomic project creation | One project under concurrency; declined report can be rerouted |
| 08 | Authorized project list, team roles and proposals | Second device can find project; proposal history and mentor/admin reviews work |
| 09 | Industry profiles, published opportunities, matching and invitations | Unpublished/private details hidden; actual support needs shown |
| 10 | Offers, contribution details, acceptance/access and partner workspace | Industry self-approval denied; membership created once; accepted partner access retained |
| 11 | Milestone evidence revisions, admin review, lead advancement and records | Skips/stale edits/old approval reuse fail; funded gate supports in-kind resources |
| 12 | Deployment handoff, outcome validation, atomic closure and reopen | No premature closure; citizen report updates; closure history preserved |
| 13 | Persistent notifications/public timeline across web/mobile | Correct recipients only, no private leakage, repeated events do not duplicate inbox items |
| 14 | Government analytics and CSV | Seed counts reconcile; domain/district/institution filters agree; stage funnel uses history |
| 15 | Real AI adapter and evaluation after rules/manual workflow | Invalid/provider failures fall back safely; accuracy/errors recorded on labeled examples |
| 16 | Full browser/phone regression, migration rehearsal and demo guide | Fresh test setup completes lifecycle across roles and existing citizen app |

Analytics definitions: count distinct submissions separately from duplicate-linked reports; active projects exclude closed projects; engaged institutions are distinct institutions with accepted assignments/offers; funnel counts distinct projects ever reaching a stage from history; closure rate uses a documented submission/project cohort. Record patents/startups as explicit verified outcome records, never inferred from a deployed project. Sum cash commitments only within a currency and separate pledged from confirmed/delivered amounts. Do not add incompatible impact units or double-count beneficiaries across unrelated metrics.

Gate A after 07: phone/web submission is reviewed, matched, accepted, and creates one project. Gate B after 10: approved proposal attracts an accepted partner with correct access. Gate C after 12: evidence-controlled delivery resolves the original report. Final gate after 16: notifications, analytics, AI failure fallback, and citizen app compatibility verified.

## 7. Concrete demonstration

Use synthetic institutions and accounts, not real credentials or production test writes. Example: village water wastage reported with photos and district. Classify as water resources with instrumentation/environment capabilities. Admin validates and chooses an eligible university with a water lab. Coordinator accepts, forms a civil/electronics team, and submits a leak-monitoring proposal. A sensor MSME offers equipment/mentoring and a CSR partner offers resources. University accepts. Prototype tests, pilot readings, deployment handoff, and outcome evidence pass review. Admin validates lower measured water loss and resolves the report; the citizen sees the result.

Demonstrate negative paths too: unclear location, duplicate candidate, unmatched report, university decline, no industry offer, rejected evidence, stale concurrent action, and citizen dissatisfaction. The workflow must remain usable in each case.

## 8. Reusable Luna instruction

Implement only CivicX task [NUMBER] from docs/institutional-workflow-plan.md. Read repository instructions, current code, relevant OpenAPI contracts and fixtures first. Preserve the existing React/TypeScript website, Express/TypeScript backend, Flutter citizen app, restored visual design, and pre-existing local changes. Use existing modules and services; do not invent incompatible endpoints or statuses. Build the backend behavior and meaningful permission/concurrency/failure tests before connecting screens. Never use mock success or hardcoded empty results to hide unfinished work. Use isolated synthetic test data, never destructive tests on shared Atlas. Run checks appropriate to the task. Report files changed, actual checks/results, and unresolved dependencies. Update the task checklist only when its acceptance evidence passes. Do not push/deploy or run production migrations unless explicitly requested.

First assignment: task 01 only. Create detailed task cards for the subsequent rows with prerequisites, scoped files, request/response examples, success/failure cases, checks, and completion evidence. No feature code until the state machine, contracts, and migration strategy are recorded. Then implement subsequent cards in order when instructed.
