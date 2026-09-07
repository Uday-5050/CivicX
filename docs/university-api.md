# University challenge API

All routes use the standard `{ success, data, meta }` response envelope and require a Bearer access token from the existing authentication API.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | /api/university/challenges | Active university | List challenges assigned to the caller's active institution, newest first |
| POST | /api/university/challenges | Admin | Assign a challenge and eligible team to an active university |
| POST | /api/university/challenges/:id/decision | Active university | Accept, decline, or record an information request |

Create a challenge with an administrator token using the following body (replace institutionId with an approved university's MongoDB ID):

```json
{
  "institutionId": "0123456789abcdef01234567",
  "title": "Improve waste collection routes",
  "summary": "Design and evaluate a route planning pilot.",
  "domain": "Sustainability",
  "priority": "high",
  "department": "Computer Science",
  "organization": "Municipal Corporation",
  "feasibilityNotes": ["Historical collection data is available."],
  "members": [
    { "id": "mentor-1", "name": "Project Mentor", "role": "mentor", "department": "Computer Science", "email": "mentor@example.edu" },
    { "id": "student-1", "name": "Project Student", "role": "student", "department": "Computer Science", "email": "student@example.edu" }
  ]
}
```

The server assigns `id`, `createdAt`, `updatedAt`, `decision: pending`, and `version: 1`. Member IDs must be unique within the challenge. Administrators supply the eligible roster; there is no team-editing endpoint in this frontend contract.

Acceptance body:

```json
{
  "decision": "accepted",
  "version": 1,
  "proposal": {
    "approach": "Build a pilot and measure missed collections.",
    "timeline": "8 weeks",
    "mentorId": "mentor-1",
    "studentIds": ["student-1"]
  }
}
```

Timeline must be `4 weeks`, `8 weeks`, or `12 weeks`. Acceptance requires a nonblank approach, an eligible mentor, and at least one unique eligible student. Decline and information requests use `{ "decision": "declined", "version": 1 }` or `{ "decision": "info_requested", "version": 1 }` without a proposal.

Decisions are allowed only from `pending`, matching the frontend workflow. An atomic conditional update increments version and records the actor and time. Acceptance embeds a durable project `{ id, status: active, createdAt }` alongside the proposal in the challenge document, so project and decision cannot be partially saved. Separate project lifecycle endpoints and notification delivery are outside this contract; information requests are recorded, not emailed.

Errors: 400 invalid payload or team; 401 missing/invalid session; 403 unauthorized role or inactive institution; 404 unknown challenge or challenge assigned to another institution; 409 stale version or already decided. The frontend surfaces failures instead of substituting demo data and reloads after a conflict.

The inbox is empty until an administrator assigns challenges. No demo accounts or records are created automatically. Use the existing institution onboarding and administrator approval routes before signing in as a university.

Verification: `npm run build`, `npm test`, and `npm run lint` in `backend`; `npm run build` in `client`. University integration tests require MongoDB on `127.0.0.1:27017`; they create and remove a uniquely named test database without touching development data.
