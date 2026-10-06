# Olive v1.3.0 release readiness

Updated 2026-10-05. **Local release preparation; not uploaded, validated by Apple, or shipped.**

The current candidate uses version 1.3.0/build 6 and bundle/package ID `com.ashbi.olive`. It is free and native-only. Partner relay sharing, the public web app, memory-book PDF and Baby-is-here modal were removed in PR #77. Preserve the original Android upload key.

See [the current release plan](docs/RELEASE-PLAN.md) for the reconciled issue inventory and [the submission checklist](SUBMISSION-CHECKLIST.md) for the remaining steps. Earlier Windows AAB/APK hashes describe earlier source and cannot certify this candidate.

## Local checks

Run `npm ci`, `npm run verify`, `node --test tests/unit/*.mjs`, `npx playwright test`, `npm audit`, `node scripts/check-store-assets.mjs`, and `node scripts/check-store-metadata.mjs`. Current-feature tests remain active; retired-feature coverage is retained in `tests/legacy/v1.2/` with its rationale. Tests and unsigned builds are preparation evidence, not store acceptance.

`./scripts/build-ios-archive.sh` creates a fresh unsigned archive. `DEVELOPMENT_TEAM=YOUR_TEAM ./scripts/build-ios.sh` prepares a signed export when an authorized paid developer team and provisioning are configured. Neither script uploads. `./scripts/build-android.sh` requires the existing keystore and its protected properties file; it does not generate a replacement key.

## External gates observed

- App Store Connect opens at Apple sign-in. Team, app record, signing profile and uploaded build availability remain unverified.
- Google Play Console's Ashbi Design organization cannot create an app until identity, organization website and phone verification are complete. Olive is not in the visible app list.
- The original Android upload key is not on this Mac; issue #78 identifies the protected copy on CAM-DESKTOP.
- Physical iPhone/iPad and Android device checks remain open, especially background timing, Live Activity, notification permission and native file sharing.
- The public privacy URL responds, but the current prepared support/privacy copy must be published and verified before submission.

Store URLs: privacy `https://olive.ashbi.ca/privacy/`; prepared support `https://olive.ashbi.ca/support/`. Verify these against the published pages and actual console fields before uploading. No current console declaration or age questionnaire is claimed complete.
