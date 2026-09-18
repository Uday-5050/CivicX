# Task 12 - deployment handoff, outcome validation, closure, and reopen

Status: implemented and verified on 17 September 2026.

## Scope

Task 12 completes the final project gate. An administrator validates the
deployed outcome, resolves the linked citizen report in the same transaction,
and records closure history. A later corrective cycle can be explicitly
reopened with a reason; the original closure remains preserved.

## Backend deliverables

- `POST /api/admin/projects/{projectId}/close` requires a deployed project,
  approved deployed evidence, an open linked citizen report, outcome fields
  (baseline, target, measured result, unit, dates, method, beneficiaries, and
  validation note), evidence links, and `expectedVersion`.
- Closure atomically sets the project closure state to `closed`, stores the
  validated outcome, resolves the citizen report, creates a closure-history
  record, and writes public timeline and audit events.
- Closed projects remain readable but all project mutations are rejected.
- `POST /api/admin/projects/{projectId}/reopen` requires a closed project,
  reason, and `expectedVersion`. It starts a corrective cycle at `piloted`,
  clears the active outcome, returns the citizen report to `in_progress`, and
  records a durable reopen event.
- `GET /api/admin/projects/{projectId}/closures` returns the ordered close and
  reopen history to administrators.

## Safeguards

- Premature closure, missing deployment review, stale versions, duplicate
  closure, and reopening an open project fail.
- Project and citizen-report writes use the transaction helper; Atlas uses a
  MongoDB transaction and local standalone development uses the existing
  compare-and-set fallback.
- Closure history is append-only. Reopening does not erase the original
  outcome or audit record.

## Verification

- Tests prove premature-close rejection, atomic report resolution, closed
  read-only behavior, duplicate-close protection, audited reopen, corrective
  stage reset, and preserved history.
- Backend build, lint, full Vitest suite, and `git diff --check` must pass.

Next task: Task 13, persistent notifications and public timeline delivery.
