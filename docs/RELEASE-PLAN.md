> Current October 8 reconciliation: build 12/source 22dceb8fed88c9c5ce71da46fc123388fc359568 is signed, uploaded, Testing in both existing TestFlight groups and attached to the public draft. English support/privacy are published and exact-source verified. Draft PR #79 head 1cc398ad019c62373b1bf3a0ec44bf7b878d3609 passed Build, Lint, GitGuardian and 218 strict browser tests with zero skips. Owner declarations, physical/professional/observed-user gates, original Android key and Google verification remain open. No merge or public App Store submission/release is recorded. Earlier build identities below are historical. French, relay, monetization and wearable expansion remain deferred.

# Olive current release plan

Build 7 continuation, 2026-10-07: apply the approved botanical brand, working
Night/Daylight appearances, stable Start/Stop tap area, native launch/icon and
privacy/support access. Build 6's earlier upload does not certify this candidate.
See `docs/BRANDING.md` and `SHIPPING.md` for the current source scope. The issue
inventory below is retained as historical planning context; physical-device,
observed-user and clinical-copy reviews remain separate open gates.

Reconciled 2026-10-05 against local source, origin/main, merged PR #77, all repository issues and the online consoles. Current scope: free native-only v1.3.0/build 6. This replaces the paid v1.2.1/relay launch route; older records remain historical.

## Issue reconciliation — updated October 8

| Issue | Current disposition and next action |
|---|---|
| #78 | Active shipping tracker. Build 12 beta is available; Apple signing/processing complete. Device/reviewer evidence, owner facts, Android signing/account and public review remain open. |
| #72 | Historical v1.2.1 umbrella. Consolidate active v1.3 items into #78 after evidence is reviewed; do not close on local preparation alone. |
| #71 | Relay portion superseded by PR #77. Static support/privacy are published and exact-source verified, including build 12 privacy. |
| #70 | Observed pregnancy/support-person/retrospective usability evidence still missing. Current protocol: [USER-TESTING.md](USER-TESTING.md). Historical evaluator tasks must be reconciled before automated acceptance; retain consent, candidate identity and finding-resolution checks. |
| #69 | Two maternity-professional wording reviews not evidenced. Current inventory: [CLINICAL-COPY-REVIEW.md](CLINICAL-COPY-REVIEW.md), including reminder opt-in, spoken copy and objective-frequency banner; no diagnostic claims. |
| #68 | Labor-first UI exists. Current candidate fixes session provenance, manual-entry labels, keyboard focus and recovery; verify on devices before closure. |
| #67 | Paid pricing and wearable expansion deferred; release is free and contains no IAP. Current Live Activity is in scope; new wearable apps are not. |
| #65 | Still open: signed iOS and matching unsigned Android source/payload identities are verified; original Android signing and physical-device evidence remain open. |
| #63 | French listing/app localization deferred. Partial French source and old drafts do not establish a reviewed localized release. |
| #60 | Browser accessibility checks prepared; physical VoiceOver/TalkBack, large-text and assistive-input evidence still required. Current technical matrix: [NATIVE-DEVICE-ACCEPTANCE.md](NATIVE-DEVICE-ACCEPTANCE.md). |
| #54 | Crash-recovery export prepared and covered locally; native export needs device verification. No raw errors or clinical data are emitted to logs by the recovery UI. |
| #51 | Relay monitoring plan superseded. No telemetry introduced. Public static endpoints pass current HTTPS checks; support ownership at launch remains required. |
| #50 | Actual release workflows passed on PR #79 head 1cc398a: Build, Lint and strict Chromium/WebKit gauntlet (218 passed, zero skipped). Keep acceptance evidence separate from merge. |
| #49 | Apple beta, draft build, listing screenshots/copy, privacy, ratings, rights and free price are verified. Owner copyright/territories/applicable declarations remain open. Play verification blocks Create app. |
| #48 | Historical v1.2.1 signing task rolls into #78; build 12 iOS signing/export is verified; public release remains open. |
| #47 | Physical Android release verification still open for the rebuilt v1.3.0 candidate. |

Closed issues remain closed; this pass does not erase their accepted history or claim their evidence applies to the new candidate. Dependency PRs #75/#76 should be reconciled against the audited lockfile; they have not been merged by this pass. Draft PR #79 is published within explicit approval; existing issues remain open.

## Execution order

1. Fix current-app defects, preserve retired work in explicit archives, pass checks on Chromium and WebKit, regenerate and inspect store assets.
2. Freeze an exact source manifest and rebuild unsigned native candidates for compile evidence. Preserve source/artifact hashes and distinguish each candidate.
3. Recover account/signing inputs, produce signed candidates and complete device/clinical/usability evidence.
4. Publish corrected static pages, complete consoles, validate processed builds, then submit and verify eventual availability.

No automatic diagnosis, relay, tracking, monetization, full French launch or additional wearable app is added to satisfy stale plans. Owner action and release receipts determine shipping completion.
