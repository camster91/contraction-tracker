#!/usr/bin/env bash
# Create a signed App Store IPA locally; never upload automatically.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${DEVELOPMENT_TEAM:?Set DEVELOPMENT_TEAM to the paid Apple Developer team ID}"
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
BUILD_ROOT="${OLIVE_BUILD_ROOT:-$PWD/ios/build/$(date -u +%Y%m%dT%H%M%SZ)}"
if [[ -e "$BUILD_ROOT/Olive.xcarchive" ]]; then
  printf 'Archive already exists; choose a fresh OLIVE_BUILD_ROOT.\n' >&2
  exit 1
fi
mkdir -p "$BUILD_ROOT"
npm run verify
node scripts/write-native-provenance.mjs
npx cap sync ios
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -derivedDataPath "$BUILD_ROOT/DerivedData" \
  -archivePath "$BUILD_ROOT/Olive.xcarchive" DEVELOPMENT_TEAM="$DEVELOPMENT_TEAM" \
  CODE_SIGNING_ALLOWED=YES CODE_SIGN_STYLE=Automatic archive
xcodebuild -exportArchive -archivePath "$BUILD_ROOT/Olive.xcarchive" \
  -exportPath "$BUILD_ROOT/export" -exportOptionsPlist ios/ExportOptions.plist
printf '\nIPA export: %s/export\nValidate with Apple before submission.\n' "$BUILD_ROOT"
