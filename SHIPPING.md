# Olive v1.2.0 — Release Readiness

Last updated: 2026-08-10. Status: **PWA v1.2.1 READY FOR AUTHORIZED DEPLOYMENT; RELAY v1.1.0 DEPLOYED; STORE SUBMISSION NOT PERFORMED.**

Olive v1.2.0 and relay v1.1.0 were manually deployed to the Ashbi VPS on 2026-08-09 after a database backup and retained source/image rollback snapshots. This v1.2.1 PWA patch adds live reviewed-task reconciliation with a fresh cache payload; store upload and submission remain separate actions.

## Release scope

- Local-first birth journey spanning preparation, labor, postpartum, and archive phases
- Unified care card and private provider questions without automated clinical answers
- Practical responsibilities with explicit per-item privacy
- First-12-weeks timeline for appointments, support, reminders, notes, and milestones
- Backup schema v2 with valid v1.1 migration and IndexedDB recovery mirror
- Reviewed partner sharing limited to normalized responsibilities
- Category-scoped relay capability enforcement and proven idempotent partner completion
- Host reconciliation preserves a partner's reviewed-task completion across reload, focus, and reconnect without synchronizing private tasks
- Active hosts also reconcile reviewed-task completions from the relay event stream without a reload
- Service-worker cache `olive-v24`

The contraction timer remains the primary labor action. Olive does not infer a medical state, score recovery, diagnose symptoms, or provide medication advice.

## Local verification evidence

- `npm run verify`: lint, service-worker version check, TypeScript, and production build passed.
- Full Chromium suite: 110 passed, 23 environment-dependent skips, 0 failed.
- Focused journey Chromium suite: 15 passed, 0 failed.
- Focused journey WebKit suite: 3 passed, 0 failed.
- Relay security suite: 17 passed, 0 failed.
- Shared-responsibility reconciliation: 11 unit checks and a local app-plus-relay browser regression passed.
- App and relay production dependency audits: 0 known vulnerabilities.
- `git diff --check`: clean apart from informational Windows line-ending notices.

## Production verification evidence

- Relay v1.1.0 health endpoint, public HTTPS, and HTTP-to-HTTPS redirect passed.
- Production app served the v1.2.0 `olive-v23` payload with HSTS, CSP, `nosniff`, referrer policy, and frame protection headers before this v1.2.1 patch deployment.
- Production mobile checks passed: the host/partner responsibility reconciliation regression and five core timer/offline scenarios.
- A disposable PIN/capability share denied anonymous access, permitted validated viewer and host actions, then returned `410` after authorized revocation.
- GitHub-hosted workflows triggered by the push failed before any runner was allocated. The manual deployment and production checks above are independently verified; restoring hosted-runner availability remains an external automation task.

## Android

- Version: `1.2.0` (`versionCode 4`)
- Release command: `.\android\gradlew.bat -p android bundleRelease assembleRelease`
- Signed AAB: `android/app/build/outputs/bundle/release/app-release.aab`
  - SHA-256: `D3BBEAB3916B79C819E7C532538A00E6FCC9E3052CE27488EE6CB4AB6BA70A03`
  - JAR signature verified; the upload certificate is self-signed and expires 2053-12-23.
- Signed APK: `android/app/build/outputs/apk/release/app-release.apk`
  - SHA-256: `B44C0A7F0710DA0265CBC18D1109C9A1863D0EC279F09D80E152CF9632740E99`
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

- No app-store upload or submission
- No QA-team delegation

## External handoff gates

1. Build and sign the iOS archive on macOS/Xcode.
2. Reconfirm Apple and Google privacy/data declarations in their current consoles.
3. Upload the signed Android AAB and iOS archive only after explicit approval.
4. Restore GitHub-hosted runner availability before relying on repository Actions as a release gate.
