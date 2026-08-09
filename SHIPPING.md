# Olive v1.2.0 — Release Readiness

Last updated: 2026-08-08. Status: **LOCAL RELEASE CANDIDATE; PRODUCTION AND STORE SUBMISSION NOT PERFORMED.**

The production site remains on the previously verified release. v1.2.0 is prepared locally without GitHub Actions, a forced deployment, production mutation, or delegated QA-team run.

## Release scope

- Local-first birth journey spanning preparation, labor, postpartum, and archive phases
- Unified care card and private provider questions without automated clinical answers
- Practical responsibilities with explicit per-item privacy
- First-12-weeks timeline for appointments, support, reminders, notes, and milestones
- Backup schema v2 with valid v1.1 migration and IndexedDB recovery mirror
- Reviewed partner sharing limited to normalized responsibilities
- Category-scoped relay capability enforcement and proven idempotent partner completion
- Service-worker cache `olive-v23`

The contraction timer remains the primary labor action. Olive does not infer a medical state, score recovery, diagnose symptoms, or provide medication advice.

## Local verification evidence

- `npm run verify`: lint, service-worker version check, TypeScript, and production build passed.
- Full Chromium suite: 110 passed, 23 environment-dependent skips, 0 failed.
- Focused journey Chromium suite: 15 passed, 0 failed.
- Focused journey WebKit suite: 3 passed, 0 failed.
- Relay security suite: 17 passed, 0 failed.
- App and relay production dependency audits: 0 known vulnerabilities.
- `git diff --check`: clean apart from informational Windows line-ending notices.

## Android

- Version: `1.2.0` (`versionCode 4`)
- Release command: `.\android\gradlew.bat -p android bundleRelease assembleRelease`
- Signed AAB: `android/app/build/outputs/bundle/release/app-release.aab`
  - SHA-256: `124CB4CBBFDF6911BD04F4444EDC673C0098B4A1F250D9330845F94A8036217F`
  - JAR signature verified; the upload certificate is self-signed and expires 2053-12-23.
- Signed APK: `android/app/build/outputs/apk/release/app-release.apk`
  - SHA-256: `F792E6BF319BFF3DD55F8070D413EDE14D33C2CC14879F8869E5657BB83B5CF6`
  - Android APK Signature Scheme v2 verified with one signer.
- Gradle `clean bundleRelease assembleRelease` completed successfully.

## iOS

- Marketing version: `1.2.0` (build 4)
- Project metadata, arm64 requirement, 12 app-icon assets, splash assets, wired privacy manifest, Capacitor config, and copied `olive-v23` web payload were structurally verified.
- A production archive still requires macOS, Xcode, an Apple Developer team, and the correct provisioning profile. Those external tools and credentials are not present in this Windows workspace.

## Store package

- App name: Olive — Contraction Timer
- Bundle ID: `com.ashbi.olive`
- Category: Health & Fitness (primary), Medical (secondary)
- Price: free; v1.2.0 has no in-app purchase
- Privacy URL: `https://contractions.ashbi.ca/privacy`
- Support URL: `https://contractions.ashbi.ca`
- Metadata: `APP-STORE-CONNECT-FIELDS.txt`, `PLAY-STORE-CONSOLE-FIELDS.txt`, `WHATS-NEW.txt`, and `play-store-release-notes.txt`

## Explicitly excluded actions

- No GitHub Actions invocation
- No force deployment or production deployment
- No app-store upload or submission
- No QA-team delegation

## External handoff gates

1. Build and sign the iOS archive on macOS/Xcode.
2. Reconfirm Apple and Google privacy/data declarations in their current consoles.
3. Upload the signed Android AAB and iOS archive only after explicit approval.
4. Run post-deploy production smoke tests only after a separately authorized release.
