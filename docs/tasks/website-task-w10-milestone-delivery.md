# Website task W10 — milestone delivery and evidence review

Status: complete

W10 connects the authorized project board to the milestone workflow. University leads can submit structured evidence for the next stage, administrators can review that evidence, and the lead can advance the project only after an approved review. The website also keeps the evidence and review history visible to users who are authorized to see the project.

## Deliverables

- Added authorized project history reads for milestone evidence and milestone reviews.
- Replaced prompt-based evidence entry with a structured form containing a required note and optional evidence links.
- Added evidence history with pending, approved, and rejected states, reviewer notes, and links.
- Added lead-only stage advancement after an approved, unused review for the next stage. The existing `expectedVersion` check remains authoritative for concurrent edits.
- Added an administrator milestone-review panel alongside proposal review. Administrators can select an authorized project, inspect pending evidence, and approve or reject it with a review note.
- Preserved project membership permissions, closed-project read-only behavior, existing team/proposal/offer records, and the restored website design.

## Contract and permission behavior

- `GET /api/projects/:id/milestone-evidence` and `GET /api/projects/:id/milestone-reviews` return history only to users authorized for that project.
- `POST /api/projects/:id/milestones/:stage/evidence` accepts only evidence for the project's next milestone and only from an active university lead or mentor, as enforced by the backend.
- `POST /api/admin/projects/:id/milestone-reviews` is administrator-only and requires a review decision and note.
- `POST /api/projects/:id/advance` requires an approved review for the requested stage and the current project version. Stale versions, skipped stages, duplicate consumption, and unapproved evidence remain rejected.
- The client does not infer institutional authority from the account role alone; it uses the authorized project response and backend decisions.

## Acceptance evidence

- Client build passes.
- Client tests pass, including the milestone evidence, review, and advance request contracts.
- Backend build passes.
- Targeted milestone tests pass, covering evidence submission, review history, authorization, review consumption, and optimistic advancement failures.
- Lint completes with existing non-blocking React warnings and no errors.
- `git diff --check` completes without whitespace errors.
- No deployment, push, production data write, or credential change is part of W10.

## Follow-up

W11 should add the website outcome validation and closure screens: deployment evidence, baseline/result/unit capture, administrator validation, problem resolution, and the citizen tracker result. Keep closure administrator-only and preserve the same version and audit rules.
