# Olive v1.1.0 — Release Readiness

Last updated: 2026-08-08. Status: **WEB RELEASED; ANDROID ARTIFACT READY; STORE SUBMISSION REQUIRES MANUAL CONSOLE WORK.**

Olive v1.1.0 is live at `https://contractions.ashbi.ca`. The release was
committed as `34f52ee` with the Windows cache-stamp validation fix in `83065f7`,
pushed to `main` with GitHub Actions intentionally skipped, and deployed through
the verified manual VPS path.

## Release outcome

- Provider-configurable care-plan timing replaces a fixed medical assumption.
- A reminder appears only after a sustained matching pattern and states that it
  is not a diagnosis.
- The primary action calls the user's saved care team; the reminder can be
  stopped by the user.
- A concise, objective care summary can be shared with the care team.
- Pregnancy status remains user-controlled instead of advancing automatically.
- Partner sharing stays prominent; secondary tools are grouped behind
  **More tools** to keep the labor flow calm and focused.
- The installed PWA reloads offline through service-worker cache `olive-v22`.
- No generic AI chatbot or diagnostic model was added. This is a deliberate
  safety and privacy choice, not a missing release dependency.

## Verification evidence

- `npm run verify`: lint, service-worker stamp, TypeScript, and production build
  passed.
- Local Chromium release suite: 95 passed, 23 optional/environment-dependent
  skips, 0 failed.
- Local WebKit compatibility: 9 passed, 0 failed.
- Relay suite: 15 passed, 0 failed; production-only dependency audit found 0
  vulnerabilities.
- Production Chromium checks: 9 focused product/browser tests plus 5
  accessibility/offline tests passed.
- Production WebKit checks: 9 passed.
- Store screenshots: 20/20 generated from the live app across 6.7-inch,
  6.1-inch, 5.5-inch iPhone, and 12.9-inch iPad sizes. The final shot shows the
  real saved care-plan reminder rather than the retired warning copy.

## Production deployment

- Live app image: `sha256:f7058871596ad94d67806c8898100b74012be9e72d4d38e0504ff4679745fc7c`
- Retained rollback image: `camster91/contraction-tracker:rollback-868d1b7`
- Relay health: HTTP 200 at `https://relay.ashbi.ca/health`
- Public app response: HTTP 200 with response-level CSP, HSTS,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and strict
  referrer policy.
- The relay was not rebuilt or restarted during the frontend release.

## Android

- Version: `1.1.0` (`versionCode 3`)
- Signed AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- AAB SHA-256: `C6C47C070CD08BC5F786B5FAA9AD8EAEEC0E14374DDBACA58F826D42B9C0D19C`
- Signed APK: `android/app/build/outputs/apk/release/app-release.apk`
- APK SHA-256: `459D811ED194ED526975D59D81897EE832DEA134F0B0014842AC0A744C3BD219`
- `jarsigner -verify`, `bundleRelease`, and `assembleRelease` passed. The upload
  certificate is intentionally self-signed and is valid until 2053-12-23.

## iOS

- Marketing version: `1.1.0` (build 3)
- Project metadata, privacy manifest, release notes, and upload scripts are
  prepared.
- A production archive still requires macOS, Xcode, the Apple Developer team,
  and the correct provisioning profile. Those credentials and tools are not
  present in this Windows workspace.

## Store package

- App name: Olive — Contraction Timer
- Bundle ID: `com.ashbi.olive`
- Category: Health & Fitness (primary), Medical (secondary)
- Price: free; v1.1.0 has no in-app purchase
- Privacy URL: `https://contractions.ashbi.ca/privacy`
- Support URL: `https://contractions.ashbi.ca`
- Metadata: `APP-STORE-CONNECT-FIELDS.txt`,
  `PLAY-STORE-CONSOLE-FIELDS.txt`, `WHATS-NEW.txt`, and
  `play-store-release-notes.txt`
- Screenshots:
  `C:\Users\camst\.hermes\cache\indie-ship\APPS\olive-contractions\screenshots`

## Remaining external release gates

1. Build, sign, and validate the iOS archive on macOS/Xcode.
2. Confirm the current Apple and Google privacy/data declarations in their
   consoles.
3. Upload the signed Android AAB and iOS archive, then submit them manually for
   store review.

Localization, Apple Watch/Live Activity integration, and broader native health
ecosystem features remain future product work. They are not represented as part
of this verified v1.1.0 release.
