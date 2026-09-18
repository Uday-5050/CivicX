# Task 06 - explainable university matching and administrator routing

Status: implemented and verified on 17 September 2026.

## Scope

Task 06 turns verified university capability profiles into recommendations for
an administrator. Matching is deterministic and explainable while the LLM
adapter remains optional. A recommendation never assigns a report by itself;
the administrator selects the university and active department and creates a
durable routing assignment.

## Backend deliverables

- `GET /api/admin/university-recommendations/{submissionId}` returns up to three
  eligible universities, scores, score components, reasons, departments, and
  capacity snapshots.
- Candidates require an active university, a verified profile, `acceptingWork`,
  available capacity, and at least one domain, expertise, facility, or service
  area match.
- The default explainable score is domain fit 40, expertise 30, facilities 15,
  service area 10, and available capacity 5. Missing fields earn zero points.
- `RoutingAssignment` preserves assignment history, selected department,
  match snapshot, administrator, status, version, and reason for an override.
- `POST /api/admin/submissions/{submissionId}/route` requires a reviewed active
  report, a verified active university department, and an explicit reason when
  routing outside the recommendations.
- Capacity is reserved with an atomic database update. A unique active
  assignment constraint and capacity race tests prevent duplicate routing or
  oversubscription.
- Admin submission detail now includes routing history, and routing writes an
  audit event plus a public timeline activity.

## Safety and permission rules

- Only administrators can view recommendations or create routing assignments.
- AI or rules suggestions never change report status, assign an institution, or
  create a project.
- Administrators do not invent faculty or student rosters during routing. The
  receiving university will evaluate the assignment and form its team in the
  next task.
- No-match reports remain in the administrator queue. An override requires a
  recorded reason.
- Suspended, pending, unverified, non-accepting, and full institutions are
  excluded.

## Verification

- Tests prove score explanations, durable routing history, duplicate assignment
  rejection, no-match filtering, and concurrent capacity protection.
- Backend build and the complete Vitest suite must pass.

Next task: Task 07, university assignment decisions and atomic project creation.
