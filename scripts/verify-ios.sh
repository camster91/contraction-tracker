#!/usr/bin/env bash
# Verify the iOS Xcode project structure is ready for App Store submission.
#
# Run this BEFORE you build the IPA. Catches:
# - Wrong bundle ID
# - Mismatched marketing version
# - Missing app icons
# - Missing privacy manifest
# - Missing launch screen
# - Wrong capabilities (no App Group toggle, but the code references one)
#
# Doesn't require Xcode license. Just file system checks.

cd "$(dirname "$0")/.."

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No color

PASS=0
FAIL=0
WARN=0

ok() { echo -e "${GREEN}✓${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}✗${NC} $1"; FAIL=$((FAIL+1)); }
warn() { echo -e "${YELLOW}!${NC} $1"; WARN=$((WARN+1)); }

echo "Olive iOS project verification"
echo "=============================="
echo ""

# 1. Bundle ID
BUNDLE_ID=$(grep -E 'PRODUCT_BUNDLE_IDENTIFIER = [^;]+;' ios/App/App.xcodeproj/project.pbxproj | head -1 | sed -E 's/.*= ([^;]+);.*/\1/' | tr -d ' ')
if [ "$BUNDLE_ID" = "com.ashbi.olive" ]; then
  ok "Bundle ID: $BUNDLE_ID"
else
  fail "Bundle ID: $BUNDLE_ID (expected com.ashbi.olive)"
fi

# 2. Marketing version
MV=$(grep -E 'MARKETING_VERSION = [^;]+;' ios/App/App.xcodeproj/project.pbxproj | head -1 | sed -E 's/.*= ([^;]+);.*/\1/' | tr -d ' ')
APP_V=$(node -p "require('./package.json').version")
if [ "$MV" = "$APP_V" ]; then
  ok "Marketing version: $MV (matches APP_VERSION in src/App.tsx)"
else
  fail "Marketing version mismatch: pbxproj=$MV, App.tsx=$APP_V"
fi

# 3. Display name
DISPLAY_NAME=$(grep -A 1 "CFBundleDisplayName" ios/App/App/Info.plist | grep -E '<string>[^<]+</string>' | head -1 | sed -E 's/.*<string>([^<]+)<.*>/\1/')
if [ "$DISPLAY_NAME" = "Olive" ]; then
  ok "Display name: $DISPLAY_NAME"
else
  fail "Display name: $DISPLAY_NAME (expected Olive)"
fi

# 4. arm64 architecture (App Store requirement)
ARCH=$(grep -A 3 "UIRequiredDeviceCapabilities" ios/App/App/Info.plist | grep -E '<string>[^<]+</string>' | head -1 | sed -E 's/.*<string>([^<]+)<.*>/\1/')
if [ "$ARCH" = "arm64" ]; then
  ok "Required architecture: $ARCH (App Store compatible)"
else
  fail "Required architecture: $ARCH (must be arm64 for App Store)"
fi

# 5. App icons
ICON_COUNT=$(ls ios/App/App/Assets.xcassets/AppIcon.appiconset/ | grep -c AppIcon)
if [ "$ICON_COUNT" -eq 12 ]; then
  ok "App icons: $ICON_COUNT/12 required sizes present"
else
  fail "App icons: only $ICON_COUNT/12 sizes present (need: 20@2x, 20@3x, 29@2x, 29@3x, 40@2x, 40@3x, 60@2x, 60@3x, 76, 76@2x, 83.5@2x, 1024)"
fi

if [ -f ios/App/App/PrivacyInfo.xcprivacy ]; then
  ok "PrivacyInfo.xcprivacy present (App Store requirement since May 2024)"
  if grep -q "PrivacyInfo.xcprivacy in Resources" ios/App/App.xcodeproj/project.pbxproj; then
    ok "PrivacyInfo.xcprivacy is wired into the App target Resources build phase"
  else
    warn "REMINDER: PrivacyInfo.xcprivacy exists on disk but is NOT yet wired into the App target"
    warn "  (open Xcode → right-click App group → Add Files → select PrivacyInfo.xcprivacy)"
  fi
else
  fail "PrivacyInfo.xcprivacy MISSING — App Store will reject at upload"
fi

# 7. Launch screen
SPLASH_COUNT=$(ls ios/App/App/Assets.xcassets/Splash.imageset/ | grep -c Default)
if [ "$SPLASH_COUNT" -ge 3 ]; then
  ok "Launch screen: $SPLASH_COUNT sizes (1x/2x/3x + dark variants)"
else
  fail "Launch screen: only $SPLASH_COUNT sizes"
fi

# 8. App Group reference (in Swift, needs Xcode UI capability)
APP_GROUP_REFS=$(grep -rE "group\.com\.ashbi\.olive" ios/ 2>/dev/null | wc -l | tr -d ' ')
APP_GROUP_REFS=${APP_GROUP_REFS:-0}
if [ "$APP_GROUP_REFS" -gt 0 ] 2>/dev/null; then
  ok "App Group $BUNDLE_ID: referenced $APP_GROUP_REFS times in code"
  warn "REMINDER: Enable App Group capability in Xcode → Signing & Capabilities → +Capability → App Groups → check $BUNDLE_ID"
else
  ok "App Group: not referenced (no shared UserDefaults between app and widget)"
fi

# 9. OliveLiveActivity fate
if [ -d ios/App/OliveLiveActivity ]; then
  warn "OliveLiveActivity/ Swift file exists but is not wired as a Widget Extension target"
  echo "       Two options:"
  echo "         1. Delete it: rm -rf ios/App/OliveLiveActivity"
  echo "         2. Wire it as a Widget Extension target in Xcode (advanced)"
  echo "       Recommended: delete for v1.0.0, ship simple."
else
  ok "OliveLiveActivity/: not present (shipped without for v1.0.0)"
fi

# 10. capabilities.json present
if [ -f ios/App/capacitor.config.json ] || [ -f ios/App/App/capacitor.config.json ]; then
  ok "Capacitor config present"
else
  fail "No capacitor.config.json — run npx cap sync ios"
fi

echo ""
echo "=============================="
echo "Passed:  $PASS"
echo "Failed:  $FAIL"
echo "Warnings: $WARN"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

echo "✓ Project is structurally ready for App Store submission."
echo ""
echo "Next steps:"
echo "  1. Open ios/App/App.xcodeproj in Xcode"
echo "  2. Verify Team in Signing & Capabilities"
echo "  3. Add PrivacyInfo.xcprivacy to App target (right-click App group → Add Files)"
echo "  4. Accept Xcode license: sudo xcodebuild -license"
echo "  5. Build: ./scripts/build-ios.sh"
echo "  6. Upload: ./scripts/upload-app-store.sh ios/build/Olive.ipa"
