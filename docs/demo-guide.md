# CivicX synthetic demo guide

Use a disposable local or staging database. The automated version of this scenario is `server/backend/tests/task-16-lifecycle.test.ts`.

## Scenario

“Water loss in Ward 4” is submitted by a citizen. The report is classified as Water, reviewed by an administrator, routed to a verified university Water Lab, accepted by its coordinator, and developed with a sensor partner. The project passes evidence review through deployment. The administrator validates a measured reduction in water loss and closes the project. The citizen sees the public result and notification.

## Accounts

Create synthetic accounts with these roles and no real credentials:

- `citizen`: report owner.
- `admin`: review, route, approve evidence, validate outcome.
- `university`: coordinator/lead for a verified, accepting university with a Water Lab and capacity.
- `industry`: partner at an active industry institution.

## Run order

1. Citizen submits a report with title, description, `domain=Water`, `location=Ward 4`, and optional image.
2. Admin reviews it, confirms category/priority, and routes it to the Water Lab.
3. University accepts the assignment. Confirm exactly one project and one lead membership are created.
4. The lead submits a proposal with beneficiaries, root cause, work plan, risks, resources, budget, baseline, and target. Admin approves it.
5. The lead publishes only the required support needs. Industry discovers the redacted brief and submits an offer with responsibilities and either confirmed cash or in-kind detail.
6. The university accepts the offer. Confirm the industry member gains project access once.
7. For `funded`, `prototyping`, `piloted`, and `deployed`, repeat: lead submits evidence → admin reviews the immutable evidence revision → lead advances with the approved review ID and current version.
8. Admin records baseline, target, measured result, unit, dates, method, beneficiaries, deployment evidence, and validation note, then closes the project.
9. Citizen refreshes the tracker and sees `resolved`, the public timeline event, and the notification. Admin checks analytics and CSV.

## Show one failure safely

Submit a stale expected version during a milestone action. The API must return a conflict, the project stage must not change, and a refreshed board must allow the legitimate action. Also show a university decline followed by an explicit admin reroute.

## Migration rehearsal

Run `cd server/backend && npm run migration:rehearse` with a disposable `MONGO_URI`. The command prints counts and per-record decisions and never writes. Any blocked or ambiguous row must be resolved and reviewed before a future migration is designed.
