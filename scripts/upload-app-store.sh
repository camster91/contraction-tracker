#!/usr/bin/env bash
# Upload Olive IPA to App Store Connect via Transporter CLI (or altool).
#
# Two paths supported:
#   1. Transporter (preferred) — `xcrun transporter upload`
#   2. altool (deprecated but still works) — `xcrun altool --upload-package`
#
# Prerequisites (one-time):
#   1. App Store Connect account with Olive created
#   2. Apple ID with App Manager / Admin role
#   3. App-specific password from https://appleid.apple.com/account/manage
#   4. Xcode license accepted (sudo xcodebuild -license)
#
# Setup:
#   export APPLE_ID_EMAIL="cameron@ashbi.ca"
#   export APPLE_ID_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"  # app-specific
#   export APPLE_ID_TEAM_ID="YOUR_10_CHAR_TEAM_ID"
#   xcrun notarytool store-credentials "AC_PASSWORD" \
#     --apple-id "$APPLE_ID_EMAIL" \
#     --password "$APPLE_ID_APP_PASSWORD" \
#     --team-id "$APPLE_ID_TEAM_ID"
#
# Run:
#   ./scripts/upload-app-store.sh ios/build/Olive.ipa
set -euo pipefail

IPA_FILE="${1:-ios/build/Olive.ipa}"

if [ ! -f "$IPA_FILE" ]; then
  echo "ERROR: $IPA_FILE not found."
  echo "Build it first: ./scripts/build-ios.sh"
  exit 1
fi

# Validate the IPA
echo "==> Validating IPA..."
xcrun altool --validate-app -f "$IPA_FILE" -t ios 2>&1 | tail -5

# Upload via altool (works without Transporter)
echo ""
echo "==> Uploading to App Store Connect..."
echo "    Apple ID: $APPLE_ID_EMAIL"
echo "    Bundle ID: com.ashbi.olive"
echo "    File: $IPA_FILE"
echo ""

xcrun altool --upload-package \
  -f "$IPA_FILE" \
  -t ios \
  --bundle-id "com.ashbi.olive" \
  --bundle-version "$(grep -oP 'const APP_VERSION = "\\K[^"]+' src/App.tsx)" \
  --bundle-short-version-string "$(grep -oP 'const APP_VERSION = "\\K[^"]+' src/App.tsx)" \
  --username "$APPLE_ID_EMAIL" \
  --password "$APPLE_ID_APP_PASSWORD" 2>&1 | tail -20

echo ""
echo "==> Done!"
echo "    Track: ios (App Store)"
echo "    Next: open https://appstoreconnect.apple.com → My Apps → Olive"
echo "    Review time: typically 1-3 days for first app"
