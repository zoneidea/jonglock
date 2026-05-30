# Jonglock Mobile App

React Native CLI application สำหรับ mobile booking app ของ Jonglock โดยไม่ใช้ Expo และเตรียม native project ครบทั้ง Android และ iOS

## Stack

- React Native `0.76.9`
- React `18.3.1`
- TypeScript
- Internal tab shell state for navigation
- AsyncStorage สำหรับ session/profile preference ชั่วคราว
- Google Sign-In package สำหรับ Gmail login flow
- React Native Firebase core สำหรับ native Firebase default app
- React Native Firebase Messaging สำหรับ push notification foreground และ device token registration
- Linear Gradient สำหรับ visual treatment
- iOS CocoaPods installed แล้ว

## Folder

```text
app/
  android/               Android native project
  ios/                   iOS native project, open JonglockApp.xcworkspace
  src/
    components/          Reusable UI components
    constants/           Shared app constants
    screens/             One file per app screen
    theme/               Colors and shared visual tokens
    types/               Shared TypeScript types
  App.tsx                Boot, session restore, and root navigation only
  index.js               Native app entry
  AGENT.md               Working rules for future agents
  BLUEPRINT.md           Product and technical blueprint
```

## Install

```bash
cd app
npm install
cd ios && pod install && cd ..
```

## Run

Start Metro:

```bash
npm start
```

Run Android:

```bash
npm run android
```

Run iOS:

```bash
npm run ios
```

For iOS manual work, open:

```bash
open ios/JonglockApp.xcworkspace
```

## Quality Gates

```bash
npm run lint
npm test -- --runInBand
npx tsc --noEmit
```

## Current Scope

This version is connected to the Jonglock public/mobile APIs for the main customer and audit workflows. Customer identity is still email/Gmail based and stored locally; a backend mobile auth token exchange and secure token storage are still planned before production authentication.

Implemented:

- Animated splash screen
- Login / Sign up screen
- Gmail entry button
- Email-only local entry flow for testing and public booking identity
- Market discovery, floor plan loading, booth availability, booking hold/summary/confirm
- Cart, manual payment QR/payment proof upload, booking history, and customer check-in
- Profile, address/location master data, avatar upload, phone verification through Firebase Auth, and PDPA preferences
- Audit login, audit dashboard, QR scan, inspection form, fine workflow, and fine payment cart integration
- Foreground push notification display and FCM device token registration
- Android and iOS native project setup with Firebase core

## Gmail / Google Sign-In

The app installs and autolinks `@react-native-google-signin/google-signin`.

Current UI behavior:

- It attempts Google Sign-In.
- If the user cancels or presses back, the app stays on Login.
- If native Google credentials are not configured correctly, the app shows a setup error and does not create a fake Gmail session.
- The email-only form remains available as a public booking identity fallback.

Production setup still needed:

- Android: add SHA-1/SHA-256 to Google Cloud or Firebase project for package `th.co.zoneidea.jonglock`.
- Android: `android/app/google-services.json` is installed for package `th.co.zoneidea.jonglock`.
- iOS: `ios/JonglockApp/GoogleService-Info.plist` is installed and linked into the Xcode target. The app bundle identifier is `th.co.zoneidea`, matching the plist.
- Configure `GoogleSignin.configure({ webClientId, iosClientId })`.
- Replace local session fallback with backend mobile auth exchange.

Troubleshooting Android:

- If account selection opens but login fails after selecting Gmail, verify that Firebase has Android OAuth credentials for package `th.co.zoneidea.jonglock`.
- Add the debug and release SHA-1/SHA-256 certificates in Firebase Project Settings, then download a fresh `google-services.json`.
- The current `google-services.json` must include an `oauth_client` entry after SHA is configured.

## Firebase

Firebase core is installed through `@react-native-firebase/app`.

Android is configured with:

- `android/app/google-services.json`
- Android package/application id: `th.co.zoneidea.jonglock`
- `com.google.gms:google-services`
- `com.google.gms.google-services` app plugin

iOS is configured with:

- `ios/JonglockApp/GoogleService-Info.plist`
- `GoogleService-Info.plist` linked in `JonglockApp.xcodeproj`
- Google Sign-In reversed client ID URL scheme in `Info.plist`
- Bundle identifier `th.co.zoneidea`

## API Integration

Current API base URL is defined in `src/config/api.ts` and defaults to `https://jonglockapi.zonedevnode.com/api`.

Implemented API areas:

- Public markets, floor plans, accessories, booth availability, booking hold/summary/confirm
- Public cart, booking payment info, manual payment proof upload, booking history, and check-in
- Public profile, address, password, phone verification, avatar upload, and device token registration
- Public announcements and Thailand location master data
- Mobile audit auth, summary, inspection list/form, QR lookup, and inspection save

Still planned:

- Gmail identity token exchange with backend mobile auth endpoint
- Secure storage for backend mobile tokens
- Environment/flavor config for dev/staging/production API URLs
- Provider-backed payment gateway flow beyond manual payment proof review

## Notes

- Keep this project Expo-free.
- Use React Native CLI native modules and CocoaPods.
- Do not commit production Google credentials or signing keys.
