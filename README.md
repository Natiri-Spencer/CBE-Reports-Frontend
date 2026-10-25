# CBE Reports frontend

React client for entering learner marks, reviewing performance, managing fee
records, and downloading reports from the CBE Reports API.

## Requirements

- Node.js 22 or newer
- npm
- A running CBE Reports backend

## Local setup

```powershell
Copy-Item .env.example .env
npm ci
npm start
```

`VITE_API_URL` must point to the backend. Use an HTTPS URL for deployed
web and Android builds; `127.0.0.1` only works when the API runs on the same
computer as the browser.

## Verification

```powershell
npm run test:ci
npm run build
```

The application has one entry point, `src/App.jsx`. Teacher and administrator
routes require both an access token and the matching role.

## Related repository

- Backend: https://github.com/Natiri-Spencer/CBE-Reports

## Android

The Android client uses Capacitor and targets API 36. Before creating a mobile
build, set `VITE_API_URL` to the deployed HTTPS backend; a phone cannot
reach the development API through `127.0.0.1`.

```powershell
npm run android:sync
Set-Location android
.\gradlew.bat assembleDebug
```

The debug APK is written under `android/app/build/outputs/apk/debug`. Open the
native project with `npm run android:open` when Android Studio is installed.

## Repository structure

The frontend and backend are maintained as two independent Git repositories.
Clone this repository beside `student_reports_backend`; do not initialize a
third Git repository around both folders. Use Node 22, recorded in `.nvmrc`.
