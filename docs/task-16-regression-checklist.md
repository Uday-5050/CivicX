# CivicX Task 16 regression checklist

Run the automated checks first. Then record the browser and phone checks against a disposable staging database.

## Automated gate

- [ ] `cd server/backend && npm test`
- [ ] `cd server/backend && npm run build`
- [ ] `cd server/backend && npm run migration:rehearse` (read-only JSON report)
- [ ] `cd client && npm run build`
- [ ] `cd client && npm run lint` (existing warnings are recorded, not hidden)
- [ ] `git diff --check`

## Browser role flows

- [ ] Citizen registers/logs in, submits a report with a location and optional attachment, refreshes, and sees the same tracking ID.
- [ ] Citizen retries the same idempotency key and gets the existing report; a probable duplicate warning creates no record until explicitly confirmed.
- [ ] Admin reviews, corrects category/priority, requests information, restores the queue, and routes to a verified accepting university.
- [ ] University coordinator sees only its assignment, accepts it, adds verified mentor/student members, submits a proposal, and sees proposal history.
- [ ] Admin approves or returns the proposal; only an approved project publishes the actual industry needs.
- [ ] Industry sees the redacted opportunity, submits a contribution offer, and cannot approve its own offer.
- [ ] University accepts the offer once; the accepted partner can open the project while unrelated industry accounts receive 403.
- [ ] Lead submits evidence for only the next milestone. Admin review does not advance the stage; lead advances using the approved review ID.
- [ ] Rejected evidence, stale expected versions, old review IDs, and skipped stages show a recoverable error and leave state unchanged.
- [ ] Admin validates deployment outcome and closes; the citizen sees the resolved status, public result, and notification. Reopen creates a corrective cycle and preserves closure history.
- [ ] Admin analytics and CSV export agree with the visible project/report totals.

## Phone/citizen app flows

- [ ] Login, refresh after an expired access token, logout, and account suspension behave safely.
- [ ] Guided report form handles camera/gallery/document denial with manual attachment/location fallback.
- [ ] Draft survives app restart; connectivity returning does not auto-submit. Submission and retry require an explicit tap.
- [ ] Upload failure keeps the draft and exposes retry; a successful upload appears in the website report.
- [ ] Timeline, information request reply, notification inbox, unread count, profile, language switch, and password change work.
- [ ] Private project material is never shown in the citizen app; only public progress and outcome are visible.

## Negative-path evidence to record

Unclear location, no university match, university decline and reroute, no industry offer, rejected evidence, stale concurrent action, private attachment access, suspended account, and citizen dissatisfaction/corrective reopen.

Record the environment, commit, browser/device, date, and any failed step below before release.

| Run | Environment | Browser/device | Result | Notes |
|---|---|---|---|---|
| | | | | |
