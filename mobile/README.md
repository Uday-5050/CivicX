# Civix mobile

Flutter citizen app for Civix. It supports citizen sign-in, local drafts, Cloudinary-backed report evidence uploads, and tracking reports submitted through the shared backend.

## Prerequisites

Install Flutter 3.24 or newer and run `flutter doctor`.

## Run

```powershell
flutter pub get
flutter run
```

Normal builds connect to the live Render API at `https://civicx-backend-xcbz.onrender.com/api`.
To use a local backend during development, override it explicitly with
`--dart-define=API_BASE_URL=http://10.0.2.2:5000/api` for the Android emulator.

The app sends photos, videos, PDFs, DOC, and DOCX files in the report submission request. The backend uploads them to Cloudinary; Cloudinary credentials belong only in `server/backend/.env`, never in the Flutter app.

## Checks

```powershell
dart format lib test
flutter analyze
flutter test
```

The app never auto-submits drafts after reconnect. A citizen must explicitly press Submit or Retry.
