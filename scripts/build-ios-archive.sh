#!/usr/bin/env bash
# Generate the unsigned iOS IPA using a fresh project + xcodebuild
# without code signing. Cam can sign + upload with Transporter.
#
# This script:
# 1. Runs npx cap sync ios
# 2. Cleans DerivedData
# 3. Builds the archive with xcodebuild archive (no signing)
# 4. Exports the unsigned .xcarchive
#
# Cam then needs to:
# 1. Open the .xcarchive in Xcode
# 2. Re-sign with his Apple Developer ID (Sign & Run > Apple Distribution)
# 3. Export as App Store Connect deployment (Organizer > Distribute App)
# 4. Use Transporter to upload
#
# This script is the FIRST HALF of the iOS ship flow. It's the part
# Hermes can do without the Apple ID credentials.
set -euo pipefail

cd "$(dirname "$0")/.."

export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
export PATH="$DEVELOPER_DIR/usr/bin:$DEVELOPER_DIR/Toolchains/XcodeDefault.xctoolchain/usr/bin:$PATH"

echo "==> Step 1/4: npx cap sync ios"
npx cap sync ios

echo "==> Step 2/4: Clean DerivedData"
rm -rf ios/build ~/Library/Developer/Xcode/DerivedData/Olive*

echo "==> Step 3/4: Build unsigned archive"
echo "    (Apple Development team comes from your Apple ID, set in Xcode)"
xcodebuild \
  -workspace ios/App/App.xcodeproj/project.xcworkspace \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath ios/build/Runner.xcarchive \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  archive 2>&1 | tail -20

echo "==> Step 4/4: Verify archive"
ls -la ios/build/Runner.xcarchive/

cat <<EOF

✓ Unsigned archive created at ios/build/Runner.xcarchive

NEXT STEPS (do these in Xcode on your Mac):

1. Open ios/build/Runner.xcarchive in Organizer (Window > Organizer)
2. Click "Distribute App" > App Store Connect > Upload
3. Choose your Team: "Cameron Ashley (Personal Team)" or your Ashbi team
4. Wait for upload to complete (5-15 min)
5. App Store Connect will email you when the build is processed
6. Submit for review at https://appstoreconnect.apple.com

The archive is unsigned on purpose — Apple's signing flow requires
your Team ID, which can only come from your Apple ID.

If the script fails with "license not accepted", run:
  sudo xcodebuild -license

If xcodebuild errors about "App Group", "Signing", or "Provisioning
Profile", you need to:
  1. Open ios/App/App.xcodeproj in Xcode
  2. Set Signing & Capabilities > Team to your Apple ID team
  3. Re-run this script

EOF
