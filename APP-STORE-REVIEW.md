# Olive v1.3.0 Apple review readiness

**Apple acceptance is unverified.** October 8 review: build 12 is signed, processed, Testing in both existing TestFlight groups and attached to the public draft with reload verification. Build 11 is retained as earlier beta evidence. Build 12 supersedes it as the prepared runtime candidate after adding private-data backup exclusion. Build 12 source is `22dceb8fed88c9c5ce71da46fc123388fc359568`; strict signed-export and embedded provenance checks passed. Its upload/processing and draft-attachment state is tracked in SHIPPING.md and task outputs/remediation-build12. Public status remains Prepare for Submission.

Do not treat beta availability as public App Review approval. Apple's guidelines 1.4.1, 2.1, 4.2 and 5.1 remain the relevant review risks: health interpretation, completeness, native utility and privacy. See https://developer.apple.com/app-store/review/guidelines/. Two professional reviews and the observed-user study are repository gates, not a claim that Apple requires those exact studies.

## Prepared behavior

Olive records user-entered contractions and private birth-journey information. No account is required. Timing reminders are disabled by default and must be enabled with care-team instructions; they report observed timing and do not diagnose labor or determine that waiting is safe. The timer, local backup and care summary work without a relay. The current UI does not offer speech recognition, partner share links or a memory-book PDF.

The app includes a Live Activity extension; signatures, team and entitlements must be validated on the signed artifact. Native exports use the platform share sheet and a temporary cache file. Offline and browser journeys help identify bugs but do not certify native sharing, notifications or lock-screen behavior.

## Privacy preparation

The source privacy manifest declares no off-device data collection or tracking and lists the required reasons for UserDefaults and FileTimestamp access. Inspect the manifests bundled by Capacitor dependencies in the actual archive. Confirm App Store privacy answers from that binary and the published privacy policy. User-selected file exports may leave the device through another app; the policy must explain that clearly.

## Outstanding review evidence

- Build 12 processing/compliance/beta is complete; final draft attachment persistence is tracked in task console evidence. Public review and acceptance remain unverified.
- Physical iPhone/iPad journeys, VoiceOver, enlarged text, battery/background behavior and Live Activity actions.
- Native backup export/import and recovery on devices, including denied permissions/storage failure.
- Publish and verify build 12 privacy wording. Existing English pages are live; SSH failed during this review. Privacy label, age rating, content rights and free pricing are saved. Copyright, territories and applicable trader/medical-device declarations require owner facts.
- Final screenshots reconciled to the processed binary, accurate metadata and English-only scope.
- Review of care-team reminder wording and observed usability evidence tracked in issues #69/#70/#60.

No claim is made that Apple has approved the name/trademark, age rating, legal declarations, device matrix, or medical wording. App Review is a separate decision after technical validation.

## Backup privacy remediation

Build 12 excludes Library (including WebKit localStorage) and Documents from automatic device backup at launch, activation and background transitions. Actual Simulator directories have the MobileBackup exclusion attribute. This is supplementary native evidence, not proof of physical iCloud backup behavior; older backups and manual exports remain user-managed. No records are deleted. Exact source, IPA and payload hashes are in task outputs/remediation-build12/ios-evidence.json.
