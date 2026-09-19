# Deploy CivicX on the existing Render service

CivicX uses one Render Web Service for both clients:

- `/` serves the compiled React website.
- `/api` serves the Express API used by the website and Flutter app.

This is the existing `civix-backend` service with website hosting added. Do not create a second backend.

## Existing service settings

Update the existing service to use the repository root rather than `server/backend` as its Root Directory. An empty Root Directory means the repository root.

```text
Branch: main
Build Command: npm --prefix client ci && npm --prefix client run build && npm --prefix server/backend ci && npm --prefix server/backend run build
Start Command: npm --prefix server/backend start
Health Check Path: /api/health
```

The repository also includes `render.yaml` with the same configuration. If it is connected as a Blueprint, review the proposed changes before applying them so Render updates `civix-backend` instead of creating a duplicate service.

## Environment variables

Keep the existing production values for these secrets:

```text
MONGO_URI
JWT_ACCESS_SECRET
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
AI_API_KEY
```

Set these non-secret values:

```text
NODE_ENV=production
LOG_LEVEL=info
AI_PROVIDER=gemini
AI_API_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
AI_MODEL=gemini-3.5-flash-lite
AI_WORKER_ENABLED=true
```

Render supplies `PORT`; do not hardcode it. Never paste secret values into `render.yaml` or commit a `.env` file.

## Verification

After deployment, verify:

1. `/api/health` reports `healthy` and `mongo: connected`.
2. `/` opens CivicX instead of returning 404.
3. Citizen and administrator login work.
4. A citizen can upload evidence and submit a report.
5. The report appears in the administrator moderation queue.

Build the Flutter release with the same service URL:

```powershell
flutter build apk --release --dart-define=API_BASE_URL=https://YOUR-SERVICE.onrender.com/api
```
