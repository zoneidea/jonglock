# AGENT.md

## Mission

This folder contains the Jonglock mobile application. It is a React Native CLI project without Expo. The mobile app is for vendors, tenants, and audit users who interact with the Jonglock market booking platform.

The current stage is API-connected for public booking, profile, cart, check-in, push notification, and audit workflows. Customer login still uses Gmail/email as a local identity and must be upgraded to backend token exchange before production authentication.

## Product Context

Jonglock supports:

- Multi-organization market operations
- Market and booth map management
- Vendor booking from mobile
- Payment and booking status tracking
- Audit workflow for checking seller compliance
- Fines and payment proof workflows

The mobile app currently supports:

- Gmail login / signup
- Vendor profile
- Market discovery
- Date and product category selection
- Visual booth map booking
- Booking payment status
- Fine payment status
- Audit workflow for audit-role users

## Technical Rules

- Use React Native CLI only. Do not add Expo.
- Keep Android and iOS native folders functional.
- Prefer TypeScript for new code.
- Keep screen state local unless it belongs in a shared service or app shell concern.
- The app uses an internal tab shell, not React Navigation, in the current implementation.
- Use AsyncStorage only for non-sensitive local UI/session state in this MVP.
- Firebase core is available through `@react-native-firebase/app`.
- Do not store tokens, passwords, payment data, or PII in plain AsyncStorage when real APIs are introduced.
- Use platform-native secure storage before production authentication.
- Android package/application id is `th.co.zoneidea.jonglock`.
- iOS bundle identifier is `th.co.zoneidea`, matching `ios/JonglockApp/GoogleService-Info.plist`.

## Commands

```bash
npm install
npm run lint
npm test -- --runInBand
npx tsc --noEmit
npm run android:check-16kb
cd ios && pod install
```

Run:

```bash
npm start
npm run android
npm run ios
```

## Design Direction

The design should align with the Jonglock landing page:

- Primary surface: white
- Accent: teal
- Supporting color: deep navy
- Avoid heavy gradients as the main UI surface
- Keep spacing generous and clean
- Use cards for actionable mobile content
- Keep copy short and task-focused
- Favor symmetry and visual balance in every screen
- Reuse the same horizontal gutters for cards, banners, tab bars, and major content blocks whenever possible
- Keep major components aligned to a shared grid so widths feel intentional and consistent
- Prefer even spacing and centered composition over decorative offset layouts
- Avoid elements that look too tight, overlapping, or visually heavier on one side unless the screen explicitly needs asymmetry

Splash screen may use animation and visual polish. Transactional screens must stay readable and direct.

## Current Implementation

`App.tsx` must stay small. It is responsible only for:

- Session restore
- Google Sign-In bootstrap config
- Root navigation
- Logout wiring

Screen ownership:

- `src/screens/SplashScreen.tsx`
- `src/screens/AuthScreen.tsx`
- `src/screens/AppShell.tsx`
- `src/screens/HomeScreen.tsx`
- `src/screens/BookingScreen.tsx`
- `src/screens/CartScreen.tsx`
- `src/screens/CheckinScreen.tsx`
- `src/screens/ProfileScreen.tsx`
- `src/screens/AuditShell.tsx`
- `src/screens/audit/AuditLoginScreen.tsx`
- `src/screens/audit/AuditDashboardScreen.tsx`
- `src/screens/booking/*`

Reusable UI belongs in `src/components`. Shared colors/tokens belong in `src/theme`. Shared TypeScript contracts belong in `src/types`.

Do not put new screens or large UI blocks back into `App.tsx`.

## Google Sign-In

Installed package:

- `@react-native-google-signin/google-signin`

The current code calls Google Sign-In and keeps the user on Login if the user cancels, presses back, or Google credentials are not configured correctly. The separate email form is only a local UI test flow.

Before production:

- Confirm Android OAuth credentials for package `th.co.zoneidea.jonglock` and iOS OAuth credentials for bundle id `th.co.zoneidea`.
- Exchange Google identity with backend mobile auth endpoint.
- Store backend token securely.

## Firebase

Android has Firebase configured with `android/app/google-services.json`, package `th.co.zoneidea.jonglock`, and the Google Services Gradle plugin.

iOS has `ios/JonglockApp/GoogleService-Info.plist` included in the Xcode target and the Google Sign-In reversed client ID URL scheme in `Info.plist`.

Use Firebase only as the native platform foundation until a specific product is requested:

- Authentication
- Cloud Messaging
- Analytics
- Crashlytics

Do not add those product modules proactively.

## API Layer

Use the existing API layer under `src/services/` instead of adding direct `fetch` calls inside screens:

```text
src/
  config/
  services/
  screens/
  components/
  navigation/
  theme/
```

Suggested services:

- `markets.ts` for public market, booking, cart, payment proof, history, and check-in
- `profile.ts` for public profile and account settings
- `locations.ts` for Thailand master data
- `announcements.ts` for public announcements
- `audit.ts` for mobile audit auth and inspection workflows
- `notifications.ts` for FCM permission, token registration, and foreground messages

## Verification

Before handing off a mobile change:

- Run lint.
- Run tests.
- Run TypeScript check.
- Run `pod install` after native dependency changes.
- If changing native config, run at least one Android or iOS build when the local environment supports it.
- For Android native changes, keep 16 KB page size compatibility intact: use NDK r28 or newer, keep JNI libraries uncompressed, build an APK, then run `npm run android:check-16kb`.

## Security Notes

- No production secrets in git.
- No hardcoded backend tokens.
- No hardcoded Google OAuth client secrets.
- No sensitive PII in screenshots, logs, or mock fixtures.
