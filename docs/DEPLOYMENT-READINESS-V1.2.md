# Deployment readiness report: Olive v1.2.1

Date: 2026-08-10
Stack: React/Vite PWA, Capacitor Android/iOS shell, Node/Express/sql.js relay  
Target: deployed production web and relay, with PWA v1.2.1 patch ready for authorized deployment; native-store submission excluded

## Decision

**Production web and relay deployment verified. This v1.2.1 PWA patch is locally verified and ready for the authorized deployment in progress; it is not store-submitted.**

Relay v1.1.0 was deployed before Olive v1.2.0, with a relay database backup and retained rollback images/source snapshots. The v1.2.1 PWA patch adds active-session reviewed-task reconciliation and cache `olive-v24`. iOS archive signing still requires macOS/Xcode and Apple credentials.

## Security

- Pass: no tracked `.env` files in app or relay repositories.
- Pass: app and relay production dependency audits report zero known vulnerabilities.
- Pass: production source maps are disabled and no `.map` files exist in `dist`.
- Pass: relay host capabilities, PIN access tokens, client identity proof, normalized journey permissions, revocation purge, expiry purge, payload validation, CORS, rate limiting, and identifier stripping are regression-tested.
- Pass: care-card details, provider questions, private responsibilities, and journey notes are outside the relay journey contract.
- Pass: public HTTPS/TLS, HTTP-to-HTTPS redirect, CSP, HSTS, `nosniff`, referrer policy, frame protection, no `.git` exposure, and no public source maps were revalidated after deployment.

## Responsive and accessibility

- Pass: complete Chromium mobile regression finished with 110 passes, 23 environment-dependent skips, and zero failures.
- Pass: focused journey Chromium suite finished 15/15.
- Pass: focused journey WebKit suite finished 3/3.
- Pass: 320px layout, modal semantics, focus containment/restoration, zoom, keyboard activation, and minimum journey-action target sizes are covered.
- Warning: no new physical-device VoiceOver/NVDA session was performed for this local candidate.

## Functionality and data integrity

- Pass: journey CRUD persists locally and survives reload.
- Pass: corrupt primary journey storage recovers from its shadow without modifying contraction data.
- Pass: backup v2 preserves journey records and valid v1.1 backups remain importable.
- Pass: phase changes require an explicit owner action.
- Pass: reviewed responsibilities are opt-in and partner completion is idempotent.
- Pass: host reload, focus, and reconnect reconcile a partner's reviewed-task completion before automatic sync; private tasks remain local-only.
- Pass: installed-app offline reopening remains covered by the full regression suite.
- Pass: post-deploy mobile Chromium checks passed for the partner reconciliation flow and all five core timer/offline scenarios.

## Native packaging

- Pass: Android version `1.2.1`, `versionCode 5`; a clean signed AAB and APK were built successfully and AAB JAR/APK v2 signatures verified.
- Pass: final Android and copied iOS payloads contain the `olive-v24` service worker.
- Pass: iOS marketing version `1.2.1`, build 5, arm64, icons, splash assets, privacy manifest wiring, and Capacitor config were structurally verified.
- Warning: iOS archive, code signing, and provisioning cannot be completed in this Windows workspace.

## Content, privacy, and store package

- Pass: What's New, Play release notes, store-console fields, privacy policy, and submission checklist were refreshed for v1.2.1.
- Pass: release copy states that Olive is informational and not a medical device.
- Pass: privacy copy identifies reviewed responsibility sharing and lists journey categories excluded from the relay.
- Skip: current App Store Connect and Google Play declarations were not submitted or altered.

## Infrastructure and operations

- Pass: release and rollback boundaries are documented in `SHIPPING.md`.
- Pass: manual relay-first deployment used a verified ZIP transfer, retained rollback images/source snapshots, and a relay database backup.
- Warning: GitHub-hosted workflows triggered by the push failed before runner allocation; hosted automation is not presently a usable release gate.

## Remaining external gates

1. Build and sign the iOS archive on macOS/Xcode.
2. Reconfirm store privacy/data declarations against the current console taxonomies.
3. Restore GitHub-hosted runner availability before treating repository Actions as a required release gate.
4. Obtain explicit authorization before uploading or submitting to either app store.
