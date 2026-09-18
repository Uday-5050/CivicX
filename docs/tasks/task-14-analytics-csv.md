# Task 14 - administration analytics and CSV export

Status: implemented and verified on 17 September 2026.

## Scope

Task 14 adds a restricted administration analytics report and a CSV export
that use one filtered source cohort. The report follows the definitions in the
institutional workflow plan rather than inferring impact from a project's
current label.

## Backend deliverables

- `GET /api/admin/analytics` returns filtered submission, project, closure,
  domain, district, stage-funnel, institution, collaboration, and cash metrics.
- `GET /api/admin/analytics/export.csv` downloads the same report as an escaped
  CSV with a content-disposition filename.
- Supported filters are `domain`, `district`, `institutionId`, `from`, and `to`.
- `ProjectStageHistory` records durable stage entry once per project and stage.
  Project acceptance, milestone advancement, reopen, and the legacy challenge
  compatibility path write history records. Analytics also uses the current
  stage as a lower-bound fallback for older projects without history.

## Metric definitions

- Distinct submissions and duplicate-linked reports are separate counts.
- Active projects have `closureStatus: open`; closed projects are excluded from
  active totals.
- Engaged institutions are unique institution IDs from accepted assignments or
  accepted support offers.
- The stage funnel counts distinct projects that have durable evidence of
  reaching each stage. Closed projects retain their earlier stage history.
- Closure rate is closed projects divided by the filtered project cohort with a
  linked citizen submission.
- Cash is grouped by currency. Pending offers are pledged, accepted offers are
  confirmed, and delivered remains zero until the product has an explicit
  delivered state. Patents and startups remain zero until explicit verified
  outcome records exist.

## Safeguards and verification

- Both endpoints require an active administrator token.
- Domain, district, and institution filters use the same submission/project
  cohort, so dashboard totals and CSV rows reconcile.
- Tests verify filtered totals, active/closed counts, history-based funnel
  counts, institution engagement, currency-separated cash, CSV headers/content,
  and non-admin denial.
- Backend build, lint, full Vitest suite, client build, and `git diff --check`
  must pass.

Next task: Task 15, configurable real AI adapter and evaluation after the rules
baseline.
