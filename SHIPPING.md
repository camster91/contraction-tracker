# Olive v1.3.0 — Release Readiness

Last updated: 2026-09-23. Status: **v1.3.0 READY FOR STORE SUBMISSION. PRIVATE-BY-DEFAULT, NATIVE-ONLY RELEASE; PUBLIC WEB APP AND RELAY DECOMMISSIONED.**

Olive v1.3.0 removes partner sharing, the relay backend, the memory book PDF, and the Baby-is-here modal, and retires the public web app. The native iOS/Android apps (built from the same web bundle, shipped inside the app) are the only distribution channel. Store upload and submission remain separate actions.

## Release scope

- Local-first birth journey spanning preparation, labor, postpartum, and archive phases
- Unified care card and private provider questions without automated clinical answers
- Practical responsibilities kept on this device
- First-12-weeks timeline for appointments, support, reminders, notes, and milestones
- Backup schema v2 with valid v1.1 migration and IndexedDB recovery mirror; imports tolerate (and ignore) the `shares` key written by older versions
- No network requests: no relay, no sync server, no analytics, no tracking

The contraction timer remains the primary labor action. Olive does not infer a medical state, score recovery, diagnose symptoms, or provide medication advice.

## Local verification evidence

- `npm run verify` (lint + production build) passed.
- Playwright Chromium suite passed after removing the share-only specs; `changelog` and `privacy` specs pass against the new policy copy and privacy URL.
- `node --test tests/unit/*.mjs` passed.
- Production dependency audit: 0 known vulnerabilities (`npm audit --omit=dev`; the remaining findings are dev-only tooling).
- GitHub-hosted Actions are billing-blocked on this account, so local verification is authoritative for this release.

## Decommissioned infrastructure

- The public PWA at contractions.ashbi.ca and the relay at relay.ashbi.ca are shut down; their deploy workflows, Dockerfile, service worker, and monitoring scripts were removed from the repo.
- Relay share data is wiped per the old privacy policy's expiry promise.
- The privacy policy now lives at https://olive.ashbi.ca/privacy (static page), reachable for App Store / Play Store review.

## Android

- Version: `1.3.0` (`versionCode 6`)
- Release command: `.\android\gradlew.bat -p android bundleRelease assembleRelease`
- Signed AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- Built 2026-09-23 from main `c1bed1e` on CAM-DESKTOP (Temurin JDK 21, Android SDK build-tools 36.1.0):
  - AAB SHA-256: `8c1f1ff9b79e314ff88f29b734c28a60662a22d8968d3e4d14981da77640fbc5` (4,916,615 bytes)
  - Tester APK SHA-256: `76c148b85a07dd60c0cd2cc9ee4aea6d47fee42e6fa2b700ecbf8893f8b333e5` (5,127,001 bytes, `app-release.apk`)
  - JAR-signature check: `jarsigner -verify app-release.aab` → "jar verified."; `apksigner verify` on the APK confirms the upload key (SHA-256 `795331565b4325bd05c84817b30ddfbc9dc3c674fe432af6ef423b24c7739407`, CN=Olive, OU=Mobile, O=Ashbi)
  - Badging: `package: name='com.ashbi.olive' versionCode='6' versionName='1.3.0'`
- Upload keystore: `android/app/olive-upload.keystore` (alias `olive`, generated 2026-09-23, validity 25,000 days). It is gitignored; passwords are in `android/app/keystore.properties` (also gitignored). **Back up both — losing the upload key requires a Google Play key reset to ever update the app.**

## iOS

- Marketing version: `1.3.0` (build 6)
- A production archive still requires macOS, Xcode, an Apple Developer team, and the correct provisioning profile. Those external tools and credentials are not present in this Windows workspace.

## Store package

- App name: Olive — Contraction Timer
- Bundle ID: `com.ashbi.olive`
- Category: Health & Fitness (primary), Medical (secondary)
- Price: free; v1.3.0 has no in-app purchase
- Privacy URL: `https://olive.ashbi.ca/privacy`
- Support URL: `https://olive.ashbi.ca`
- Metadata: `APP-STORE-CONNECT-FIELDS.txt`, `PLAY-STORE-CONSOLE-FIELDS.txt`, `WHATS-NEW.txt`, and `play-store-release-notes.txt`

## Explicitly excluded actions

- No app-store upload or submission
- No QA-team delegation

## External handoff gates

1. Build and sign the iOS archive on macOS/Xcode.
2. Reconfirm Apple and Google privacy/data declarations in their current consoles (both now "Data Not Collected").
3. Stand up the olive.ashbi.ca static privacy page before submitting — the stores validate the privacy URL.
4. Upload the signed Android AAB and iOS archive only after explicit approval.