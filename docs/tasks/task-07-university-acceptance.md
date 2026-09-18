# Task 07 - university assignment decisions and atomic project creation

Status: implemented and verified on 17 September 2026.

## Scope

Task 07 replaces the old copied challenge acceptance path for newly routed
reports. A university receives a durable routing assignment, then accepts,
declines, or requests clarification. Acceptance creates the first project in
the `proposed` stage and makes the coordinator the initial project lead. Team
roster completion and proposal authoring are subsequent tasks.

## Backend deliverables

- `GET /api/university/assignments` lists assignments only for the authenticated
  university institution and includes a safe report summary.
- `POST /api/university/assignments/{assignmentId}/decision` supports
  acceptance, decline with reason, and clarification requests with
  `expectedVersion`.
- Acceptance atomically claims the pending assignment, creates exactly one
  UUID project, updates the source report to `assigned`, records the proposed
  stage, and transfers the capacity reservation into the project workload.
- A coordinator is the initial project lead; no invented mentor or student
  roster is required at acceptance.
- Decline marks the assignment inactive, releases its capacity reservation, and
  leaves the report available for an explicit administrator reroute.
- Clarification keeps the assignment pending, records the question, increments
  its version, and holds the reservation until a final decision.
- Repeating an accepted decision returns the existing project instead of
  creating another project. Concurrent acceptance attempts produce one project
  and one stale-decision conflict.
- Existing `UniversityChallenge` endpoints remain readable for legacy records;
  new routed reports use `RoutingAssignment` and the new assignment endpoints.

## Atomicity and local development

Atlas/replica-set deployments use the MongoDB transaction helper for assignment,
project, report, capacity, audit, and timeline changes. The local standalone
MongoDB fallback uses the same atomic assignment version filter, unique project
key, and reservation updates so local development remains runnable; production
must use a replica set or Atlas.

## Verification

- Tests prove institution-scoped inbox access, acceptance and project creation,
  idempotent acceptance retries, concurrent acceptance protection,
  clarification persistence, decline capacity release, and explicit rerouting.
- Backend build, lint, and the complete Vitest suite pass.

Next task: Task 08, authorized project lists, verified team memberships, and
proposal revisions/reviews.
