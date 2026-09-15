# Android release optimization

Release builds enable R8 code optimization and resource shrinking with
`proguard-android-optimize.txt`. Debug builds are unchanged. Library consumer
rules remain active; no blanket keep or warning-suppression rules were added.
Hermes, native dependencies, and the four supported ABIs are unchanged.

## Comparison (2026-09-15)

Both builds used the same local source, including the existing versionCode 9
and pending Audit changes. Only the release shrinking configuration differed.

| AAB | Bytes | MiB |
| --- | ---: | ---: |
| Before R8 | 35,763,817 | 34.11 |
| With R8 | 34,134,859 | 32.55 |

Reduction: 4.55%. These are bundle file sizes, not Play download/install sizes.
Native libraries and JavaScript are not directly optimized by R8. Runtime
performance has not been measured.

## Build and release checks

The optimized AAB and APK builds passed. Release APK ZIP and ELF alignment
checks for 16 KB page sizes also passed.

Run from `android/`: `./gradlew bundleRelease assembleRelease`.
Run from app root:
`npm run android:check-16kb -- android/app/build/outputs/apk/release/app-release.apk`.

Archive `android/app/build/outputs/mapping/release/mapping.txt` with each release
for crash retracing. Build outputs are not committed.

Before publishing, install the optimized release through an internal Play track
and test cold launch, Gmail sign-in, camera/QR, notifications, booking, and Audit
saving. No Android device was connected during this build, so these runtime
checks remain outstanding. Do not infer runtime safety from build success alone.

Reference: https://developer.android.com/topic/performance/app-optimization/enable-app-optimization
