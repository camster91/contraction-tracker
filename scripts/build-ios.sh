#!/usr/bin/env bash
# Build the iOS Olive app for App Store submission.
#
# Prerequisites (one-time):
#   1. Open Xcode → Settings → accept the Xcode license
#      (requires admin sudo; this script can't do that for you)
#   2. Open ios/App/App.xcodeproj in Xcode
#   3. Signing & Capabilities → verify Team is set
#   4. Capabilities → verify App Group `group.com.ashbi.olive` is checked
#   5. Add ios/App/PrivacyInfo.xcprivacy to the App target (Xcode UI)
#
# What this script does:
#   1. npx cap sync ios  (regenerates native iOS code)
#   2. xcodebuild archive (creates a release archive for App Store)
#   3. xcodebuild -exportArchive (creates a signed IPA)
#
# Output:
#   ios/build/Runner.xcarchive
#   ios/build/Olive.ipa
#
# Both can be uploaded to App Store Connect via Transporter.app or
# `xcrun altool --upload-package`.
set -euo pipefail

cd "$(dirname "$0")/.."

# Use the full Xcode install, not the command-line tools
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
export PATH="$DEVELOPER_DIR/usr/bin:$DEVELOPER_DIR/Toolchains/XcodeDefault.xctoolchain/usr/bin:$PATH"

# Regenerate the iOS native project (in case dist/ changed)
echo "==> Step 1/3: npx cap sync ios"
npx cap sync ios

# Pick the build number from the latest git SHA
BUILD_NUMBER=$(git rev-list --count HEAD)
SHORT_SHA=$(git rev-parse --short HEAD)
VERSION=$(grep -oP "const APP_VERSION = '\K[^']+" src/App.tsx)

echo "==> Step 2/3: xcodebuild archive"
echo "    Version: $VERSION"
echo "    Build:   $BUILD_NUMBER ($SHORT_SHA)"
xcodebuild \
  -workspace ios/App/App.xcodeproj/project.xcworkspace \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath ios/build/Runner.xcarchive \
  CODE_SIGNING_ALLOWED=YES \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM="${DEVELOPMENT_TEAM:-}" \
  -allowProvisioningUpdates \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  MARKETING_VERSION="$VERSION" \
  archive 2>&1 | tail -40

echo ""
echo "==> Step 3/3: xcodebuild -exportArchive (App Store IPA)"
# Export the archive as an App Store-ready IPA
xcodebuild \
  -exportArchive \
  -archivePath ios/build/Runner.xcarchive \
  -exportPath ios/build \
  -exportOptionsPlist ios/build/ExportOptions.plist 2>&1 | tail -20

echo ""
echo "==> Done!"
ls -la ios/build/Olive.ipa 2>/dev/null
ls -la ios/build/Runner.xcarchive 2>/dev/null

# Show the next-step commands
cat <<EOF

To upload to App Store Connect:
  1. Open Transporter.app (free download from App Store)
  2. Sign in with your Apple ID
  3. Drag ios/build/Olive.ipa into Transporter
  4. Click Deliver

OR via command line (after accepting Xcode license):
  xcrun altool --upload-package \\
    --type ios \\
    --file ios/build/Olive.ipa \\
    --username "\${APPLE_ID_EMAIL}"

EOF
