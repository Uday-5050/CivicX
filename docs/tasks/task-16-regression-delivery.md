# Task 16 - cross-client regression, migration rehearsal, and demo setup

Status: implemented (automated lifecycle and migration rehearsal complete; browser and Android device checks remain manual).

## Scope

This task proves the existing web/API workflow as one disposable synthetic lifecycle and gives the team a repeatable release checklist. It does not add production migrations, credentials, new workflow states, or a second client contract.

## Deliverables

- `server/backend/tests/task-16-lifecycle.test.ts` drives citizen submission, admin review/routing, university acceptance, proposal review, industry offer/access, all four milestone gates, closure, public timeline, notification, and analytics assertions.
- `server/backend/src/modules/migrations/legacy-challenge-migration.service.ts` performs a read-only legacy `UniversityChallenge` rehearsal. Accepted rows are classified as already mapped, safe to map, or blocked; missing and ambiguous references are never silently duplicated.
- `server/backend/scripts/migration-rehearsal.ts` and `npm run migration:rehearse` run the rehearsal against the configured database and print JSON only. There is no apply flag.
- `docs/task-16-regression-checklist.md` and `docs/demo-guide.md` cover browser, phone, negative-path, and fresh-setup checks.

## Acceptance evidence

- [x] Disposable synthetic API lifecycle reaches `deployed`, closes atomically, resolves the source submission, records a public timeline event, creates one citizen notification, and appears in analytics.
- [x] Migration rehearsal is read-only and reports missing source/project references and ambiguous links.
- [x] Backend build and full backend tests pass; client build and lint are run at the final gate.
- [ ] A human opens the browser workflow and runs the Flutter app on a real phone against staging; record the date/device in the checklist.

## Safe execution

Use a local replica-set test database or a disposable database name. Do not run the rehearsal or demo against production Atlas. Use synthetic accounts from `docs/demo-guide.md`; never commit passwords, access tokens, or provider keys.
