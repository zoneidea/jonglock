# Android release 11 — 2026-11-06

- Application ID: th.co.zoneidea (preserved for the existing store listing).
- Version name: 1.0.0; versionCode increased from workspace value 10 to 11.
- Signed App Bundle: android/app/build/outputs/bundle/release/app-release.aab.
- Delivery copy: /Users/zone-idea/Desktop/Jonglock-Android-1.0.0-v11.aab.
- Size: 35,015,535 bytes.
- SHA-256: 87072375cca58010b5096a01c670e0e856e14da837bd9175b0cebeaa093348e2.

Built the current workspace with `:app:bundleRelease :app:assembleRelease`:
BUILD SUCCESSFUL. Existing unrelated local changes were included in the build
and left unstaged in Git. Previous AAB was backed up under
/tmp/jonglock-android-release-backups before building.

Validation: 70 tests across 19 suites passed; TypeScript passed; full lint had
zero errors and 15 warnings. Official Google bundletool validation passed;
manifest confirms package/version above and BundleConfig PAGE_ALIGNMENT_16K.
Jarsigner verified the AAB signature; certificate SHA-256 matches the prior AAB.
Release APK passed scripts/check-android-16kb.sh (zip and 64-bit ELF LOAD segment
alignment). The delivery copy hash matches the generated AAB. No store upload
or publication was performed.

ReservePay Android configuration is fetched at runtime from the backend. The
user-supplied replacement ins_XQ2Tgq9XHz was verified enabled for ANDROID with
identifier th.co.zoneidea and saved on production. Serving Passenger worker was
reloaded; live methods returned merchant 187407900159, installation
ins_XQ2Tgq9XHz, installationEnabled=true and checkoutEnabled=true. No provider
secret is embedded for this configuration, and no real payment was performed.
