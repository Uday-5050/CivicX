# Website task W07 — university assignment inbox

Status: complete

## Objective

Connect the university workspace to the routed assignment contract so an institution can inspect the citizen report, understand the routing match, accept the work, decline with a reason, or request clarification without inventing a proposal before acceptance.

## Deliverables

- Replaced the legacy challenge inbox data path with `GET /university/assignments`.
- Replaced the legacy decision path with `POST /university/assignments/:id/decision` and the required `expectedVersion` field.
- Added assignment filtering by domain and state, with honest empty, loading, and error states.
- Added report detail, location, target department, routing context, match score, and component reasons.
- Added explicit accept, decline, and clarification actions. Declines require a reason; clarification requests require a question.
- Accepted assignments show the project created by the backend and provide a project handoff link. The project lead is the accepting university user; team selection remains W08.
- Conflict responses reload the latest assignment while preserving the response form so stale decisions can be reviewed and retried.
- Added client contract coverage for the assignment list and strict optimistic decision payload.

## Permission and workflow behavior

- The server remains responsible for institution ownership, active institution status, assignment version, and atomic acceptance.
- Acceptance sends only `decision` and `expectedVersion`; the UI does not require a finished proposal or fabricate team members.
- Decline releases the server-side routing reservation. A clarification request keeps the assignment pending and records the question.
- Retried accepted/declined decisions use the backend's idempotent result and do not create a second project.
- Assignment history remains visible after a decision, while actions are hidden once the assignment is no longer pending.

## Acceptance evidence

- `npm run build` passes.
- Website tests pass, including strict assignment list and decision payload checks.
- Lint completes with non-blocking repository React warnings and no errors.
- `git diff --check` is clean.
- No backend code, production data, deployment, or push was changed.

## Deferred

- API-backed project list, URL project detail, verified team picker, proposals, and project-level permissions belong to W08.
- University opportunity publishing and industry offers belong to W09.
