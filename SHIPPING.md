> October 7 age-rating update: App Store Connect questionnaire saved and verified after reload. Apple calculated 9+ in 172 countries/regions, 12+ in Vietnam/Brazil and All in Korea; earlier operating systems show global 4+ with regional exceptions. No override or Made for Kids category. This does not establish medical-device classification. A fresh Chrome upload attempt still failed on extension file-URL permission; screenshots remain prepared, zero uploaded. Evidence: task outputs/remediation-build10/apple-age-rating-evidence.json and apple-age-rating.png.

> October 7 current handoff: build 10 source c354b34621b8055082f363d523f357c899d4287b has a verified signed iOS export and successful Xcode upload. Ten native iPhone/iPad screenshots are prepared with source, dimensions and hashes. Canonical listing metadata and Apple build field now name build 10; these draft fields are not claimed saved in the console. Public privacy/support pages were freshly verified HTTP 200 and byte-identical. Current distribution/device/professional/account gates remain open; the entries below retain historical evidence.

> October 7 build-10 continuation: native date-field overflow was fixed and verified with Apple picker behavior. Final source c354b34621b8055082f363d523f357c899d4287b, 1.3.0 (10). Signed iOS/source/payload checks passed and Xcode upload succeeded; Apple processing/compliance/TestFlight await Chrome reconnection. Android host tests and unsigned candidates passed; original key absent. Five actual native iPhone images and unreviewed professional packet are prepared. Physical/iPad/Android/professional/account/store-release gates remain open. Earlier candidate records below are history.

> October 7 build-9 continuation: header alignment correction is frozen at eaad99ecb5152a50a1cb79d2c2305d132e5bcf8e, 1.3.0 (9). Signed iOS export/source/payload verified and Xcode upload succeeded. Processing, compliance and TestFlight availability await Chrome reconnect. Android host tests and unsigned AAB/APK builds passed; original upload key absent. Five native Simulator captures and keyboard Close evidence retained in task outputs/remediation-build9. Physical and professional review gates remain open. Build-8 status below is historical evidence for that candidate.

> October 7 build-8 status: source 235e91f6ab596a230c0e04115fdb9405a430efd6. Signed iOS export verified and Xcode upload succeeded; Apple processing completed, export compliance was saved, and build 8 is Testing in Olive Internal Testing (Cameron only). What to Test instructions were saved. Build 7 remains the pending external beta review; both Bianca tester records currently have No Builds Available. Android AAB/APK built with matching embedded payload/source identity but remains unsigned. Protected original upload key is still required from CAM-DESKTOP. Evidence: task outputs/remediation-build8. Native Simulator launch is supplementary; physical-device acceptance and two professional copy reviews remain open. Older evidence below retains its original source/build identity.

# Olive v1.3.0 release readiness

Updated 2026-10-07. **Build 7 is the botanical rebrand candidate; public store acceptance is still open.**

The current remediation candidate uses version 1.3.0/build 8 and bundle/package ID `com.ashbi.olive`. It is free and native-only. Build 6 was previously signed and uploaded to TestFlight; it is a separate source/artifact and must not be represented as the rebrand. Partner relay sharing, the public web app, memory-book PDF and Baby-is-here modal were removed in PR #77. Preserve the original Android upload key.

See [the current release plan](docs/RELEASE-PLAN.md) for the reconciled issue inventory and [the submission checklist](SUBMISSION-CHECKLIST.md) for the remaining steps. Earlier Windows AAB/APK hashes describe earlier source and cannot certify this candidate.

## Local checks

Run `npm ci`, `npm run verify`, `node --test tests/unit/*.mjs`, `npx playwright test`, `npm audit`, `node scripts/check-store-assets.mjs`, and `node scripts/check-store-metadata.mjs`. Current-feature tests remain active; retired-feature coverage is retained in `tests/legacy/v1.2/` with its rationale. Tests and unsigned builds are preparation evidence, not store acceptance.

`./scripts/build-ios-archive.sh` creates a fresh unsigned archive. `DEVELOPMENT_TEAM=YOUR_TEAM ./scripts/build-ios.sh` prepares a signed export when an authorized paid developer team and provisioning are configured. Neither script uploads. `./scripts/build-android.sh` requires the existing keystore and its protected properties file; it does not generate a replacement key.

## External gates observed

- Prior task evidence records build 6 uploaded, internal testing available and external beta review pending. Verify current App Store Connect state before changing distribution. Build 7 needs its own signed artifact and processing evidence.
- Google Play Console's Ashbi Design organization cannot create an app until identity, organization website and phone verification are complete. Olive is not in the visible app list.
- The original Android upload key is not on this Mac; issue #78 identifies the protected copy on CAM-DESKTOP.
- Physical iPhone/iPad and Android device checks remain open, especially background timing, Live Activity, notification permission and native file sharing.
- English privacy/support URLs returned HTTP 200 and exactly matched the reviewed repository HTML on 2026-10-07. French public pages remain outside the current English release scope. The public endpoint checker now uses the canonical Olive domain.

Store URLs: privacy `https://olive.ashbi.ca/privacy/`; prepared support `https://olive.ashbi.ca/support/`. Verify these against the published pages and actual console fields before uploading. No current console declaration or age questionnaire is claimed complete.
