# Olive — Shipping Checklist (post-gauntlet)

The gauntlet (96 tests, 1.3 min in CI) covers everything automatable.
This doc covers everything that needs you.

## Time estimate by task

| Task | Time | Blocker? |
|------|------|----------|
| iOS: re-add App Group capability in Xcode | 2 min | **YES** — iOS app won't sign |
| iOS: add PrivacyInfo.xcprivacy to Xcode project | 2 min | **YES** — App Store reject since May 2024 |
| iOS: LiveActivity target decision | 2 min | NO (can ship without) |
| Android: generate release keystore | 10 min | **YES** — Google Play rejects debug-signed AABs |
| Android: create keystore.properties | 2 min | **YES** — same |
| Test on real iOS device | 30 min | NO (PWA already works in real WebKit) |
| Recruit 5 user testers | 1-2 hrs | NO (can ship without, but recommended) |
| Submit to App Store | 30 min | depends on review |
| Submit to Play Store | 30 min | depends on review |

**Total: ~2 hours of focused work to submit to both stores.**

---

## iOS: 2-minute App Group fix in Xcode

The Swift code references `group.com.ashbi.olive` everywhere, but the
Xcode capability toggle may have been lost during the Luna → Olive
rename. Verify and re-add:

1. Open `ios/App/App.xcworkspace` in Xcode (NOT the .xcodeproj — the workspace
   is what Capacitor needs for plugins to work)
2. Select the **App** target → **Signing & Capabilities** tab
3. Click **+ Capability** → **App Groups**
4. Check the `group.com.ashbi.olive` group
5. **Repeat for the `OliveLiveActivity` target** if you've kept it (see LiveActivity decision below)
6. Build → should compile without "no provisioning profile" error

Verify: `xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' build`
should exit 0.

## iOS: 2-minute PrivacyInfo.xcprivacy fix

I created `ios/App/PrivacyInfo.xcprivacy` (Apple's required privacy
manifest, mandatory for App Store submission since May 2024). It
needs to be added to the Xcode project:

1. Open Xcode → **App** target
2. **Right-click** the `App` group in the Project Navigator
3. **Add Files to "App"...** → select `PrivacyInfo.xcprivacy` (in the
   `ios/App/` directory)
4. Make sure **Copy items if needed** is checked
5. Build Settings → search for "Privacy Manifest" → verify it points
   to `App/PrivacyInfo.xcprivacy`

If this step is skipped, App Store Connect will reject the build at
upload time with "ITMS-91053: Missing API declaration".

## iOS: LiveActivity decision (2 minutes)

The `OliveLiveActivity.swift` file exists but is not wired as a
Widget Extension target in Xcode. Two options:

### Option A: ship without Live Activity (recommended for v1.0.0)

```
rm -rf ios/App/OliveLiveActivity
```

Live Activity is not promised in the current store copy. Adding it
later (v1.1) is straightforward — copy the file back, add the
Widget Extension target, re-enable the App Group on both targets.

### Option B: integrate it (advanced, 30 min)

Requires adding a Widget Extension target in Xcode, copying
OliveLiveActivity.swift into it, configuring the Info.plist with
`NSExtensionPointIdentifier = com.apple.widgetkit-extension`, and
adding a `NSSupportsLiveActivities = true` key to the main app's
Info.plist.

**Recommendation: Option A. Ship v1.0.0 simple.**

## Android: 10-minute keystore generation

```bash
cd ~/projects/contraction-tracker
keytool -genkey -v \
  -keystore android/app/olive-upload.keystore \
  -alias olive \
  -keyalg RSA -keysize 2048 -validity 25000 \
  -storepass YOUR_KEYSTORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=Cameron Ashley,O=Ashbi Design,C=CA"
```

Save the passwords in `android/app/keystore.properties`:

```properties
KEYSTORE_PATH=../app/olive-upload.keystore
KEYSTORE_PASSWORD=YOUR_KEYSTORE_PASSWORD
KEY_ALIAS=olive
KEY_PASSWORD=YOUR_KEY_PASSWORD
```

`android/.gitignore` already excludes `*.keystore` and `*.properties`
(but allows `keystore.properties.template`).

Verify: `cd android && ./gradlew bundleRelease` should produce
`android/app/build/outputs/bundle/release/app-release.aab`.

## 5 user testers

`tests/USER-TEST-PLAN.md` has the recruitment message and 30-min
test script. Post to:
- Bianca (priority — she's the actual user)
- Family / friends who are pregnant or recently had a baby
- r/BabyBumps, r/June2026BumpGroup, r/newparents

Goal: 5 testers, 1 week of feedback. If anyone reports a critical
bug, ship a 1.0.1 hotfix before the 15th.

## Submit

- **App Store:** https://appstoreconnect.apple.com → My Apps → Olive
- **Play Store:** https://play.google.com/console → Olive

The store-listing copy, screenshots, privacy URL, and support URL are
all ready. The privacy policy URL is live at
`https://contractions.ashbi.ca/privacy`.
