# Olive v1.3.0 Apple review readiness

**Apple acceptance is unverified.** An unsigned archive cannot pass Apple signing or upload validation. The local app builds, but the final signed candidate still requires native-device testing and App Store Connect processing. Follow `SUBMISSION-CHECKLIST.md`.

## Prepared behavior

Olive records user-entered contractions and private birth-journey information. No account is required. Timing reminders are disabled by default and must be enabled with care-team instructions; they report observed timing and do not diagnose labor or determine that waiting is safe. The timer, local backup and care summary work without a relay. The current UI does not offer speech recognition, partner share links or a memory-book PDF.

The app includes a Live Activity extension; signatures, team and entitlements must be validated on the signed artifact. Native exports use the platform share sheet and a temporary cache file. Offline and browser journeys help identify bugs but do not certify native sharing, notifications or lock-screen behavior.

## Privacy preparation

The source privacy manifest declares no off-device data collection or tracking and lists the required reasons for UserDefaults and FileTimestamp access. Inspect the manifests bundled by Capacitor dependencies in the actual archive. Confirm App Store privacy answers from that binary and the published privacy policy. User-selected file exports may leave the device through another app; the policy must explain that clearly.

## Outstanding review evidence

- Paid Apple team, profiles, signed IPA and validation/upload receipt.
- Physical iPhone/iPad journeys, VoiceOver, enlarged text, battery/background behavior and Live Activity actions.
- Native backup export/import and recovery on devices, including denied permissions/storage failure.
- Current published support/privacy pages and actual console declarations/questionnaires.
- Final screenshots reconciled to the processed binary, accurate metadata and English-only scope.
- Review of care-team reminder wording and observed usability evidence tracked in issues #69/#70/#60.

No claim is made that Apple has approved the name/trademark, age rating, legal declarations, device matrix, or medical wording. App Review is a separate decision after technical validation.
