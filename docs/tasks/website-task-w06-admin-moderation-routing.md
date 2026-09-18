# Website task W06 — admin moderation and routing

Status: complete

## Objective

Give administrators a focused, auditable workspace for reviewing a citizen report, recording a moderation decision, inspecting explainable university recommendations, and routing an eligible report to an active department.

## Verified backend boundary

- `GET /admin/moderation` supplies the open queue.
- `GET /admin/submissions/:id` supplies the original report, attachments, moderation history, information requests, activity timeline, and routing history.
- `POST /admin/submissions/:id/review` accepts only the strict decision fields and requires a question for information requests or a related report ID for duplicate decisions.
- `GET /admin/university-recommendations/:id` returns a `{ submissionId, candidates, noMatch }` envelope. Each candidate includes score components, active capacity, reserved assignments, and active departments.
- `POST /admin/submissions/:id/route` requires an institution and department. The server verifies account/profile readiness, department activity, capacity reservation, recommendation eligibility, and duplicate assignment conflicts.

## Deliverables

- Added `AdminModerationWorkspace` to the administrator page without replacing the existing overview, institution readiness, or audit panels.
- Added searchable queue selection and original report detail with status, disposition, domain, category, priority, attachment links, and activity timeline.
- Added explicit review controls for reviewed, information requested, duplicate, referral, rejection, and restoration decisions. Conditional required fields match the server contract.
- Added recommendation retrieval and candidate cards showing score, positive match factors, department options, and available capacity. A no-match response is shown as a real state.
- Added explicit university routing with department selection and optional context. Existing pending/accepted routing is shown instead of offering a second active route.
- Preserved the form and selections after validation, authentication, capacity, or conflict errors so the administrator can correct or retry deliberately.
- Added typed recommendation-envelope support and client contract tests for review, recommendations, and routing payloads.

## Permission and workflow behavior

- The page is rendered only for authenticated `admin` accounts; the API remains the authority for every permission check.
- Review actions do not delete or merge a citizen report. Duplicate links preserve both records.
- Recommendations are advisory. The UI never auto-routes, auto-accepts a university, or treats an empty recommendation list as permission to route silently.
- Routing is offered only after an active report is under review. Server conflicts remain visible when a university has lost capacity, is no longer eligible, or already has an active assignment.
- Attachment links are displayed only when the backend supplies an authorized URL. The page does not infer private storage paths.

## Acceptance evidence

- `npm run build` passes with the new admin workspace.
- Website tests pass, including strict review/routing request bodies and the recommendation response envelope.
- Lint completes with the repository's existing React/style warnings and no blocking error.
- `git diff --check` is clean.
- No backend code, production data, deployment, or push was changed.

## Deferred

- University acceptance and project creation belong to W07.
- Proposal, evidence, milestone, and closure review belong to W08, W10, and W11.
- Browser screenshots and full role-flow checks remain part of the final website verification task.
