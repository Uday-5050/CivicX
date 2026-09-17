# Government portal backend

Open `http://localhost:5173/#/government`. Run the frontend with `npm run dev` in
`client` and the API with `npm run dev` in `server/backend`.

## Create an account

Government accounts cannot be created through public citizen registration.
An administrator can POST `{name,email,password}` to `/api/government/accounts`
with an administrator bearer token. For initial provisioning, run this from
`server/backend` in PowerShell:

```powershell
$env:GOVERNMENT_NAME = 'Government Officer'
$env:GOVERNMENT_EMAIL = 'your-email@example.org'
$securePassword = Read-Host 'Government account password' -AsSecureString
$env:GOVERNMENT_PASSWORD = [System.Net.NetworkCredential]::new('', $securePassword).Password
try { npm run create:government } finally { Remove-Item Env:GOVERNMENT_PASSWORD }
```

The command uses the configured MongoDB database, hashes the password, and refuses
to overwrite existing accounts. No default credentials are shipped. Government
users use the existing `/api/auth/web/login`, refresh, logout and `/api/auth/me`
routes. Suspended accounts cannot access the dashboard.

## API

All routes below have prefix `/api/government` and require an active government
or administrator bearer token; account creation additionally requires admin.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/kpis` | Challenge, project and institution totals |
| GET | `/domains` | Challenge counts by domain |
| GET | `/districts` | District totals and partner counts |
| GET | `/universities` | University assignments, proposals and outcomes |
| GET | `/industry` | Partner engagement and recorded metrics |
| GET | `/projects` | Existing university projects and review versions |
| GET | `/projects/:id` | Project proposal, stage and review history |
| POST | `/projects/:id/reviews` | Save feedback and stage atomically |
| PATCH | `/projects/:id` | Set district and industry partner |
| PATCH | `/institutions/:id/metrics` | Record engagement/outcome metrics |
| GET | `/trends` | Six calendar months of submissions and project deployments |
| GET | `/challenges` | Citizen submissions and university challenges |
| GET | `/activity` | Latest 50 submissions, project starts and reviews |
| POST | `/reports/export` | CSV export, returned as `{url,filename}` |
| POST | `/accounts` | Admin-only account provisioning |

Project IDs are the embedded project UUIDs returned by `/projects`, not challenge
MongoDB IDs. Review body:

```json
{"version":2,"stage":"pilot","feedback":"Pilot evidence reviewed."}
```

Stages: `submitted`, `under_review`, `in_progress`, `pilot`, `deployed`.
Reviewers may move a project back to an earlier stage with an explanation.
Each review records the authenticated reviewer and timestamp. Concurrent or stale
writes return 409; reload the project to obtain its current version. Missing
projects return 404. No review can be changed or deleted through this API.

Metadata body: `{version,district,industryId?}`. A partner must be an active industry
institution; pass `null` to remove it. Institution metrics accept any subset of
`patents`, `startupsIncubated`, `fundingLakhs`, `mentorshipHours`, `sector`, and
`industryType` (`large`, `startup`, `msme`, `csr`, `unclassified`). Numbers must be
nonnegative; outcome counts must be integers.

Export body: `{reportType:"summary"|"detailed"|"district"}`. CSV strings are quoted
and formula prefixes escaped. The frontend download button consumes the data URL.

## Data semantics and current boundaries

- Projects come directly from accepted university challenges; no duplicate project
  collection or demo data is introduced. Existing projects default to `in_progress`.
- Administrators can supply optional `district` and `industryId` when creating
  university challenges through `/api/university/challenges`.
- Citizen reports do not store structured districts or university assignments.
  They appear as `Unspecified` / `Not assigned`; private addresses and submitter
  identities are excluded. Citizen reports and university assignments are separate
  records and are both counted, because the existing schema has no link between them.
- Patent, startup, funding and mentorship metrics default to zero until recorded;
  industry classification defaults to `unclassified`. KPI percentage change is
  currently zero (shown as a dash); historical KPI snapshots are not stored.
- Trends count submissions by creation date and reviewed project deployments by
  deployment review date. Historical citizen resolution dates are not available.
- Government review and metric mutation endpoints are implemented; the existing
  frontend remains a monitoring dashboard and does not yet have review forms.
- Dashboard calculations read current collections in memory. Large production
  datasets will need database aggregation and pagination.

`npm test` uses isolated disposable local MongoDB databases. Government tests cover
access control, account login/refresh, suspension, live data mapping, concurrent
reviews, metrics, metadata and CSV reports. They never use the configured app DB.
