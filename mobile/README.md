# Civix mobile

Flutter citizen app for Civix. The app is intentionally scoped to citizen journeys in the first release: sign in, create a problem report, save drafts, attach evidence, track submitted problems, read notifications and manage the profile.

## Prerequisites

Install Flutter 3.24 or newer and run `flutter doctor`. This repository was scaffolded without a Flutter executable available in the current environment, so run `flutter create .` inside this folder once to generate the platform runners before building an APK.

## Run

```powershell
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api
```

Use `http://10.0.2.2:4000/api` for the Android emulator, a reachable LAN address for a physical Android device, and `http://127.0.0.1:4000/api` for an iOS simulator on macOS. Release builds must use HTTPS.

## Checks

```powershell
dart format lib test
flutter analyze
flutter test
```

The app never auto-submits drafts after reconnect. A citizen must explicitly press Submit or Retry.
