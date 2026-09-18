# Task 09 - industry opportunities and support offers

Status: implemented and verified on 17 September 2026.

## Scope

Task 09 connects a university project to industry support without exposing
private project material before acceptance. A verified university lead or
mentor publishes a redacted opportunity. An active industry institution can
submit one offer for that opportunity. The university decides once, and an
accepted offer grants project access exactly once.

## Backend deliverables

- `POST /api/university/opportunities` publishes one opportunity for a project
  owned by the university. The publisher must be an active project lead or
  mentor.
- `GET /api/industry/opportunities` returns published, redacted opportunities
  with project title, university name, domain, department, and requested
  support types.
- `POST /api/industry/opportunities/{opportunityId}/offers` records one offer
  per industry institution with responsibilities, message, optional funding
  amount/currency, and optional in-kind details.
- `GET /api/university/offers` lists offers addressed to the authenticated
  university.
- `POST /api/university/offers/{offerId}/decision` accepts or declines an offer
  using `expectedVersion`.
- Acceptance creates an active `industry_partner` project membership for the
  offer creator, updates the project access path, and never advances a project
  milestone. The accepted offer remains the durable authorization record for
  other users from that industry institution.

## Safeguards

- Opportunities are published only for the owning university's project and
  duplicate publication is rejected.
- An industry offer must match one of the opportunity's requested support
  types. The same industry institution cannot submit a second offer for the
  same opportunity.
- University decisions require an active verified coordinator or mentor and an
  optimistic version. Concurrent or stale decisions receive a conflict and
  cannot create a second access grant.
- Project readers gain industry access only after an accepted support offer;
  existing legacy collaboration records remain supported.
- Atlas/replica-set deployments use MongoDB transactions. Local standalone
  development uses the same compare-and-set and unique constraints through
  the transaction fallback.

## Verification

- Tests prove redacted discovery, duplicate publication/offer rejection,
  support-type validation, accepted access, project board visibility, and
  stale decision rejection.
- Backend build, lint, full Vitest suite, and `git diff --check` must pass.

Next task: Task 10, project delivery records, milestone evidence review, and
administrator closure validation.
