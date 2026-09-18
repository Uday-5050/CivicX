# Website Task W04: Institution readiness

Status: complete

## Objective

Expose the existing institution capability and roster contracts in the website so that institutions can maintain their routing profile and administrators can verify eligibility before matching.

## Verified backend contract

The backend already provides:

- institution profile read/update for an authenticated university or industry account;
- active-roster reads scoped to the caller's own institution;
- administrator profile updates with `draft`/`verified` status;
- administrator roster reads including inactive memberships;
- administrator roster add and patch operations;
- protection against pending/suspended institutions, cross-institution access, and users who do not belong to the target institution.

## Deliverables

- Added typed admin profile and roster mutation wrappers in `admin.api.ts`.
- Added `InstitutionRosterMutationResult` for the smaller mutation response returned by the server.
- Added `InstitutionProfileWorkspace` to Settings for university and industry accounts.
  - edits description, domains, expertise, facilities, service areas, departments, and active project capacity;
  - lets an institution explicitly pause or accept new work;
  - shows verification state and the active roster;
  - explains that verification and roster activation remain administrator decisions.
- Added `AdminInstitutionReadiness` to the administrator workspace.
  - selects an institution;
  - verifies or returns its profile to draft;
  - controls capacity and accepting-work state;
  - adds, activates, or suspends roster memberships through the admin routes.
- Removed the old university self-service roster mutation from Account Extras. The institution Settings page now displays the supported read-only roster, while only the administrator panel can mutate membership status.

## Permission behavior

- Pending institutional users continue to see the onboarding state and cannot reach these profile endpoints.
- Institution users only read or edit their own active institution.
- Administrators can inspect inactive roster records and can activate a member only when the institution and user account are active.
- User IDs are submitted only through the admin roster form; the server remains authoritative for institution membership and account status.

## Acceptance evidence

- `npm run build` passes with the new screens and API types.
- Website tests pass: 3 test files and 7 tests.
- Lint completes with repository React warnings only; no lint error was introduced.
- `git diff --check` is clean.
- No backend code, production data, deployment, or credentials were changed.

## Deferred

The next tasks consume these readiness fields: W06 routing/matching, W07 assignment acceptance, W08 verified team selection, and W09 industry collaboration. This task does not add automatic matching or institution-side approval powers.
