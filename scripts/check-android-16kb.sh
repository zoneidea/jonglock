#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APK_PATH="${1:-$APP_DIR/android/app/build/outputs/apk/debug/app-debug.apk}"
SDK_ROOT="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
ZIPALIGN="$SDK_ROOT/build-tools/35.0.0/zipalign"
OBJDUMP="$(find "$SDK_ROOT/ndk" -path "*/toolchains/llvm/prebuilt/darwin-*/bin/llvm-objdump" -type f 2>/dev/null | sort -V | tail -n 1)"

if [[ ! -f "$APK_PATH" ]]; then
  echo "APK not found: $APK_PATH" >&2
  echo "Build it first with: cd android && ./gradlew :app:assembleDebug" >&2
  exit 1
fi

if [[ ! -x "$ZIPALIGN" ]]; then
  echo "zipalign not found at: $ZIPALIGN" >&2
  echo "Install Android Build Tools 35.0.0 or set ANDROID_HOME/ANDROID_SDK_ROOT." >&2
  exit 1
fi

if [[ -z "$OBJDUMP" || ! -x "$OBJDUMP" ]]; then
  echo "llvm-objdump not found under: $SDK_ROOT/ndk" >&2
  exit 1
fi

echo "Checking APK zip alignment for 16 KB page size..."
"$ZIPALIGN" -c -P 16 4 "$APK_PATH"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

unzip -q "$APK_PATH" 'lib/arm64-v8a/*.so' 'lib/x86_64/*.so' -d "$TMP_DIR"

echo "Checking ELF LOAD segment alignment for 16 KB page size..."
FAILED=0
while IFS= read -r SO_FILE; do
  while IFS= read -r LOAD_LINE; do
    ALIGNMENT="$(awk '{print $NF}' <<< "$LOAD_LINE")"
    if [[ "$ALIGNMENT" =~ \*\*([0-9]+)$ ]] && (( BASH_REMATCH[1] < 14 )); then
      echo "UNALIGNED: ${SO_FILE#$TMP_DIR/} -> $LOAD_LINE" >&2
      FAILED=1
    fi
  done < <("$OBJDUMP" -p "$SO_FILE" | grep LOAD)
done < <(find "$TMP_DIR/lib" -name '*.so' -type f | sort)

if (( FAILED != 0 )); then
  exit 1
fi

echo "16 KB page size alignment check passed."
