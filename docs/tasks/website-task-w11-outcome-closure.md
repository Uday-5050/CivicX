# Website task W11 — outcome validation and closure

Status: complete

W11 completes the final project gate on the website. Administrators can validate a deployed project against a measured outcome, resolve the linked citizen report atomically, inspect append-only closure history, and reopen a closed project for a corrective cycle. Authorized project users see the validated outcome, while citizens see a safe public projection without private delivery links or internal project data.

## Deliverables

- Added the administrator outcome and closure panel with project selection, deployment readiness, baseline/target/result/unit fields, measurement dates, method, beneficiaries, evidence links, validation note, and optimistic version handling.
- Added administrator reopen controls with a required corrective-cycle reason and visible close/reopen history.
- Added the validated outcome summary to the authorized project board. Closed projects continue to respect the existing read-only controls.
- Added a citizen tracker outcome projection after closure. It exposes the measured result, dates, method, beneficiaries, validation note, and evidence count; raw delivery links and internal actor identifiers remain server-side.
- Added client contract coverage for closure history, close, and reopen requests. Existing backend closure tests continue to cover atomic report resolution, deployment prerequisites, stale versions, duplicate closure, read-only behavior, reopen, and preserved history.

## Contract and permission behavior

- The existing administrator routes remain the source of truth: `GET /api/admin/projects/:id/closures`, `POST /api/admin/projects/:id/close`, and `POST /api/admin/projects/:id/reopen`.
- Closure requires deployed stage, approved deployed evidence, an open linked citizen report, complete outcome data, at least one evidence URL, and the current project version.
- Closing updates the project and report in one transaction and records a closure activity event. Reopening returns the report to `in_progress`, starts at `piloted`, and appends history without deleting the original closure.
- Citizen detail responses include only the public outcome projection for a closed linked project. Private outcome evidence URLs are represented by a count rather than returned to the citizen tracker.

## Acceptance evidence

- Client build passes.
- Client tests pass, including strict closure-history, close, and reopen payloads.
- Backend build passes.
- Targeted closure tests pass.
- Lint completes with existing non-blocking React warnings and no errors.
- `git diff --check` completes without whitespace errors.
- No deployment, push, production data write, or credential change is part of W11.

## Follow-up

W12 should connect persistent notifications and public timeline delivery to the new close/reopen and milestone events, then add notification deduplication and reconnect behavior without making REST secondary to sockets.
