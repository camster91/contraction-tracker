#!/usr/bin/env bash
# Build the Android Olive AAB for Play Store submission.
#
# Prerequisites (one-time):
#   1. Generate the upload keystore (one-liner in SHIPPING.md)
#   2. Fill in android/app/keystore.properties with the passwords
#
# What this script does:
#   1. npx cap sync android (regenerates native Android code)
#   2. gradle bundleRelease (creates a signed App Bundle)
#   3. Verify the AAB is signed with the upload key
#
# Output:
#   android/app/build/outputs/bundle/release/app-release.aab
set -euo pipefail

cd "$(dirname "$0")/.."

export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export ANDROID_SDK_ROOT=$ANDROID_HOME

# Step 1: regenerate Android native code
echo "==> Step 1/3: npx cap sync android"
npx cap sync android

# Step 2: build the signed release AAB
echo "==> Step 2/3: gradle bundleRelease"
(cd android && ./gradlew bundleRelease)

# Step 3: verify signing
echo "==> Step 3/3: verify AAB signing"
AAB="android/app/build/outputs/bundle/release/app-release.aab"
SOURCE_KEYSTORE="android/app/olive-upload.keystore"

# Extract the universal APK to verify signing
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Get the keystore password from keystore.properties
KS_PASS=$(grep '^KEYSTORE_PASSWORD=' android/app/keystore.properties | cut -d= -f2)
KEY_PASS=$(grep '^KEY_PASSWORD=' android/app/keystore.properties | cut -d= -f2)

# Build a signed APKS archive
bundletool build-apks \
  --bundle="$AAB" \
  --output="$TMPDIR/olive.apks" \
  --mode=universal \
  --ks="$SOURCE_KEYSTORE" \
  --ks-pass="pass:$KS_PASS" \
  --ks-key-alias=olive \
  --key-pass="pass:$KEY_PASS" 2>&1 | tail -3

# Extract and verify
unzip -o "$TMPDIR/olive.apks" -d "$TMPDIR/apks" > /dev/null
apksigner verify --print-certs "$TMPDIR/apks/universal.apk" 2>&1 | head -10

echo ""
echo "==> Done!"
ls -la "$AAB"
echo ""
echo "To upload to Google Play Console:"
echo "  1. Open https://play.google.com/console"
echo "  2. Olive → Production → Create new release"
echo "  3. Upload $AAB"
echo "  4. Review and rollout"
echo ""
echo "OR via the Google Play API (gcloud):"
echo "  gcloud auth login"
echo "  gcloud config set project YOUR_PROJECT_ID"
echo "  # Use the play-developer-api Python client for full automation"
echo "  python -c \"from googleapiclient.discovery import build; ...\""
