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

The development server uses port 3000, matching the API's default CORS origins.

`VITE_API_URL` must point to the backend. Use an HTTPS URL for deployed
web and Android builds; `127.0.0.1` only works when the API runs on the same
computer as the browser.

## Verification

```powershell
npm run test:ci
npm run build
```

The client reads `src/generated/openapi.json`, exported by the backend's
`scripts/export_openapi.py`. Requests and responses are validated against that
contract; do not edit the generated file by hand. Marks and fees select a
permanent learner ID so two learners with the same name remain distinct.

To verify real form submissions against a synthetic API, start the backend's
`tests/serve_browser_fixture.py` first, then run:

```powershell
$env:VITE_API_URL = "http://127.0.0.1:8765"
npm run test:integration
Remove-Item Env:VITE_API_URL
```

The fixture uses only disposable synthetic data. Normal frontend tests mock
network calls; this additional suite exercises the actual HTTP API and its
SQLite transactions.

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

## Authentication and account access

New teacher registrations need administrator approval. Administrators can approve or disable accounts and inspect failed-login counts from their overview screen. Disabling an account revokes every session immediately.

The client renews fifteen-minute access tokens using rotating refresh credentials held in sessionStorage, with a seven-day maximum session lifetime. Login/logout use the backend contract. A failed logout keeps credentials available for retry and shows an error. Request retry keys survive token renewal.

Backend CORS currently allows local web origins on port 3000 and the Android webview origin `https://localhost`. Add the exact deployed web origin to backend configuration before external deployment.

Start a fresh backend synthetic fixture process for each `npm run test:integration` run; the integration suite deliberately saves marks, fees, payments and account requests into that disposable database. It never uses real school data.
