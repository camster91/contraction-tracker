# Olive v1.3.0 submission checklist

Prepared locally; no store upload or submission has occurred. Build 6 must be confirmed unused in App Store Connect before signing/uploading. Do not infer review timing or approval from a local test.

1. Complete current source checks and retain a source manifest with artifact hashes. Review `docs/RELEASE-PLAN.md` and reconcile all remaining current-scope issues.
2. Cameron signs into App Store Connect and confirms paid Apple Developer membership, Team ID, app record `com.ashbi.olive`, and build availability. Configure the app and Live Activity extension under that same team and valid profiles.
3. Recover the existing Android keystore and properties from CAM-DESKTOP using a protected transfer. Match the known original certificate fingerprint in issue #78; never create a substitute key.
4. Run signed release builds. Verify embedded extension, app/extension entitlements, privacy manifests, signatures, version and source/artifact identity. Export to a new directory.
5. Run physical iPhone/iPad and Android acceptance using `docs/NATIVE-DEVICE-ACCEPTANCE.md`: install, offline timer, reload/relaunch, background/lock-screen elapsed timing, notification denial, Live Activity Start/Stop, backup Save to Files/share/import and failure recovery. Include VoiceOver/TalkBack and large text. Browser emulation does not satisfy this step. Complete the independent wording and observed-user evidence in `docs/CLINICAL-COPY-REVIEW.md` and `docs/USER-TESTING.md` for issues #69/#70/#60. These repository review gates are separate from store rules. The historical evidence evaluator needs its retired-feature inventory reconciled before it can certify current records.
6. Publish and verify prepared static privacy/support pages at olive.ashbi.ca. Confirm email support and accurate local-only/export disclosure. Capture evidence from the published pages.
7. Cameron completes Google Play organization identity, website and phone verification. Create Olive after Create app is enabled.
8. Populate actual App Store privacy and Play data-safety/health-app declarations from the final binary; complete current age/content/export compliance questionnaires. Prepared field files are drafts, not completed console settings.
9. Upload the exact signed candidates to internal testing/TestFlight, wait for processing, and run Apple Organizer/Transporter validation. Address all findings without bypassing tests. Before public submission, publish the reviewed source/workflows through the authorized GitHub path and retain successful actual release-workflow runs for #50; dependency-bot runs do not establish this evidence.
10. Reconcile store screenshots/listing with the processed binary and current English release. French localization remains a separate reviewed scope. Submit only the tested build, retain receipt and then separately verify store approval and public availability.

Owner of account/signing/verification inputs: Cameron. Implementation and preparation: Codex in this checkout. Current tracker: GitHub issue #78.
