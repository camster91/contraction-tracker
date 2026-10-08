> Historical planning/evidence. Current v1.3.0 scope and release gates are in [RELEASE-PLAN.md](RELEASE-PLAN.md). Do not use this file as current submission approval or artifact evidence.

# Olive marketplace policy review

Status: local submission contracts updated and verified on September 1, 2026; console answers and public submission remain owner-gated.

## Current platform requirements

| Requirement | Authoritative source | Olive evidence | Status |
| --- | --- | --- | --- |
| App Store uploads use Xcode 26+ and an iOS 26 SDK | Apple Upcoming Requirements: https://developer.apple.com/news/upcoming-requirements/ | Full selected toolchain reports Xcode 26.6 and iPhoneOS SDK 26.5; both archive scripts reject older Xcode versions. | Verified locally |
| Apple 2026 age-rating questions are complete | Apple Upcoming Requirements: https://developer.apple.com/news/upcoming-requirements/ | Required answers and evidence capture are documented in `APP-STORE-CONNECT-FIELDS.txt` and `SUBMISSION-CHECKLIST.md`. | Console action open |
| EU trader status is verified for EU availability | Apple Upcoming Requirements: https://developer.apple.com/news/upcoming-requirements/ | Store packet blocks an EU-availability claim until the Account Holder verifies trader status. | Console action open |
| New Android submissions target API 36 from August 31, 2026 | Google Play target API requirements: https://support.google.com/googleplay/android-developer/answer/11926878 | `android/variables.gradle` targets API 36 and the store checker enforces it. | Verified locally |
| Health apps complete an accurate declaration | Google Play Health apps declaration: https://support.google.com/googleplay/android-developer/answer/14738291 | Store packet selects Reproductive and Sexual Health and explicitly does not select Medical Device Apps. | Console action open |
| Non-medical health apps include the required description disclaimer and professional-care direction | Google Play Health Content and Services: https://support.google.com/googleplay/android-developer/answer/16679511 | Exact non-medical-device and consult-a-healthcare-professional statements are in the Play full description and enforced by `check:store`. | Verified locally |
| Collected data and optional relay sharing are declared | Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/ and Google Play Data safety: https://support.google.com/googleplay/android-developer/answer/10787469 | Conservative Apple privacy-manifest and store-label fields cover optional relay health, name, photo, other-content and random-ID data; on-device-only data is distinguished in the privacy policy. | Candidate/console reconciliation open |

## Corrected blocker

The submission runbook previously told the owner to create the Google Play app as **Free**, while the approved model is CAD $1.99 paid upfront. That instruction could permanently prevent the existing package from becoming paid. It now requires **Paid** before any rollout, and `npm run check:store` rejects a return of the contradictory instruction.

## Remaining authority and evidence boundaries

- Do not submit health, privacy, age-rating, trader, pricing, or Data safety answers until they are reconciled against the exact signed internal-track binaries.
- Apple trader verification, console declarations, agreements, pricing, submission, and public rollout require Account Holder action and explicit release approval.
- Google Play Health apps and Data safety declarations must be saved in the console for the exact package; this repository packet is preparation, not proof of console completion.
- The privacy manifest is structurally wired and locally valid, but App Store Connect privacy answers still require candidate-time comparison with every SDK and relay behavior.
