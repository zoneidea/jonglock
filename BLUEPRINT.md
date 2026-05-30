# Jonglock Mobile Blueprint

## MVP Goal

Build a clean mobile application for vendors to sign in, browse markets, choose dates, select booths, create bookings, upload payment proof, check in, manage profile data, and let audit users inspect bookings and issue fines. The current app is connected to the Jonglock public/mobile APIs for the main MVP workflows.

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

Current flows:

- View bookings for selected date
- Check whether vendor sells on the correct date
- Record pass / violation status
- Add fine
- Add accessory usage to inspection fines
- Send fines to the customer cart for manual payment proof upload

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
- Secure backend token storage

### 3. Home

Purpose:

- Give quick access to booking actions

Current:

- Public announcement and booking entry surface
- Main booking CTA
- Booking, cart, check-in, profile, and audit entry points

Future:

- Show nearest active market
- Show pending payment and fine alerts

### 4. Booking

Current:

- Public market search and deep link handling
- Floor plan and booth availability loading
- QR scanner entry point
- Date selection, booth selection, accessories, coupon summary, hold, and confirm flow

Future:

- Backend mobile auth token ownership
- Payment provider redirect/SDK flow

### 5. Cart / Payment

Current:

- Booking and audit fine cart items
- Payment QR display/save
- Manual payment proof upload
- Local expiry handling for pending items

Future:

- Provider-backed payment state synchronization
- Receipt/tax document download

### 6. Profile / Check-in / Audit

Current:

- Public profile, address, avatar, phone verification, booking history, and settings
- Customer check-in list and check-in action
- Audit login, dashboard, QR lookup, inspection form, fine calculation, and save

Future:

- Secure backend auth session for customer profile
- Evidence image upload for audit checks

## Backend Integration

Current endpoint groups:

```text
/api/public/*
/api/mobile/audit/*
/api/mobile/locations/*
```

Production auth target:

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

- Package/application ID is `th.co.zoneidea.jonglock`.
- Add release keystore.
- Confirm Firebase Android app and Google Sign-In SHA-1/SHA-256 for `th.co.zoneidea.jonglock`.
- Push notification code is present; confirm FCM production credentials before release.

iOS:

- Open `ios/JonglockApp.xcworkspace`.
- Bundle identifier is `th.co.zoneidea`, matching `GoogleService-Info.plist`.
- `GoogleService-Info.plist` is linked to the Xcode target.
- Google Sign-In reversed client ID URL scheme is configured.
- Configure signing team.
- Add push notification capability later if needed.

## Package Decisions

- Internal shell state for tab routing, avoiding unused navigation runtime dependencies
- `react-native-safe-area-context` for device safe area handling
- `@react-native-google-signin/google-signin` for Gmail login
- `@react-native-firebase/app` for Firebase default app initialization
- `@react-native-async-storage/async-storage` for temporary local session mock
- `react-native-linear-gradient` for controlled visual polish
- `react-native-vector-icons` for bottom tabs, actions, and form affordances

## MVP Risks

- Google Sign-In requires native credentials before production.
- Android Firebase must be regenerated from Firebase Console if the checked-in `google-services.json` does not contain OAuth clients for `th.co.zoneidea.jonglock`.
- Payment flow must not launch without provider signature verification.
- Booth visual map needs a stable coordinate schema shared by backend, frontend, and mobile.
- Real mobile auth should use secure storage, not plain AsyncStorage.

## Next Implementation Steps

1. Add secure storage package for real token storage.
2. Add API base URL environment/flavor config.
3. Implement mobile auth token exchange.
4. Regenerate Android Firebase config for `th.co.zoneidea.jonglock` if needed.
5. Add provider-backed payment flow and webhook verification.
6. Add audit evidence image upload.
7. Run Android/iOS device builds after native credential changes.
