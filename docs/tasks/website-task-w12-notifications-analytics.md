# Website task W12 — notifications, timelines, and analytics

Status: complete

W12 connects the persistent notification, public timeline, and analytics contracts to the website. REST remains authoritative after reconnect; polling and visibility/online refresh make the inbox recover without requiring a socket connection.

## Deliverables

- Added notification type metadata derived from the event payload so submission, project, and system preferences work consistently.
- Added unread-count API usage and an unread badge in the authenticated workspace navigation.
- Added periodic inbox refresh plus online, visibility, and notification-event refresh hooks.
- Made notification items actionable: marking one read can deep-link to the citizen tracker or authorized project board using the server-provided payload.
- Kept recipient-scoped read and mark-all actions backed by the existing server checks and durable dedupe keys.
- Connected the administrator analytics contract to a filterable dashboard with report totals, active/closed projects, closure rate, stage funnel, domain totals, and CSV download.
- Kept public submission timelines redacted and rendered the authenticated citizen timeline from the owner-scoped detail response.

## Contract and permission behavior

- `GET /api/notifications`, `/unread-count`, `/read-all`, and `/:notificationId/read` remain the source of truth. Notifications cannot be read or changed by another recipient.
- Notification payloads carry only scoped `submissionId` or `projectId` deep-link identifiers; the client never infers access from a notification alone.
- The public timeline endpoint continues to return only active reports and public activity. Private moderation and internal project events stay excluded.
- Analytics uses `/api/admin/analytics` and `/api/admin/analytics/export.csv`, with the same domain, district, institution, and date filters for the on-screen report and CSV.

## Acceptance evidence

- Client build passes.
- Client tests pass, including notification inbox, unread-count, read, mark-all, and existing timeline contracts.
- Backend build passes.
- Targeted notification/timeline tests pass, including deduplication, recipient isolation, read state, and private timeline redaction.
- Lint completes with existing non-blocking React warnings and no errors.
- `git diff --check` completes without whitespace errors.
- No deployment, push, production data write, or credential change is part of W12.

## Follow-up

W13 should connect the configurable server-side AI provider to the durable classification path, validate provider output against the existing schema, and retain rules fallback when the provider is unavailable.
