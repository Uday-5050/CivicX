# Task 11 - milestone evidence, review, advancement, and project records

Status: implemented and verified on 17 September 2026.

## Scope

Task 11 makes project delivery an evidence-controlled state machine. The
project stages remain `proposed -> funded -> prototyping -> piloted ->
deployed`. A lead submits an immutable evidence revision for the next stage,
an administrator reviews it, and the lead advances with the exact approved
review ID. Review never advances a project automatically.

## Backend deliverables

- `POST /api/projects/{projectId}/milestones/{targetStage}/evidence` stores an
  immutable evidence revision. The lead is required; a compatibility call
  using the current-stage ID is mapped to the next stage for the restored web
  board.
- `POST /api/admin/projects/{projectId}/milestone-reviews` approves or rejects
  one pending evidence revision and records an immutable review. The project
  version changes, but its stage does not.
- `POST /api/projects/{projectId}/milestones/{targetStage}/advance` requires
  the project lead, the next stage, the approved review ID, and the current
  project version. The review is consumed exactly once.
- Entering `prototyping` updates the linked citizen report from `assigned` to
  `in_progress` in the same transaction path.
- Deliverables and test records can be added by active project members,
  including students and accepted industry partners. IP disclosures are
  restricted to university leads and mentors.
- Evidence and review history is stored in `MilestoneEvidence` and
  `MilestoneReview`; the existing project evidence field remains a board
  projection for compatibility.

## Safeguards

- Skipped stages, stale versions, missing reviews, rejected reviews, reused
  approvals, and non-lead evidence/advancement attempts fail.
- A new evidence submission creates a new revision; old approvals cannot
  authorize a later revision.
- Review and advancement are separate operations. Approved evidence leaves
  the current stage unchanged until the lead advances it.
- MongoDB transactions are used when available; local standalone development
  uses the existing transaction fallback and compare-and-set version checks.

## Verification

- Tests prove next-stage enforcement, review without automatic advancement,
  approval consumption, rejected-evidence blocking, report transition at
  prototyping, student records, and restricted IP disclosures.
- Backend build, lint, full Vitest suite, and `git diff --check` must pass.

Next task: Task 12, deployment handoff, outcome validation, atomic closure,
and audited reopening.
