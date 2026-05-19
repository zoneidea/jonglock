# Jonglock Mobile Blueprint

## MVP Goal

Build a clean mobile application for vendors to sign in, browse markets, choose a date, select product type, see booth availability visually, and create bookings. This initial version prepares the native foundation and UI direction without connecting backend APIs yet.

## Platforms

- Android
- iOS

Project type:

- React Native CLI
- No Expo

## User Roles

### Vendor / Tenant

Primary mobile user. Books booths and pays through the mobile app.

Core flows:

- Sign up / login with Gmail
- Complete vendor profile
- Browse markets
- Select sale date
- Select product category
- Select booth
- Create booking
- Pay booking
- View booking status
- View fines

### Audit

Mobile-only operational user for market inspection.

Future flows:

- View bookings for selected date
- Check whether vendor sells on the correct date
- Record pass / violation status
- Add fine
- Upload evidence if needed

## Screen Blueprint

### 1. Splash

Purpose:

- Establish brand
- Give app a premium first impression

Current:

- Animated logo
- Teal brand ring
- White-first background

### 2. Auth

Purpose:

- Let users enter immediately using Gmail
- Keep signup friction low

Current:

- Login / Sign up segment
- Gmail action button
- Email-only test flow
- Local session fallback

Future:

- Google ID token exchange with backend
- Organization discovery or market affiliation
- Vendor profile completion

### 3. Home

Purpose:

- Give quick access to booking actions

Current:

- Mock stats
- Main booking CTA
- Booking, payment, audit action cards

Future:

- Pull real booking summary
- Show nearest active market
- Show pending payment and fine alerts

## Backend Integration Plan

Recommended endpoint groups:

```text
/api/mobile/auth/*
/api/mobile/markets/*
/api/mobile/bookings/*
/api/mobile/payments/*
/api/mobile/fines/*
/api/mobile/audit/*
```

Suggested flow:

1. Mobile calls Google Sign-In.
2. App sends Google token to backend.
3. Backend verifies token and maps or creates `mobile_users`.
4. Backend returns mobile session token.
5. App stores token using secure storage.
6. App fetches organization-aware market data.

## Data Needed Later

Vendor:

- mobile user id
- organization id
- tenant type
- name
- phone
- email
- address
- identity document fields where applicable

Booking:

- market
- booth
- sale date
- product category
- product description
- subtotal amount
- discount amount
- VAT amount
- total amount
- status

Payment:

- provider
- amount
- payment status
- paid at
- proof image or provider transaction id

Audit:

- booking id
- inspection status
- fine amount
- note
- evidence image

## UI Principles

- White primary surfaces
- Teal for primary actions and brand accents
- Navy for high-contrast text and premium feel
- Avoid dense admin-style tables on mobile
- Use list cards, bottom sheets, and visual maps
- Keep booking flow short and direct

## Native Configuration Checklist

Android:

- Configure package/application ID before production release.
- Add release keystore.
- Configure Google Sign-In SHA-1/SHA-256.
- Add push notification config later if needed.

iOS:

- Open `ios/JonglockApp.xcworkspace`.
- Configure bundle identifier and signing team.
- Configure Google Sign-In URL scheme.
- Add push notification capability later if needed.

## Package Decisions

- `@react-navigation/native` and native stack for routing
- `react-native-screens` and `react-native-safe-area-context` for native navigation performance
- `@react-native-google-signin/google-signin` for Gmail login
- `@react-native-firebase/app` for Firebase default app initialization
- `@react-native-async-storage/async-storage` for temporary local session mock
- `react-native-linear-gradient` for controlled visual polish
- `react-native-gesture-handler` for future gesture-driven UI
- `react-native-vector-icons` installed for future icon use, although current UI avoids relying on it

## MVP Risks

- Google Sign-In requires native credentials before production.
- iOS Firebase requires `GoogleService-Info.plist` before iOS production testing.
- Payment flow must not launch without provider signature verification.
- Booth visual map needs a stable coordinate schema shared by backend, frontend, and mobile.
- Real mobile auth should use secure storage, not plain AsyncStorage.

## Next Implementation Steps

1. Split `App.tsx` into `src/screens`, `src/components`, `src/theme`, and `src/navigation`.
2. Add secure storage package for real token storage.
3. Add API client with base URL environment config.
4. Implement mobile auth token exchange.
5. Implement market list and booth availability screens.
6. Implement visual booth map renderer.
7. Implement booking create and payment status flow.
