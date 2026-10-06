#!/usr/bin/env bash
# Create a fresh local unsigned archive. This does not upload or sign an app.
set -euo pipefail
cd "$(dirname "$0")/.."
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
BUILD_ROOT="${OLIVE_BUILD_ROOT:-$PWD/ios/build/$(date -u +%Y%m%dT%H%M%SZ)}"
if [[ -e "$BUILD_ROOT/Olive.xcarchive" ]]; then
  printf 'Archive already exists; choose a fresh OLIVE_BUILD_ROOT.\n' >&2
  exit 1
fi
mkdir -p "$BUILD_ROOT"
npm run verify
npx cap sync ios
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -derivedDataPath "$BUILD_ROOT/DerivedData" \
  -archivePath "$BUILD_ROOT/Olive.xcarchive" \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO archive
printf '\nUnsigned archive: %s/Olive.xcarchive\nSigning and Apple validation are still required.\n' "$BUILD_ROOT"
