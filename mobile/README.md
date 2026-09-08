# Civix mobile

Flutter citizen app for Civix. It supports citizen sign-in, local drafts, Cloudinary-backed report evidence uploads, and tracking reports submitted through the shared backend.

## Prerequisites

Install Flutter 3.24 or newer and run `flutter doctor`.

## Run

```powershell
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api
```

Use `http://10.0.2.2:5000/api` for the Android emulator. For a physical Android device, replace `10.0.2.2` with the computer's LAN IP address, for example `http://192.168.1.5:5000/api`, and keep the backend running. Release builds must use HTTPS.

The app sends photos, videos, PDFs, DOC, and DOCX files in the report submission request. The backend uploads them to Cloudinary; Cloudinary credentials belong only in `server/backend/.env`, never in the Flutter app.

## Checks

```powershell
dart format lib test
flutter analyze
flutter test
```

The app never auto-submits drafts after reconnect. A citizen must explicitly press Submit or Retry.
