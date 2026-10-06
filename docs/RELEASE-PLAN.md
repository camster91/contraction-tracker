# Olive current release plan

Reconciled 2026-10-05 against local source, origin/main, merged PR #77, all repository issues and the online consoles. Current scope: free native-only v1.3.0/build 6. This replaces the paid v1.2.1/relay launch route; older records remain historical.

## Issue reconciliation

| Issue | Current disposition and next action |
|---|---|
| #78 | Active shipping tracker. Prepare exact current candidate; Cameron supplies Apple signing access and original Android key. Store processing and device evidence remain open. |
| #72 | Historical v1.2.1 umbrella. Consolidate active v1.3 items into #78 after evidence is reviewed; do not close on local preparation alone. |
| #71 | Relay portion superseded by PR #77. Static support/privacy remain relevant; publish corrected prepared pages and verify public endpoints. |
| #70 | Observed pregnancy/support-person/retrospective usability evidence still missing. Current protocol: [USER-TESTING.md](USER-TESTING.md). Historical evaluator tasks must be reconciled before automated acceptance; retain consent, candidate identity and finding-resolution checks. |
| #69 | Two maternity-professional wording reviews not evidenced. Current inventory: [CLINICAL-COPY-REVIEW.md](CLINICAL-COPY-REVIEW.md), including reminder opt-in, spoken copy and objective-frequency banner; no diagnostic claims. |
| #68 | Labor-first UI exists. Current candidate fixes session provenance, manual-entry labels, keyboard focus and recovery; verify on devices before closure. |
| #67 | Paid pricing and wearable expansion deferred; release is free and contains no IAP. Current Live Activity is in scope; new wearable apps are not. |
| #65 | Still open: current signed artifacts must match reviewed source and physical-device evidence. Old Windows hashes cannot certify this edited candidate. |
| #63 | French listing/app localization deferred. Partial French source and old drafts do not establish a reviewed localized release. |
| #60 | Browser accessibility checks prepared; physical VoiceOver/TalkBack, large-text and assistive-input evidence still required. Current technical matrix: [NATIVE-DEVICE-ACCEPTANCE.md](NATIVE-DEVICE-ACCEPTANCE.md). |
| #54 | Crash-recovery export prepared and covered locally; native export needs device verification. No raw errors or clinical data are emitted to logs by the recovery UI. |
| #51 | Relay monitoring plan superseded. No telemetry introduced. Public static pages still need uptime checks and support ownership at launch. |
| #50 | Recent successful Dependabot runs do not establish full release CI capacity. Run the actual current workflows; retain local evidence meanwhile. |
| #49 | Actual store-console fields not complete. Play account verification blocks Create app; Apple sign-in/signing remains unverified. |
| #48 | Historical v1.2.1 signing task rolls into #78; current unsigned compilation is not a production-signed archive. |
| #47 | Physical Android release verification still open for the rebuilt v1.3.0 candidate. |

Closed issues remain closed; this pass does not erase their accepted history or claim their evidence applies to the new candidate. Dependency PRs #75/#76 should be reconciled against the audited lockfile; they have not been merged by this pass. No GitHub issue/PR status has been mutated.

## Execution order

1. Fix current-app defects, preserve retired work in explicit archives, pass checks on Chromium and WebKit, regenerate and inspect store assets.
2. Freeze an exact source manifest and rebuild unsigned native candidates for compile evidence. Preserve source/artifact hashes and distinguish each candidate.
3. Recover account/signing inputs, produce signed candidates and complete device/clinical/usability evidence.
4. Publish corrected static pages, complete consoles, validate processed builds, then submit and verify eventual availability.

No automatic diagnosis, relay, tracking, monetization, full French launch or additional wearable app is added to satisfy stale plans. Owner action and release receipts determine shipping completion.
