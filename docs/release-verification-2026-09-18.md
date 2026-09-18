# CivicX local release verification — 18 September 2026

## Verified locally

- Website production build completes.
- Website automated tests pass: 16/16.
- Website lint completes without errors. Existing advisory warnings remain in older components.
- Login page has no browser console errors or warnings.
- Login page has no horizontal overflow at 360 px, 768 px, or 1440 px viewport widths.
- Password visibility control changes the password input from hidden to visible.
- Backend TypeScript build completes.
- Backend integration suite covers authentication, permissions, moderation, routing, university acceptance, proposals, industry collaboration, milestones, notifications, analytics, closure, and the complete institutional lifecycle.
- Gemini 3.5 Flash-Lite returns a structured CivicX classification through the configured adapter.
- AI fallback and persistence tests do not depend on local API credentials.
- Flutter analysis completes without issues.
- Flutter tests pass: 2/2.
- Android debug APK builds at `mobile/build/app/outputs/flutter-apk/app-debug.apk`.

## External release blocker

The previously supplied Render backend address returns HTTP 404, including its `/api/health` route. The Android app can use the local backend on an emulator, but an independently usable phone build requires a working public backend URL. Build it with:

```powershell
flutter build apk --release --dart-define=API_BASE_URL=https://YOUR-BACKEND.example/api
```

Deploying or changing the shared hosted service and testing against shared production-like data requires an explicit release decision after the local changes are reviewed.
