#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> iOS project structure"
./scripts/verify-ios.sh

if [ -z "${ANDROID_HOME:-}" ]; then
  if [ -d "${HOME}/Library/Android/sdk/platform-tools" ]; then
    export ANDROID_HOME="${HOME}/Library/Android/sdk"
  elif [ -d "/opt/homebrew/share/android-commandlinetools/platform-tools" ]; then
    export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
  else
    echo "Android SDK was not found; native verification cannot be accepted." >&2
    exit 1
  fi
fi
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"

if [ -z "${JAVA_HOME:-}" ]; then
  OLIVE_JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
  if [ -x "$OLIVE_JAVA_HOME/bin/java" ]; then
    export JAVA_HOME="$OLIVE_JAVA_HOME"
  else
    echo "Java 21 was not found; native verification cannot be accepted." >&2
    exit 1
  fi
fi

echo "==> Android host unit tests and instrumentation source compilation"
(cd android && ./gradlew --no-daemon testDebugUnitTest compileDebugAndroidTestSources)

echo "Native project structure and host-compilable Android tests passed."
echo "This is not signed-binary or physical-device evidence."
