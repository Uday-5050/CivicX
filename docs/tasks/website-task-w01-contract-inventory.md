# Website task W01 — contract and screen inventory

**Date:** 18 September 2026  
**Repository:** `C:/Users/saran/Desktop/civix`  
**Branch:** `feature/institutional-lifecycle-b-fix`  
**Scope:** documentation and verification only. No feature code, production data, push, or deployment changes were made for W01.

## Objective

Freeze the website's screen and API boundary before feature work begins. Every visible action must either call a verified backend route or be recorded as an explicit contract extension. This inventory is the working reference for W02 onward.

## Verified starting state

- The client is a React/Vite/TypeScript application using hash routing in `client/src/App.tsx`.
- The shared client request wrapper uses `VITE_API_BASE_URL || '/api'` and expects the `{ success, data, meta }` envelope.
- The backend mounts routes under `/api` in `server/backend/src/app.ts`.
- Authentication is real API authentication through `/api/auth/web/login`, refresh, logout, registration, onboarding, and password reset. The client has no mock login mode enabled.
- The current working tree already contains intentional work from the previous institutional lifecycle tasks and is dirty. W01 preserves it; it does not reset or clean those changes.
- Existing automated backend and client checks were run before this documentation pass. W01 adds a contract record; it does not claim browser acceptance.
- A visual screenshot baseline was not captured automatically in this pass. The restored website files are the source baseline. W13 must capture repeatable screenshots at 360, 768, and 1440 pixels before visual polish is marked complete.

## Screen map

| Hash route | Visible actions in the current screen | Current client calls | Role guard | W01 finding / next task |
|---|---|---|---|---|
| `#/` | Open services/about sections, register, sign in, government link | None | Public | Landing screen is present. The government link points to a role that is not in the OpenAPI role enum. Resolve in W02/W12. |
| `#/login` | Select citizen/institution, sign in, show password, forgot password | `POST /auth/web/login` | Public | Institution selector maps university and industry together. W02 must make the allowed account behavior explicit and safe. |
| `#/register` | Create citizen account, show password, accept terms | `POST /auth/register`, then web login | Public | Citizen path matches the backend. |
| `#/institution` | Submit institutional onboarding request | `POST /auth/onboard-request` | Public | Current form defaults to university and does not expose the complete institution contract. W02/W04 must handle university and industry onboarding fields. |
| `#/forgot-password` | Request reset link | `POST /auth/forgot-password` | Public | Contract is present. |
| `#/reset-password` | Submit reset token and new password | `POST /auth/reset-password` | Public | Contract is present; link/token UX remains a later polish item. |
| `#/home` | Role-specific entry cards, sign out | Depends on role-specific page | Authenticated | Citizen, university, industry, admin and legacy government branches exist. Government branch must not call unsupported APIs. W02/W12. |
| `#/submit` | Draft locally, describe, locate, attach files, preview rules analysis, review, explicit submit, add follow-up | `POST /submissions/classify`, `POST /submissions`, `POST /submissions/:id/comments` | Citizen | Form behavior is substantially present. Classification preview currently calls the synchronous classify endpoint and the submission route explicitly selects rules. W05/A02/A03. |
| `#/tracker` | List/filter reports, inspect status, classification, attachments | `GET /submissions` | Citizen owner | Owner list exists. Detail timeline, information-request replies, disposition, and public-safe outcome projection are not fully represented. W05/W11. |
| `#/university` | List assignments, inspect report, request information, decline, accept, build proposal | **Current:** `GET /university/challenges`, `POST /university/challenges/:id/decision` | University | This is the main legacy mismatch. Backend's lifecycle contract is `GET /university/assignments` and `POST /university/assignments/:id/decision` with `expectedVersion`; acceptance creates the project without a finished proposal. W03/W07. |
| `#/industry` | Browse projects, request collaboration, track requests | **Current:** legacy `/industry/projects` and `/industry/collaboration-requests` | Industry | Backend also has published opportunities and support offers with stricter payloads and redacted access. Migrate to `/industry/opportunities`, offers, and university offer decisions. W03/W09. |
| `#/projects` | Load board from local storage ID, view milestones, submit evidence, add records | `GET /projects/:id/board`, evidence and record POSTs | University/industry | Project list and URL project ID are missing. Editing is inferred from account role and record payload includes unsupported client fields. Membership-based controls, proposals, review history, and closure are absent. W03/W08/W10/W11. |
| `#/settings` | Read notifications, mark one/all read, manage preferences, view roster extras | `/notifications`, `/notifications/:id/read`, `/notifications/read-all`, institution roster routes | Authenticated | Notification APIs exist. Deep links, unread badge, profile/capability editing, and language parity need the shared shell and W04/W12. |
| `#/admin` | Approve/suspend institutions, resolve/dismiss moderation item, view reports and audit | Basic `/admin/institutions`, `/admin/moderation`, `/admin/reports`, `/admin/audit` | Admin | Current screen does not expose report detail, review decisions, recommendations, routing, proposal/evidence review, closure, or analytics. W03/W06/W10/W11/W12. |
| `#/government` | Government dashboard metrics and exports | **Current:** `/government/*` | Legacy frontend role | Backend exposes `/admin/analytics` and CSV under admin authorization; no `government` role is in the shared OpenAPI contract. Remove or redirect this path in W02/W12. |

## Verified API boundary

All paths below are relative to `/api` and return the standard success/error envelope unless noted. `401`, `403`, `409`, validation errors, and expired-session handling must remain visible to the caller.

| Capability | Verified backend contract | Current website client | Contract status |
|---|---|---|---|
| Web authentication | `POST /auth/register`, `/auth/onboard-request`, `/auth/web/login`, `/auth/web/refresh`, `/auth/web/logout`, `GET /auth/me`, password reset routes | `AuthContext`, `App.tsx` | Existing and usable; W02 checks role selection and onboarding truthfulness. |
| Citizen reports | `POST /submissions`, `GET /submissions`, `GET /submissions/:id`, `GET/POST /submissions/:id/timeline` and information/comment routes | `submissions.api.ts`, `SubmissionWorkspace`, `CitizenDashboard` | Existing, but detail/disposition and asynchronous analysis projection need W05/A03. |
| Public timeline | `GET /public/submissions/:id/timeline` | No dedicated client wrapper | Existing backend route; add only when the screen requires it. |
| Admin review | `GET /admin/submissions`, `GET /admin/submissions/:id`, `POST /admin/submissions/:id/review` | Only basic moderation wrapper | Existing backend; add typed client wrappers in W03 and UI in W06. |
| University matching/routing | `GET /admin/university-recommendations/:id`, `POST /admin/submissions/:id/route` | No client wrapper | Existing backend; W06 must expose reasons, capacity, department, and routing history. |
| University assignments | `GET /university/assignments`, `POST /university/assignments/:id/decision` | Legacy challenges wrappers | Existing newer contract; W03/W07 replace legacy calls. |
| Institution profile/roster | `GET/PATCH /institutions/me/profile`, `GET /institutions/me/roster`, institution profile/roster reads | Partial roster client | Existing backend; W04 adds capability and verified roster UI. |
| Authorized projects | `GET /projects`, `GET /projects/:id/board`, `GET /projects/:id/members` | Only board wrapper | Existing backend; W03/W08 add list, detail, members, and URL navigation. |
| Project team | `POST /projects/:id/members` with `userId`, `role`, `expectedVersion` | No wrapper | Existing backend; W08 must use verified institutional roster and membership permissions. |
| Proposals | `GET/POST /projects/:id/proposals`, admin `POST /projects/:id/proposals/:proposalId/review` | No wrapper | Existing backend; W08 adds revisions and W06/W10 add admin review. |
| Milestone evidence | `POST /projects/:id/milestones/:stage/evidence` | Partial wrapper | Existing backend; W10 must show immutable evidence/review state and conflicts. |
| Milestone review/advance | `POST /admin/projects/:id/milestone-reviews`, `POST /projects/:id/milestones/:stage/advance` | No wrapper | Existing backend; W10 adds separate admin review and lead advance controls. |
| Closure | `GET /admin/projects/:id/closures`, `POST /admin/projects/:id/close`, `POST /admin/projects/:id/reopen` | No wrapper | Existing backend; W11 adds outcome validation and citizen projection. |
| Industry opportunities/offers | `POST /university/opportunities`, `GET /industry/opportunities`, `POST /industry/opportunities/:id/offers`, `GET /university/offers`, `POST /university/offers/:id/decision` | Legacy collaboration wrappers | Newer backend contract is verified; W03/W09 migrate the website. |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/read-all`, `POST /notifications/:id/read` | Basic wrappers | Existing; W12 adds shell badge, deep links, and reconnect refresh. |
| Analytics | `GET /admin/analytics`, `GET /admin/analytics/export.csv` | `government.api.ts` calls unsupported `/government/*` paths | Existing admin contract; W12 replaces the unsupported government client. |
| AI analysis | Current synchronous `POST /submissions/classify`; durable job/result models exist server-side | Draft calls classify on a debounce | Provider and worker are not yet connected to the saved-report path. Proposed routes are listed below and belong to A01–A03. |

## Shared taxonomy decision

The website and API must use one vocabulary. Existing OpenAPI values are the source of truth until a deliberate contract change is reviewed.

### Roles

`citizen`, `university`, `industry`, `admin`.

The client currently contains a `government` role and route. It is not in `docs/openapi.yaml` and does not have matching backend endpoints. Treat it as a compatibility gap, not as an accepted workflow role.

### Citizen report status

The persisted backend report status is:

`submitted → under_review → assigned → in_progress → resolved`

The frontend currently also renders `draft`, but drafts are local browser state and are not persisted as server reports. A draft must not be counted in server analytics or shown as resolved. Disposition remains separate:

`active | duplicate | rejected | referred`

### Routing assignment status

`pending | accepted | declined | cancelled`.

Only an administrator creates a routing assignment. University acceptance is conditional on `expectedVersion`; one active assignment and one project may be created for a source submission.

### Project stage

`proposed → funded → prototyping → piloted → deployed`.

The current project stage is separate from evidence review and closure. Evidence approval does not itself advance the stage. A project lead advances one stage with an approved review ID and expected version.

### Priority and category

Priority is `low | medium | high` in the persisted submission analysis and review schema. The OpenAPI component also lists `critical`; W01 records this inconsistency for W03 rather than allowing the browser to send `critical` to a schema that rejects it.

OpenAPI categories are:

`infrastructure | safety | environment | transportation | community | education | health | governance | other`.

The rules fixture also uses display labels such as `Public services`, `Community development`, and `Infrastructure`. W03 must define the canonical wire value plus display label mapping before the form, AI output, and admin review use category filters.

### Industry support types

`mentorship | funding | prototyping | deployment | technology_transfer`.

Cash offers use integer minor units plus a three-letter currency. In-kind support requires a description. The browser must not send `organization`, `projectTitle`, or other derived fields that the strict offer schemas do not accept.

## Permission matrix for visible workflow actions

| Action | Citizen | University | Industry | Admin | Notes |
|---|---:|---:|---:|---:|---|
| Create own report | yes | no | no | no | Current submission model is citizen-only. |
| Read own report/timeline | own | no | no | all | Private attachments remain authorized downloads. |
| Review and classify report | no | no | no | yes | Admin decision is authoritative over suggestions. |
| View match recommendations and route | no | no | no | yes | AI may suggest; admin chooses. |
| Accept/decline assignment | no | own institution | no | no | Uses expected version; acceptance creates one project. |
| Manage project team | no | project lead | no | no | Verified roster and membership role required. |
| Submit proposal | no | project lead/mentor | no | no | New revision; project must be open. |
| Review proposal/evidence | no | no | no | yes | Proposal returns can be revised; evidence review is separate from advance. |
| Publish opportunity | no | project lead/mentor | no | no | Requires the agreed proposal gate before W09 is enabled. |
| Submit support offer | no | no | active institution | no | Only for a published opportunity and requested support type. |
| Accept support offer | no | verified coordinator/mentor | no | no | Acceptance grants project membership once. |
| Submit milestone evidence | no | project lead | authorized member only when contract allows | no | Current API enforces project lead for formal evidence. |
| Advance milestone | no | project lead | no | no | Requires unused approved review and expected version. |
| Validate outcome and close/reopen | no | no | no | yes | Closure resolves the linked citizen report atomically. |
| Read analytics/CSV | no | no | no | yes | Replace unsupported government calls. |

## Explicit contract extensions to freeze before callers are built

These are not implemented by W01 and must not be faked in the browser:

1. `GET /api/admin/submissions/:id/analysis` — admin-safe job/provider/fallback metadata, current suggestion, and revision history.
2. `POST /api/admin/submissions/:id/analysis/retry` — bounded, idempotent admin retry with expected analysis revision.
3. `GET /api/projects/:id/milestone-evidence` and `GET /api/projects/:id/milestone-reviews` — authorized immutable histories with stable IDs and pagination.
4. A project outcome projection for the citizen report owner that includes validated public outcome data without private IP, team contacts, or unrestricted file URLs.
5. If proposal endorsement, capability invitations, handoff records, or secure downloads are required by the final demo, add them as reviewed extensions to W08/W09/W11 before UI work depends on them.

## W01 acceptance record

- [x] Current route and component map recorded.
- [x] Visible actions mapped to verified, legacy, or explicitly proposed APIs.
- [x] Role and permission boundaries recorded.
- [x] Shared report, routing, project, offer, and analysis states recorded.
- [x] Current UI/API mismatches recorded with the task that will resolve each one.
- [x] Existing dirty files and restored design preserved.
- [ ] Automated visual baseline screenshots — pending manual browser capture for W13 comparison.
- [ ] Browser acceptance of the full lifecycle — intentionally deferred to W14.

## Next implementation task

W02: build the shared website shell and reusable state components, while correcting auth/onboarding navigation. W02 must consume this inventory and must not migrate university, industry, admin, or AI feature calls early.

