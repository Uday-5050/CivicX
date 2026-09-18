# Task 03 - transactions, atomic writes, audit events, and notification outbox

Status: implemented and verified on 17 September 2026.

## Scope

This task adds shared persistence primitives for the remaining institutional
workflow. It does not change routing, university acceptance, milestone, or
industry business rules.

Implemented:

- `withMongoTransaction` for session lifecycle and transaction execution;
- `updateWithExpectedVersion` for atomic optimistic-concurrency updates;
- `createIdempotent` for unique-key retries and concurrent duplicate inserts;
- durable `AuditEvent` records and an admin audit listing backed by MongoDB;
- durable `NotificationOutbox` records with unique deduplication keys;
- outbox enqueue and claim helpers for the future notification worker;
- submission creation now returns the original record for duplicate idempotency
  retries instead of attempting a second insert.

## Verification

- Backend build and lint pass.
- Existing health, submission, university, and institution suites continue to
  pass.
- Focused infrastructure tests prove stale-version conflicts, audit event
  persistence, and duplicate notification retries.
- The rollback test executes when MongoDB reports replica-set transaction
  support. The local standalone test server skips only that branch because
  standalone MongoDB cannot provide multi-document transactions.

## Follow-up constraint

Future multi-record workflow operations must use these helpers. The transaction
helper should not be replaced with a best-effort sequence when MongoDB is
configured for production.

Next task: Task 04, durable moderation, submission detail, information
requests, disposition, and public timeline.
