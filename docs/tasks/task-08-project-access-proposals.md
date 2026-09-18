# Task 08 - project access, verified teams, and proposal revisions

Status: implemented and verified on 17 September 2026.

## Scope

Task 08 gives project members a durable, institution-scoped team roster and
adds proposal history without changing the project milestone state machine.
Projects are visible through active membership (with administrator access to
all projects); an industry user remains visible only when an accepted
collaboration record grants access. Proposal content is immutable by revision,
and only an administrator can review a submitted revision.

## Backend deliverables

- `GET /api/projects` lists projects visible to the authenticated user.
- `GET /api/projects/{projectId}/members` returns safe user and role details
  for the authorized project audience.
- `POST /api/projects/{projectId}/members` lets an institution's project lead
  add a verified roster member as `lead`, `mentor`, or `student`.
- Team additions require an active institution membership, matching
  institution ownership, valid roster-role mapping, and `expectedVersion`.
  Duplicate users and multiple leads are rejected.
- Acceptance from Task 07 creates the coordinator's initial `lead`
  membership. The new membership collection is unique per project and user.
- `GET /api/projects/{projectId}/proposals` returns proposal revisions and
  their review history in newest-first order.
- `POST /api/projects/{projectId}/proposals` lets an authorized lead or mentor
  create the next immutable revision with approach, timeline, beneficiaries,
  root cause, work plan, risks, resources, and optional budget details.
- `POST /api/projects/{projectId}/proposals/{proposalId}/review` lets an
  administrator approve or return a submitted revision and records the review
  author and note. Approval does not advance a project milestone.

## Safeguards

- Cross-institution users, inactive memberships, students authoring proposals,
  and unauthorized project readers receive a permission error.
- Proposal revision numbers are unique per project; review records reference
  the exact proposal revision.
- Project team updates use optimistic version checks and atomic membership
  uniqueness checks. Atlas/replica-set deployments use MongoDB transactions;
  the local standalone fallback relies on those compare-and-set and unique
  constraints.
- Existing legacy `UniversityChallenge` routes remain readable. New routed
  reports use the project membership and proposal records above.

## Verification

- Tests prove member-only project visibility, verified roster additions,
  duplicate-member rejection, lead/mentor proposal authorisation, immutable
  revision history, and administrator-only proposal review.
- Backend build, lint, full Vitest suite, and `git diff --check` must pass.

Next task: Task 09, industry opportunity publishing, support offers, and
university decisions that grant project access exactly once.
