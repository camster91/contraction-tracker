#!/usr/bin/env bash
# Build a signed AAB with the October 8 approved Olive upload certificate.
# Olive had no registered Play app; the older desktop certificate is historical.
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f android/app/keystore.properties ]]; then
  printf 'Restore the approved Olive upload key and android/app/keystore.properties before building a release.\n' >&2
  exit 1
fi
if [[ -z "${JAVA_HOME:-}" && -d /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ]]; then
  export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
fi
: "${JAVA_HOME:?Set JAVA_HOME to a Java 21 installation}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
npm run verify
node scripts/write-native-provenance.mjs
npx cap sync android
(cd android && ./gradlew testDebugUnitTest bundleRelease assembleRelease)
AAB=android/app/build/outputs/bundle/release/app-release.aab
"$JAVA_HOME/bin/jarsigner" -verify "$AAB"
# A successful jarsigner exit alone does not prove that a signature exists.
OLIVE_SIGNER_SHA256=$("$JAVA_HOME/bin/keytool" -J-Duser.language=en -J-Duser.country=US -printcert -jarfile "$AAB" | awk '/SHA256:/ {print $2; exit}' | tr -d ':' | tr '[:upper:]' '[:lower:]')
if [[ "$OLIVE_SIGNER_SHA256" != b4bbaac79c8c736ac48986e312db915e2c2695f5aa1640f5b4e1f948354afaa2 ]]; then
  printf 'AAB signer differs from the approved October 8 Olive upload certificate.\n' >&2
  exit 1
fi
shasum -a 256 "$AAB"
printf '\nSigned Android artifact prepared locally. Store upload remains a separate action.\n'
