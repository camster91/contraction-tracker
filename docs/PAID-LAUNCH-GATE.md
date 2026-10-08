> Historical planning/evidence. Current v1.3.0 scope and release gates are in [RELEASE-PLAN.md](RELEASE-PLAN.md). Do not use this file as current submission approval or artifact evidence.

# Olive paid-launch evidence gate

Status: closed beta is appropriate; public paid launch remains blocked on the unchecked evidence below.

## Current engineering evidence

Evidence date: 2026-09-01. This evidence describes the current dirty local worktree; create an immutable source revision before producing release artifacts.

- [x] `npm run verify` passes lint, service-worker version validation, TypeScript, and the production web build.
- [x] Unit and client/server security suites pass 82 tests with no failures, including care-plan migration, exact per-link responsibility allow-lists, fail-closed legacy-link migration, protected-stream ticket handling, open-view revocation/expiry clearing, complete backup-domain validation, truthful secondary-domain persistence failures, unsupported-IDB deletion, impossible-time-edit rejection, CSV formula neutralization, Canadian French catalog and voice-command parity, localized timing/labor-event exports, Android backup exclusion, actual-AAB signer verification, embedded native payload provenance, manual-only production deployment, native timer race/catalog contracts, production security headers, no published source maps, and externalized server configuration.
- [x] Nineteen focused iPhone-profile browser journeys pass together for voice permission/confirmation state, current voice callbacks, timer/session recovery, stale-local IndexedDB repair, explicit imported-timer consent, backup round-trip, storage-preflight refusal, mid-commit rollback without partial mutation, journey migration, and privacy publishing.
- [x] The local release gates pass 84 unit/client/server security tests, 25 relay tests, all 206 Chromium iPhone-profile browser scenarios, and 13 WebKit critical-flow scenarios against a production build configured for the local relay, with zero skips. Release browser mode rejects any skipped test, requires a real `200 text/event-stream` SSE payload, runs shared-status progression serially, clears already-open full and summary viewers on revocation or expiry, verifies a visible no-false-success storage failure, verifies all manifest assets plus cached route-split modules offline, and routes generated screenshots to ignored report output. The run includes cross-session share isolation, journey reconciliation, share reload, successful host status posting, Canadian French first-launch/selection/public destinations/confirmations/PDF rendering, an offline first-use French PDF, accessible localized bottom-sheet names, deterministic care-plan edit/reload coverage, and a contract ensuring pull requests cannot omit the portable marketplace/native gates; the five care-plan edge cases also pass 25/25 across five repeated runs.
- [x] Current web assets sync into both native projects and fresh unsigned iOS Simulator and Android debug builds succeed.
- [x] Android host unit tests verify stop/new-start generation invalidation, and the Olive-package instrumentation suite compiles against `com.ashbi.olive`; execution on the physical-device matrix remains open.
- [x] `MOBILE-ROLLOUT-ROLLBACK.md` defines exact artifact identity, internal-track installation, stop conditions, containment, replacement-build rules, and public staged-rollout evidence without treating upload completion as release verification.
- [x] iOS project verification reports 11 passes, 0 failures, and 0 warnings.
- [x] Supported iPad portrait and landscape layouts use a deliberate centered 672px canvas with no measured horizontal overflow; physical-device and assistive-technology checks remain open.
- [x] Local accessibility stress checks cover axe WCAG A/AA, reduced motion, modal focus containment, 320px reflow, 200% root-text scaling, reachable destructive/manual-entry controls, and 44px critical targets; see `ACCESSIBILITY-AUDIT.md`.
- [x] Automated store metadata validation enforces native version/build parity, field limits, privacy/support URLs, pricing, permission declarations, and known misleading-claim regressions.
- [x] Current marketplace-policy validation enforces Android API 36, paid-before-rollout Play setup, Google Reproductive and Sexual Health classification and non-medical disclaimer, Apple Xcode 26/iOS 26 SDK preparation, updated age-rating instructions, EU trader-status gating, and privacy-manifest structure; see `MARKETPLACE-POLICY-REVIEW.md`.
- [x] Automated store-asset validation proves 28 repository-owned opaque PNGs exist at their intended dimensions, separates Apple and Play screenshot ratios, and matches the Apple icon master to the iOS marketing icon.
- [x] User-session and independent-clinical-review JSON contracts pass structural validation. `npm run evaluate:validation` deliberately remains red until genuine records meet the unique-cohort, complete-task, safety-interpretation, exact-candidate, credential, exact-copy, conflict-resolution, and retest gates; templates and synthetic records cannot satisfy public launch.
- [x] npm and OSV dependency audits report zero known vulnerabilities across 457 locked npm, SwiftPM, and Gradle packages after patching the Capacitor Xcode parser's transitive UUID dependency; see `DEPENDENCY-SECURITY.md`.

These results support a closed beta build. They do not satisfy the physical-device, signed-binary, production-relay, clinical, accessibility, or real-user gates below.

The checked automated results above describe a dated dirty-worktree snapshot, not a release artifact. Before any internal-track candidate is called verified, rerun `verify:release-candidate` on a clean immutable revision and attach the generated `olive-release-evidence-v2` record to the test record. The v2 record requires the matching IPA and AAB, their recomputed SHA-256 hashes, the source commit, and both native version/build identities. A result without those bindings is not release evidence.

## Product and safety

- [x] Urgent concerns explicitly override contraction timing patterns.
- [x] Timing reminders are disabled by default, require explicit user opt-in, and are not independently inferred in partner views.
- [x] Short contraction clusters remain factual history and never trigger a generic frequency or clinical-style banner.
- [x] Partner-facing phases are labeled as shared status selected in Olive, with no “all quiet,” “things are starting,” or other inferred clinical state language.
- [x] Care-team calling is persistently reachable from the labor screen.
- [x] Sharing defaults to summary-only and explains bearer-link access.
- [x] Voice privacy language matches browser and operating-system behavior.
- [x] Shared activity photos require an explicit preview/disclosure before relay upload. Legacy contraction photo and voice-memo attachments remain portable for recovery but are stripped from relay timer-sync payloads; both privacy-policy surfaces distinguish these boundaries and are date-checked for parity.
- [x] iOS camera/photo/microphone/speech and Android microphone/notification permissions are declared.
- [x] Delete-all refuses to erase local relay capabilities when any active-share revocation fails, preserving the user's ability to retry.
- [x] Ordinary share revocation is relay-first: a failed remote revoke remains visible and retryable instead of silently discarding its capability.
- [x] Already-open full and summary viewers clear cached sensitive state when a link is revoked or expires; protected viewers never downgrade to an unauthenticated event stream when ticket issuance fails.
- [x] Direct clock and quick-offset edits reject reversed, future, or over-four-hour records, and CSV exports neutralize formula-leading user content.
- [x] Android excludes Olive's sensitive sandbox from OS cloud backup and device-to-device transfer; explicit user-directed JSON backup remains available.
- [x] Backup imports reject malformed nested records before any mutation; platforms without IndexedDB do not block explicit deletion; and user-authored secondary domains preserve visible state and report storage rejection instead of announcing false success.
- [x] A failed native notification or Live Activity start keeps the web timer authoritative and shows actionable permission guidance once per contraction.
- [x] Delete-all also refuses to clear primary local storage unless the IndexedDB recovery transaction completes successfully.
- [x] Portable backup schema v4 includes an active timer, preferences, unkeyed private birth stats, journey data, sessions, contacts, exams, checklists, and labor events; device-bound live-share capabilities are deliberately not restored, and v3 bearer-keyed birth records migrate without their keys.
- [x] Birth completion saves the private record atomically before sharing, derives consistent metric and imperial values from one input system, never publishes measurements or birth time, and retries a failed shared-phase update without posting the celebration twice. Focused iPhone-profile browser coverage verifies the success, relay-retry, accessibility, and storage-failure paths.
- [x] Backup import commits all touched local-storage domains and recovery mirrors as a rollback-capable batch before changing live UI state; forced mid-commit failure preserves the prior history and contacts.
- [x] Portable backups omit share codes/PINs and no longer create three attachment-heavy duplicate snapshots in localStorage; legacy private attachments leave the app only through an explicit user-directed export/share action.
- [x] Imported active timers require an explicit resume decision and reject malformed or materially future start timestamps.
- [x] In-app export, support contact, privacy link, and local-data deletion are available.
- [x] A source-linked maternity-professional review packet defines reviewer credentials, independence, required surfaces, decisions, and re-review evidence in `CLINICAL-COPY-REVIEW.md`.
- [ ] A registered midwife or labor-and-delivery nurse reviews every timing, urgent-help, hospital, and postpartum statement.
- [ ] A second independent maternity professional reviews the clinical boundary and store copy.

## Real-user validation

- [x] A consent-aware, simulation-only pilot protocol with stop rules, task scripts, safety failures, measurements, and evidence records is ready in `USER-TESTING.md`.

- [ ] Complete 10–15 observed native sessions with third-trimester users, including first and subsequent pregnancies.
- [ ] Complete 3–5 observed partner or doula sessions.
- [ ] Complete at least 3 retrospective sessions with people who labored within the previous year.
- [ ] Include low-vision, large-text, and reduced-motor-capacity scenarios.
- [ ] At least 70% start timing within 10 seconds without help.
- [ ] At least 80% correct a missed or late tap without help.
- [ ] At least 80% find and activate the saved care-team call action within 10 seconds without completing an external call.
- [ ] No participant interprets a timing observation as a diagnosis, all-clear, travel direction, direction to delay care, or other medically directive meaning.
- [ ] At least 80% say they would choose Olive for their own labor.
- [ ] Resolve every P0/P1 finding from the pilot before public release.

## Physical-device reliability

- [x] Browser regression coverage verifies that timed contractions retain the active session through reload/stop and that IndexedDB current-timer recovery remains available when local history exists.
- [x] The private host and public viewer use separate route chunks without sacrificing cached module access: the production manifest is verified against built files, the service worker precaches every lazy asset independently, and a browser regression reloads the host and resolves the previously unvisited viewer module after network disconnection.
- [x] Newer IndexedDB history can repair a stale nonempty local copy without being overwritten during startup hydration; a successful small timer write cannot hide a failed history write.
- [x] Long-running timers are never silently discarded; the existing visible old-timer control requires an explicit user action.
- [x] Wake-lock intent is derived from authoritative timer state, including restored, synchronized, resumed, undone, stopped, and discarded timers; focused browser coverage verifies restore and discard behavior.
- [x] Android uses a dedicated monochrome status-bar icon and resource-backed notification copy; a current debug build succeeds.
- [x] iOS Live Activity mutations use generation invalidation so a quick stop cannot leave an in-flight start active; a current unsigned Simulator build succeeds.
- [x] Voice control distinguishes starting/listening/confirmation/error state, exposes “say stop again” to assistive technology, expires confirmation back to listening, terminates on permission denial without a restart loop, and routes commands through fresh React state so a voice-started timer can be voice-stopped.
- [x] English and Canadian French provide exact key/placeholder parity across all 796 authored messages while user-entered values remain untouched. Message copy remains separate from device-locale display formatting, fresh installs use the device hour cycle, and explicit 12/24-hour choices persist. The PDF lazily embeds licensed Unicode Latin/Arabic font subsets; browser downloads extract both Arabic-script device-locale numerals and translated French copy without export failure, including first use with the network offline. Native-speaker linguistic review remains open before a French marketing claim.
- [x] iOS Live Activity and Android ongoing-notification copy use stable English and Canadian French platform resources; physical-device locale switching remains part of the device gate.
- [x] Internal `en-XA` and `ar-XB` pseudo-locales expand typed catalog copy and derive LTR/RTL document direction without being declared as production languages; real pseudo-RTL renders cover the primary timing/annotation journey, missed-contraction entry, factual labor events, partner activity identity/send/retry, complete Settings safety/data surface, private-sharing disclosure/configuration, public partner timing/history/safety, and the Today → Birth journey → Care card privacy/save/copy route with focus continuity, no page overflow, and focused WCAG A/AA scans. Care-card export labels localize without transforming user-entered text.
- [x] Critical timer transitions preserve keyboard focus and expose an assertive live status; backup failures and recovered-timer prompts are announced, and settings choices/quiet-hour fields expose selected state and programmatic names.
- [x] Share copy/create/revoke/failure states use truthful live or alert feedback and stable focus handoff; the live share dialog passes focused axe checks, and link actions, backup reminders, and first-run onboarding meet the 44px local target convention.
- [x] Provider-question and responsibility fixed copy is catalog-backed; item deletion has a five-second parent-owned Undo with deterministic focus restoration, and responsibility privacy/deletion remains visibly shared until every affected active relay link confirms removal.
- [x] Postpartum Timeline fixed copy is catalog-backed; user-entered text remains untouched, state changes are announced, controls meet the 44px convention, and item-level Undo restores data and focus without snapshot replacement. Focused pseudo-RTL interaction and WCAG A/AA checks pass.
- [x] Hospital exams fixed copy is catalog-backed and explicitly non-diagnostic; selection controls expose labels and pressed state, reported notes remain untouched, important targets meet 44px, status is announced, and the pseudo-RTL flow passes focused WCAG A/AA checks.
- [x] People and Sessions fixed copy is catalog-backed with 44px actions, modal focus semantics, raw user-name preservation, and pseudo-RTL coverage. Populated sessions cannot have their metadata deleted while contractions still belong to them; empty-session deletion remains an explicit two-tap action.
- [x] Hospital Bag fixed and default-item copy is catalog-backed; custom text remains untouched; progress has programmatic semantics; toggle/delete actions meet 44px; keyboard reordering, five-second item Undo, deterministic focus restoration, empty-list persistence, and truthful storage-failure recovery are verified.
- [x] Birth-journey subview navigation moves focus into the new view and back to its originating module; Care card copy uses the visible draft rather than silently copying stale persisted fields.

- [ ] Run three-hour active-timing soaks on at least two supported iPhones and two supported Android phones.
- [ ] Verify incoming calls, app switching, screen lock, low-power mode, OS termination, restart, and device reboot.
- [ ] Verify offline cold launch, relay outage, reconnection, revoked links, and expired links.
- [ ] Verify storage pressure, timezone/manual-clock changes, and fresh-install/upgrade behavior.
- [ ] Verify JSON export/import and PDF sharing through native system interfaces.
- [ ] Verify voice permission allow, deny, later-enable, interruption, and unsupported-device behavior.
- [ ] Complete VoiceOver, TalkBack, 200% text, reduced-motion, switch-control, landscape, and small-screen checks.

## Operations and release

- [x] Audit the separate Olive relay for capability entropy, logging exposure, rate limits, deletion, expiry, monitoring, outage behavior, and incident response; six validated findings are documented in `RELAY-SECURITY-REVIEW.md`.
- [x] Add a network-backed support/privacy verifier and capture dated live evidence in `PUBLIC-ENDPOINT-REVIEW.md`. As of 2026-09-01, support returns 404 and privacy serves stale copy, so this evidence confirms the public gate is open rather than satisfying it.
- [ ] Release and post-deploy verify the coordinated relay/client remediation, trusted proxy, durable volume, backup/restore, redacted logs, alerts, and rollback.
- [ ] Publish the support page and verify support email delivery and response ownership.
- [ ] Verify the exact signed binaries in TestFlight and Google Play internal testing.
- [ ] Record the immutable source revision, artifact hashes, signing identity, build environment, and internal-track build identifiers for those exact binaries.
- [ ] Generate and retain the machine-readable `olive-release-evidence-v2` record from the clean candidate revision; independently verify that its separately identified IPA and AAB hashes match the uploaded TestFlight and Play artifacts.
- [ ] Reconcile every store claim and screenshot against the submitted binary.
- [x] Store packets consistently identify adults 18+ as the intended audience and distinguish that audience from platform-generated content ratings.
- [x] Public and store-facing copy contains no unqualified reliability, real-labor, clinical-validation, or guarantee claim; native performance remains explicitly labeled an open gate until dated device evidence exists.
- [x] Document the launch-price decision in `PRICING-DECISION.md`: CAD $1.99 paid upfront for the complete native app, with no IAP, subscription, ads, account, or labor-time unlock. Google must be configured paid before any public rollout because free-to-paid conversion is not allowed for the same package. Console configuration and pilot willingness-to-pay evidence remain required.

## Decision rule

Do not describe Olive as proven for real labor, clinically reviewed, or reliable for a stated duration until the corresponding evidence above is complete. Automated and simulator tests are necessary engineering gates, not substitutes for pregnant-user, partner, clinician, accessibility, or physical-device validation.
