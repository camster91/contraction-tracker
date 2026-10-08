> Historical planning/evidence. Current v1.3.0 scope and release gates are in [RELEASE-PLAN.md](RELEASE-PLAN.md). Do not use this file as current submission approval or artifact evidence.

# Olive marketplace roadmap

Status: active. This is the authoritative engineering and launch backlog. `PAID-LAUNCH-GATE.md` remains the authoritative evidence gate for public claims and release approval.

Current engineering baseline (September 1, 2026): the release checks pass web/store verification, 84 unit/client/server security checks, all 25 relay checks, all 206 Chromium iPhone-profile browser scenarios, and a 13-scenario WebKit critical-flow suite against a production build configured for the local relay, with zero skips. Release browser mode rejects any skipped test, verifies a real SSE stream, exercises sequential shared-status lifecycle plus live revocation/expiry clearing for both share modes, verifies every manifest asset and route-split dependency from the service-worker cache, and writes generated screenshots only to ignored report output. Backup imports validate every persisted domain before mutation, secondary data-entry domains surface storage failures, and native lock-screen failure leaves the authoritative timer visible with actionable feedback. Pull requests run the portable web/store/offline gate, client/security contracts, iOS structural checks, Android unit tests, and Android instrumentation compilation. `npm run verify:release-candidate` additionally requires a clean immutable Git worktree before and after the web, relay, browser, iOS-structure, Android-unit, and Android-instrumentation-compilation gates; its network variant also reruns dependency audits. Native candidate scripts rebuild from clean source, embed hashable web-payload provenance, force the production relay, and verify the actual AAB signer; production deployment is manual-only. Five repeated care-plan edge-case runs pass 25/25 after replacing direct single-layer storage mutation with real visible edits and reload verification. Expanded accessibility, Canadian French, pseudo-locale/RTL, non-Latin PDF, native asset sync, iOS Simulator/archive, Android debug build, and local relay integration remain closed-beta evidence, not public-launch validation.

## Product promise

Olive is a calm, private, offline-first contraction timer with optional partner coordination. It records observations; it does not diagnose labor, predict clinical outcomes, or replace a person's care team.

The essential timer, complete history, corrections, safety information, and data export must never be interrupted by advertising or a labor-time paywall.

## Marketplace comparison

| Capability users commonly expect | Olive status | Required action |
| --- | --- | --- |
| Start/stop timer, duration, intervals, averages | Complete | Preserve one-tap operation and offline behavior. |
| Edit/delete records | Complete | Maintain undo and accessible labels. |
| Add a missed contraction manually | Complete | Included in regression tests. |
| Plain-text, JSON, PDF, and CSV export | Complete | Verify native share/save destinations on physical devices. |
| Partner link without recipient account/app | Implemented and locally hardened | Relay audit and remediation pass locally; coordinated production rollout and post-deploy checks remain open. |
| Summary-only sharing by default | Complete | Preserve explicit full-timeline opt-in. |
| QR handoff of the existing private link | Complete | Keep bearer-link warning adjacent to the code. |
| Factual labor events such as waters breaking | Complete | Neutral, editable, exportable, and included in full backup; never infer clinical meaning. |
| Persistent urgent-help and care-team access | Complete | Saved reminders require explicit opt-in and partner views do not infer a generic threshold; clinical copy review remains open. |
| Generic frequency or labor-stage alert | Removed | Short clusters remain visible in factual history; only an explicitly enabled user-entered care-plan reminder can surface a pattern. |
| Voice control | Implemented | Physical-device permission and interruption testing remains open. |
| Lock-screen/native ongoing timer access | Implemented | iOS Live Activity and Android ongoing chronometer notification compile; physical-device lifecycle validation remains. |
| Watch support | Later | Consider only after phone lifecycle reliability is proven. |
| Localization | English and Canadian French implemented | All 796 authored messages have exact key/placeholder parity, Settings exposes a persistent language choice, fresh French-device installs select French, user text is preserved, voice recognition/synthesis and native timer surfaces select French, and the Unicode memory-book PDF exports translated copy. French privacy/support artifacts and guarded store-metadata drafts are prepared. Automated rendered checks cover the core timer, urgent-help boundary, Settings accessibility, selection persistence, public destinations, manifest selection, and online/offline PDF extraction. Native-speaker linguistic review remains open before marketing French-language readiness. |
| Accessibility | Automated checks complete | WCAG A/AA, reduced motion, modal focus, 320px reflow, 200% browser text stress, and critical target checks pass; VoiceOver, TalkBack, system-level 200% text, and switch-control device audits remain. |
| Kick counter | Out of scope | Avoid turning Olive into a medical monitoring suite without a separate clinically reviewed product case. |
| Universal labor prediction or diagnosis | Prohibited | Never add or imply. Provider-entered reminder patterns remain observations only. |

## Priority backlog

### P0 — required before public marketplace release

- [ ] Complete every unchecked item in `PAID-LAUNCH-GATE.md`.
- [x] Audit the separate relay's authorization, expiry, deletion, rate limiting, logs, monitoring, outage behavior, and incident response; see `RELAY-SECURITY-REVIEW.md`.
- [ ] Deploy and verify the remediated relay/client pair with trusted-proxy, durable-volume, backup/restore, redacted-log, alerting, and rollback evidence.
- [ ] Prove timer recovery across backgrounding, lock, calls, low-power mode, process termination, reboot, and offline cold launch on supported physical iOS and Android devices.
- [ ] Complete independent maternity-professional review of all safety, timing, triage, hospital, postpartum, privacy, and store language using `CLINICAL-COPY-REVIEW.md`.
- [ ] Complete observed third-trimester, recent-labor, partner, and accessibility sessions with `USER-TESTING.md` and the success thresholds in the paid-launch gate.
- [ ] Reconcile every screenshot and store claim against the signed release binaries.
- [x] Bind validation records to release-evidence v2: one clean source revision, separately hashed IPA and AAB artifacts, matching iOS/Android native builds, recomputed artifact bytes, and candidate-source/rendered-artifact hashes for clinical wording review.
- [x] Bind each IPA/AAB to an embedded clean-source web-payload provenance record, verify identical payload hashes across platforms, verify the actual AAB signer, and disable obsolete direct-upload scripts.
- [x] Make production deployment manual-only with an explicit production-approval input.
- [x] Document evidence-bound internal rollout, physical-device stop conditions, containment, and replacement-build rollback for both marketplaces.
- [ ] Publish and monitor working privacy and support destinations.
- [x] Reconcile September 2026 Apple/Google submission policy: Xcode 26 and iOS 26 SDK, Apple 2026 age-rating and EU trader-status actions, Android API 36, Google Reproductive and Sexual Health declaration, and the mandatory non-medical health-app disclaimer are documented and locally enforced in `MARKETPLACE-POLICY-REVIEW.md`.
- [x] Lock npm, SwiftPM, and Android release dependencies and clear current npm/OSV advisories with a reproducible network-backed audit.

### P1 — marketplace parity and differentiation

- [x] Manual retrospective entry with validation and a visible source marker.
- [x] CSV export suitable for a care-team spreadsheet.
- [x] Scannable QR representation of an expiring, revocable share link.
- [x] Neutral labor-event log with timestamp editing, deletion, export, and backup coverage.
- [x] iOS Live Activity for the current elapsed timer with tap-to-return behavior and lifecycle resynchronization.
- [x] Android ongoing chronometer notification with tap-to-return action and lifecycle resynchronization.
- [x] Replace Capacitor's placeholder Android package/arithmetic tests with Olive package verification and unit-tested notification-generation race behavior.
- [x] Fail closed on impossible direct time corrections, neutralize spreadsheet formulas in CSV exports, and keep PIN-protected live streams authenticated when ticket issuance fails.
- [x] Reject malformed records across every backup domain, allow deletion when IndexedDB never existed, and surface storage rejection for sessions, people, hospital exams, labor events, journey data, and native lock-screen timer access.
- [x] Complete the engineering foundation for a real second locale. Canadian French covers all 796 authored messages with compile-time key coverage and runtime key/placeholder parity. A persistent Settings selector and French-device default are rendered and accessibility tested; user-entered values remain untouched; French voice commands normalize accents and use `fr-CA`; Android notifications and the iOS Live Activity have French resources; and extracted online/offline memory-book PDFs prove translated Unicode output. French public-page artifacts and guarded store drafts are prepared. This is engineering evidence, not a substitute for native-speaker review of safety and marketing language.
- [x] Automated WCAG A/AA checks and reduced-motion behavior.
- [ ] Physical VoiceOver, TalkBack, system-level 200% text, switch-control, landscape, and small-screen audit. Local browser stress evidence and remaining device scope are documented in `ACCESSIBILITY-AUDIT.md`.
- [x] Replace the tiny, pointer-only SVG pain map with localized 44-point pressed-state controls, a three-region limit, and a decorative body-map companion while preserving legacy stored region identifiers.
- [x] Require a localized preview and explicit relay/link-holder disclosure before posting an activity photo; cancellation sends nothing and relay failure retains the preview for retry.
- [x] Make crash recovery truthful and localizable, and remove invalid nested button semantics from incoming-activity notifications while preserving separate Open and Dismiss actions.
- [x] Localize dashboard statistics, both interval and duration-chart summaries, tool cards, status posting, backup/recovery states, urgent-help/care-plan notices, sound/voice controls, undo feedback, and spoken timer summaries. Both charts expose a concise localized purpose and current-data summary to assistive technology; decorative chart internals stay out of the accessibility tree. The Sessions tool now uses the accessible in-app workflow instead of a browser prompt.
- [x] Split the mutually exclusive private host and public viewer routes out of the first-load entry bundle. A generated build manifest drives service-worker precaching for every lazy route and asset, a build-time verifier rejects missing chunks, and a browser regression proves the host reloads plus the previously unvisited viewer module resolves while fully offline.
- [ ] Final App Store and Play Store screenshot set centered on calm timing, privacy, recovery, and optional partner sharing. Durable repository assets now include 20 Apple-size candidates, five dedicated Play-compliant phone captures, opaque store icons, an opaque Play feature graphic, and validated non-diagnostic caption/accessibility-description drafts; generation, dimensions, and local visual review pass, while human caption review and signed-binary reconciliation remain open in `STORE-ASSET-REVIEW.md`.

### P2 — validate after launch evidence

- [ ] Evaluate Apple Watch/Wear OS companion timing from user research rather than competitor checklists alone.
- [ ] Re-evaluate the documented CAD $1.99 paid-upfront launch price after pilot willingness-to-pay results and measured relay/support cost; do not introduce an essential-feature or active-labor paywall.
- [ ] Complete independent native-speaker and clinical review of the prepared fr-CA store drafts, then configure localized store pages from the exact signed candidates; clinician/childbirth-educator referral materials remain deferred until claims are evidence-backed.
- [ ] Complete independent native Canadian French linguistic review of the in-app safety, privacy, voice-command, and export copy before promoting French-language readiness in store marketing.

## Explicit non-goals

- No diagnosis, labor-stage prediction, fetal monitoring, kick interpretation, emergency triage engine, or claim that a timing pattern means it is safe to stay home.
- No advertisements, subscriptions, countdown trials, manipulative prompts, or upgrade interruptions during active labor.
- No collection of additional sensitive pregnancy data merely to match a competitor feature list.
- No reliability, clinical-review, or real-labor claim without a dated evidence record.

## Release decision

Engineering completion alone authorizes an internal or closed native beta. Public paid release is a no-go until every P0 item and every checkbox in `PAID-LAUNCH-GATE.md` is supported by current evidence. The CAD $1.99 repository recommendation must be re-evaluated after the pilot measures trust, willingness to pay, and ongoing relay cost.
