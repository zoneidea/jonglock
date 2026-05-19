# AGENT.md

## Mission

This folder contains the Jonglock mobile application. It is a React Native CLI project without Expo. The mobile app is for vendors, tenants, and audit users who interact with the Jonglock market booking platform.

The current stage is UI-first. Do not connect APIs unless the task explicitly asks for it.

## Product Context

Jonglock supports:

- Multi-organization market operations
- Market and booth map management
- Vendor booking from mobile
- Payment and booking status tracking
- Audit workflow for checking seller compliance
- Fines and payment proof workflows

The mobile app should eventually support:

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
- Keep UI state local until API integration is requested.
- Use React Navigation for screen routing.
- Use AsyncStorage only for non-sensitive local UI/session state in this MVP.
- Do not store tokens, passwords, payment data, or PII in plain AsyncStorage when real APIs are introduced.
- Use platform-native secure storage before production authentication.

## Commands

```bash
npm install
npm run lint
npm test -- --runInBand
npx tsc --noEmit
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

Splash screen may use animation and visual polish. Transactional screens must stay readable and direct.

## Current Implementation

`App.tsx` contains:

- Animated splash screen
- Auth screen with Login / Sign up segment
- Gmail button with immediate local fallback session
- Email test flow for UI development
- Home screen mock for booking actions

## Google Sign-In

Installed package:

- `@react-native-google-signin/google-signin`

The current code calls Google Sign-In and falls back to a mock Gmail session if native credentials are not configured. This is intentional for UI-first MVP testing.

Before production:

- Add real Google client configuration for Android and iOS.
- Remove or gate the mock fallback.
- Exchange Google identity with backend mobile auth endpoint.
- Store backend token securely.

## API Integration Plan

When API integration begins, create a small API layer instead of calling `fetch` directly inside screens:

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

- `auth.service.ts`
- `markets.service.ts`
- `bookings.service.ts`
- `payments.service.ts`
- `audit.service.ts`

## Verification

Before handing off a mobile change:

- Run lint.
- Run tests.
- Run TypeScript check.
- Run `pod install` after native dependency changes.
- If changing native config, run at least one Android or iOS build when the local environment supports it.

## Security Notes

- No production secrets in git.
- No hardcoded backend tokens.
- No hardcoded Google OAuth client secrets.
- No sensitive PII in screenshots, logs, or mock fixtures.
