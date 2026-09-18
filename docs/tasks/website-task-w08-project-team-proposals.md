# Website task W08 — project list, team, and proposals

Status: complete

## Objective

Make project work discoverable through the authorized-project contract, keep team membership permission-based, and provide a revisioned proposal loop between university teams and administrators.

## Deliverables

- Replaced the project board's local-storage-only start with `GET /projects`. A fresh browser now shows authorized project cards and a clear empty state.
- Added hash project selection using `#/projects?project=<id>` while preserving the existing local project handoff for compatibility.
- Loaded board, members, and proposal revisions from their scoped APIs. Users can return to the project list without losing the authorized-project boundary.
- Added verified-roster team selection for university project leads. Students and non-leads see the team but cannot manage it. The server remains authoritative for role eligibility, active roster status, duplicate membership, and optimistic version conflicts.
- Added structured proposal revision forms for approach, timeline, beneficiaries, root cause, work plan, risks, resources, and optional budget/currency. Returned proposals remain visible and can be revised as a new submission.
- Added an administrator proposal review panel with approve/return decisions and required review notes. Review history is shown beside each revision.
- Added API contract coverage for authorized projects, team membership, proposal submission, and administrator proposal review.

## Permission and workflow behavior

- Project access comes from the backend's active membership or accepted industry collaboration. The website does not infer access from account role alone.
- Only an active university project lead can add verified mentor/student roster members. The API still verifies the target's institution and roster role.
- Only active lead/mentor members can submit a proposal. Industry users receive read-only proposal history.
- Acceptance creates the project and lead membership in W07. W08 adds the remaining verified team members afterward; it does not require a finished proposal during acceptance.
- A returned proposal is not overwritten. The university submits a new revision and the administrator reviews the new revision independently.

## Acceptance evidence

- `npm run build` passes.
- Website tests pass, including strict project, team, proposal, and admin-review request bodies.
- Lint completes with non-blocking repository React warnings and no errors.
- `git diff --check` is clean.
- No backend code, production data, deployment, or push was changed.

## Deferred

- Published opportunity and industry support-offer screens belong to W09.
- Milestone delivery, evidence review, and project closure belong to W10/W11.
