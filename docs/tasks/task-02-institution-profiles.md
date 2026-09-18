# Task 02 - institution capability profiles and verified rosters

Status: implemented and verified on 17 September 2026.

## Scope

Task 02 establishes the institution data that later matching and routing tasks
will consume. It does not implement matching, routing, project assignment,
industry offers, or frontend screens.

Implemented:

- capability profile fields for domains, expertise, facilities, service areas,
  departments, project capacity, and accepting-work status;
- explicit `draft` / `verified` profile status;
- verified institution memberships with coordinator, mentor, student, and
  partner roles;
- admin profile verification and roster management;
- institution-scoped profile and active-roster reads;
- onboarding membership creation and activation when an administrator approves
  an institution request.

## Endpoints

Institution users (`university` or `industry`) can use:

- `GET /api/institutions/me/profile`
- `PATCH /api/institutions/me/profile`
- `GET /api/institutions/me/roster`
- `GET /api/institutions/{institutionId}/profile` for their own active institution
- `GET /api/institutions/{institutionId}/roster` for their own active institution

Administrators can use:

- `PATCH /api/admin/institutions/{institutionId}/profile`
- `GET /api/admin/institutions/{institutionId}/roster`
- `POST /api/admin/institutions/{institutionId}/roster`
- `PATCH /api/admin/institutions/{institutionId}/roster/{userId}`

All responses use the existing `{success, data, meta}` envelope.

## Permission and safety rules

- Pending or suspended institution accounts cannot use institution endpoints.
- Non-admin users cannot read or modify another institution's profile or roster.
- Only an administrator can mark a profile verified or activate a roster
  membership.
- A user must already belong to the target institution before an administrator
  can add them to its roster.
- Active membership is returned only when both the institution and user account
  are active. Admin roster reads include inactive records for review.
- Profile verification is blocked for pending or suspended institutions.
- `acceptingWork` is stored separately from verification; future matching must
  require both an active institution and a verified profile.

## Acceptance evidence

- Backend build passes.
- The new institution test suite proves profile updates, admin verification,
  cross-institution denial, suspended-institution denial, wrong-institution
  roster denial, active-roster filtering, and pending verification rejection.
- Existing health, submission, and university suites continue to pass.

## Next task

Task 03: transaction helpers, atomic version/uniqueness helpers, audit events,
and notification outbox. Do not add matching or routing logic to this task.
