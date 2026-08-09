# Deployment readiness report: Olive v1.2.0

Date: 2026-08-09
Stack: React/Vite PWA, Capacitor Android/iOS shell, Node/Express/sql.js relay  
Target: local signed release candidate; production deployment explicitly excluded

## Decision

**Cleared for local release handoff. Not represented as deployed or store-submitted.**

Production release still requires separate authorization, deployment of relay before app, and post-deploy verification. iOS archive signing requires macOS/Xcode and Apple credentials.

## Security

- Pass: no tracked `.env` files in app or relay repositories.
- Pass: app and relay production dependency audits report zero known vulnerabilities.
- Pass: production source maps are disabled and no `.map` files exist in `dist`.
- Pass: relay host capabilities, PIN access tokens, client identity proof, normalized journey permissions, revocation purge, expiry purge, payload validation, CORS, rate limiting, and identifier stripping are regression-tested.
- Pass: care-card details, provider questions, private responsibilities, and journey notes are outside the relay journey contract.
- Skip: production HTTPS, CSP, HSTS, and edge-header revalidation; no deployment was authorized. The previously deployed version is not evidence that v1.2 is live.

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

## Native packaging

- Pass: Android version `1.2.0`, `versionCode 4`.
- Pass: signed AAB and APK built successfully; AAB JAR signature and APK v2 signature verified.
- Pass: final AAB contains the `olive-v23` service worker payload.
- Pass: iOS marketing version `1.2.0`, build 4, arm64, icons, splash assets, privacy manifest wiring, Capacitor config, and `olive-v23` copied payload verified structurally.
- Warning: iOS archive, code signing, and provisioning cannot be completed in this Windows workspace.

## Content, privacy, and store package

- Pass: changelog, What's New, Play release notes, store-console fields, privacy policy, review notes, and submission checklist reflect v1.2.0.
- Pass: release copy states that Olive is informational and not a medical device.
- Pass: privacy copy identifies reviewed responsibility sharing and lists journey categories excluded from the relay.
- Skip: current App Store Connect and Google Play declarations were not submitted or altered.

## Infrastructure and operations

- Pass: release and rollback boundaries are documented in `SHIPPING.md`.
- Skip: GitHub Actions, force deployment, production deployment, and QA-team delegation were explicitly excluded.
- Skip: monitoring and post-deploy smoke checks apply only after an authorized production release.

## Remaining external gates

1. Build and sign the iOS archive on macOS/Xcode.
2. Reconfirm store privacy/data declarations against the current console taxonomies.
3. Obtain explicit authorization before uploading, submitting, or deploying.
4. After deployment, verify public HTTPS, relay health/version, headers, service worker `olive-v23`, offline reload, mobile timer, and disposable create/view/complete/revoke flows.
