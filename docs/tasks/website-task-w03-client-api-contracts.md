# Website Task W03: Client API contracts

Status: complete

## Objective

Give the website a typed, backend-aligned API layer for the institutional lifecycle. This task prepares the feature screens for later work; it does not migrate the screens or change the backend.

## Starting state verified

- The backend already exposes the newer assignment, project, proposal, opportunity, offer, evidence, closure, and analytics routes.
- Several existing website wrappers still targeted the older challenge and collaboration routes.
- Project record and collaboration payloads previously allowed UI-only fields to be sent to strict server schemas.
- The Axios client had no serialized web refresh retry or shared handling for authentication expiry.

## Deliverables

### Typed lifecycle wrappers

The following modules now expose the implemented backend contracts:

- `university.api.ts`: assignments and optimistic assignment decisions.
- `projects.api.ts`: authorized project list, board, members, proposals, evidence, stage advancement, and records.
- `industry.api.ts`: university opportunities, industry support offers, and university offer decisions.
- `admin.api.ts`: submission detail/review, university recommendations, routing, milestone reviews, and closure/reopen actions.
- `institutions.api.ts`: institution profile and roster reads/updates.
- `analytics.api.ts`: filtered analytics and raw CSV export.

Legacy wrappers remain marked deprecated until their screens are migrated in W04/W06/W07/W09. The old institution member read wrapper now reads the supported roster route; its unsupported status mutation fails explicitly instead of pretending that a university user can perform an admin-only action.

### Strict payload boundaries

Client wrappers construct request bodies from the server contract. They do not forward UI-only `author`, `organization`, or `projectTitle` values to strict project record, support offer, or opportunity endpoints. The server remains responsible for derived identity and organization fields.

### Authentication and error behavior

- A non-authenticated API request that receives `401` refreshes once through the web refresh endpoint.
- Concurrent refreshes share one promise, so they do not rotate the refresh session repeatedly.
- A failed refresh clears the access token and dispatches `civicx:session-expired` for the auth context to handle.
- `401`, `403`, `409`, validation, and network errors can be classified with `apiErrorKind`.
- Optimistic lifecycle mutations preserve the thrown `ConflictError`; later screens can keep the user's draft and ask them to refresh before retrying.

## Contract map

| Website operation | Route | Client result |
| --- | --- | --- |
| Review university assignments | `GET /university/assignments` | `UniversityAssignment[]` |
| Decide an assignment | `POST /university/assignments/:id/decision` | assignment, optional project, reuse flag |
| List authorized projects | `GET /projects` | `AuthorizedProjectSummary[]` |
| Read project members/proposals | `GET /projects/:id/members`, `/proposals` | typed membership and revision arrays |
| Publish/request collaboration | opportunity and offer routes | typed opportunity/offer records |
| Submit/advance milestones | project evidence and advance routes | board plus review/evidence result |
| Review/close projects | admin review, closure, and reopen routes | typed review/closure results |
| Analytics | `/admin/analytics`, `/admin/analytics/export.csv` | typed report or CSV text |

## Acceptance evidence

- `npm run build` passes after these API and type changes.
- Website tests pass: 3 test files and 7 tests, including strict payload and conflict behavior checks.
- Lint completes with the repository's existing React/style warnings; no new lint failure was introduced.
- `git diff --check` is clean.
- Screen migration is intentionally deferred: W04 updates shared data access, then W06/W07/W08/W09/W10/W11/W12 connect each workflow screen.

## Out of scope

- No feature screen redesign or route migration.
- No backend schema or production data change.
- No AI provider call is made here; W13 adds the provider adapter after the rule-based workflow is wired.
