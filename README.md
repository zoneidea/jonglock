# Jonglock Mobile App

React Native CLI application สำหรับ mobile booking app ของ Jonglock โดยไม่ใช้ Expo และเตรียม native project ครบทั้ง Android และ iOS

## Stack

- React Native `0.76.9`
- React `18.3.1`
- TypeScript
- React Navigation native stack
- AsyncStorage สำหรับ local session mock
- Google Sign-In package สำหรับ Gmail login flow
- React Native Firebase core สำหรับ native Firebase default app
- Linear Gradient สำหรับ visual treatment
- iOS CocoaPods installed แล้ว

## Folder

```text
app/
  android/               Android native project
  ios/                   iOS native project, open JonglockApp.xcworkspace
  App.tsx                Current UI-first mobile app
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

This version is UI-first and does not connect to backend APIs yet.

Implemented:

- Animated splash screen
- Login / Sign up screen
- Gmail entry button
- Immediate local session fallback for UI testing
- Simple home screen for booking workflows
- Android and iOS native project setup

## Gmail / Google Sign-In

The app installs and autolinks `@react-native-google-signin/google-signin`.

Current UI behavior:

- It attempts Google Sign-In.
- If native Google credentials are not configured yet, it falls back to a local mock Gmail session so the UX can be tested immediately.

Production setup still needed:

- Android: add SHA-1/SHA-256 to Google Cloud or Firebase project.
- Android: `android/app/google-services.json` is installed for package `com.jonglockapp`.
- iOS: add reversed client ID URL scheme and Google service plist if required by the chosen Google setup.
- Configure `GoogleSignin.configure({ webClientId, iosClientId })`.
- Replace local session fallback with backend mobile auth exchange.

Troubleshooting Android:

- If account selection opens but login fails after selecting Gmail, verify that Firebase has Android OAuth credentials for package `com.jonglockapp`.
- Add the debug and release SHA-1/SHA-256 certificates in Firebase Project Settings, then download a fresh `google-services.json`.
- The current `google-services.json` must include an `oauth_client` entry after SHA is configured.

## Firebase

Firebase core is installed through `@react-native-firebase/app`.

Android is configured with:

- `android/app/google-services.json`
- `com.google.gms:google-services`
- `com.google.gms.google-services` app plugin

iOS still needs `GoogleService-Info.plist` before Firebase can initialize on iOS builds. Add it under `ios/JonglockApp/` and link it to the Xcode target when the iOS Firebase app is created.

## API Plan

API connection is intentionally not implemented in this step. The planned integration point is:

- Login with Gmail -> backend mobile auth endpoint
- Fetch markets -> mobile market list endpoint
- Fetch booth map -> mobile booth availability endpoint
- Create booking -> mobile booking endpoint
- Payment -> selected payment provider flow

## Notes

- Keep this project Expo-free.
- Use React Native CLI native modules and CocoaPods.
- Do not commit production Google credentials or signing keys.
