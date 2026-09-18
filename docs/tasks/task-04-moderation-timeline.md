# Task 04 - durable moderation, information requests, and public timeline

Status: implemented and verified on 17 September 2026.

## Scope

Task 04 makes administrator moderation durable and gives citizens a safe way
to inspect the progress of their reports. It does not implement AI jobs,
university matching, routing, or project acceptance.

Implemented:

- submission disposition: `active`, `duplicate`, `rejected`, and `referred`;
- durable moderation records for every administrator decision;
- admin submission detail with original report, moderation history,
  information requests, and full internal timeline;
- administrator review actions for review, information request, duplicate,
  rejection, referral, and restoration;
- citizen-owned detail, public timeline, information-request list, and reply;
- a redacted unauthenticated public timeline for active reports;
- duplicate links that preserve both the original and duplicate report;
- existing moderation queue actions now also create durable records.

## Endpoints

Administrator:

- `GET /api/admin/submissions/{submissionId}`
- `POST /api/admin/submissions/{submissionId}/review`
- existing `POST /api/admin/moderation/{submissionId}` (now durable)

Citizen:

- `GET /api/submissions/{submissionId}`
- `GET /api/submissions/{submissionId}/timeline`
- `GET /api/submissions/{submissionId}/information-requests`
- `POST /api/submissions/{submissionId}/information-requests/{requestId}/reply`

Public:

- `GET /api/public/submissions/{submissionId}/timeline`

## Permission and safety rules

- Administrators see the full report, private attachments, moderation records,
  private activity, and information-request answers.
- Citizens can access only their own report and can answer only their own open
  information requests.
- Public timelines include only active reports and public activity fields. They
  never expose attachments, private moderation notes, request answers, or actor
  identities.
- Duplicate reports remain intact and link to the selected original; no report
  is deleted or merged automatically.
- A resolved report cannot be moderated again unless a future explicit reopen
  flow is added.
- Information requests do not create a new progress status; requesting more
  information moves a submitted report to `under_review` and preserves the
  existing progress state thereafter.
- Reply updates are atomic on `status: open`, so a repeated reply returns 409.

## Verification

- Backend build passes.
- Focused moderation tests prove durable information requests, citizen
  ownership, reply concurrency, duplicate preservation, public redaction, and
  admin-only detail access.
- The complete backend suite continues to pass.

Next task: Task 05, durable classification jobs and deterministic AI fallback.
