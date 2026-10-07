# Olive shipping completion plan

Created October 7, 2026. Active goal: finish the reviewed app and ship iOS and Android, with verified release outcomes rather than treating a local build or upload as completion.

## Starting evidence

- Reviewed source: `78bf84566cc8f073a0a5afb72b1629f5fdddc4ba`, branch `codex/olive-v1.3-release-preparation`, version 1.3.0/build 7.
- Fresh review captured 23 Chrome screens at 390 × 844 with isolated fabricated data. Lint and TypeScript passed. Five P1 defects remain; browser results do not establish physical-device acceptance.
- Review and 48-control inventory: `/Users/Cameron/Documents/Codex/2026-10-05/let-s-work-on-the-olive/outputs/ui-code-review-2026-10-07/README.md`.
- Existing untracked `validation/` is unrelated work and must be preserved.
- Previous build/store records are historical evidence until the authenticated consoles and exact artifacts are refreshed. The issue dispositions in RELEASE-PLAN.md also need refresh before external status changes.
- Cameron's latest correction: “Primary” does not work as a button label. Use **Sessions** as the visible action; put the current session name inside its sheet.

## 1. Correct recording and navigation defects

Owner: Codex. Start here; do not begin with more graphics or features.

- [x] Replace the offscreen session popup with a bounded accessible sheet. Label its opener Sessions, and show the active session inside.
- [x] Fix Big Text so prominent timer text never shrinks. Check actual enabled mode on idle, active, history, and forms.
- [x] Make record edits transactional: draft start/end and annotations, Save commits, Cancel restores, Delete remains an explicit separate action with Undo.
- [x] Remove the cancellation path that releases an active timer's wake lock. Cancel is non-destructive for every record age; physical wake-lock acceptance remains in phase 3.
- [x] Keep Stop reachable during active recording, scrolling, editing, and secondary sheets. Choose one persistent active action rather than conflicting Start/Stop controls.
- [x] Initialize exam measurements as not recorded. Save only explicitly entered values; label inputs and selected states accessibly.

Exit evidence: targeted regression checks for each defect; screenshots show Sessions and Stop in the viewport; canceled edits leave saved data unchanged; untouched exam inputs produce no invented measurement records.

## 2. Give every control a clear home

Owner: Codex. Follow the existing control inventory; preserve useful capabilities and local records.

- [x] Main screen: timer, rest interval, recent summary, care-call/contact access, history, and missed-entry action. Put history ahead of unrelated tools.
- [x] Birth journey: care card/provider setup, questions, responsibilities, hospital bag, optional exams, and postpartum logistics.
- [x] Sessions: create, switch, end, view, and explicit delete. Remove the duplicate New session tool card.
- [x] Settings: appearance, working Big Text, clock/audio/quiet hours, backup export/send/import, privacy/support, and version.
- [x] Consolidate duplicate People/contacts, backup, Read, and empty-state Start routes; retain justified quick care access.
- [x] Rename Care contacts/People and Exams/Hospital consistently. Make care setup open the relevant fields directly.
- [x] Keep optional intensity, tags, pain location, and notes in record details. Add keyboard-operable pain-region controls and selected-state semantics.
- [ ] Keep Close/Back reachable on long sheets and when the keyboard opens. Use persistent field labels and appropriate input sizing.
- [x] Provide a touch/keyboard alternative for checklist reorder. Disable impossible end-time corrections.
- [x] Review reminder labels and spoken copy against the actual configured plan; verify mute/snooze behavior. Preserve user opt-in and clinical-copy review gates.
- [x] Audit unmounted charts/photo/voice source and stale tests; remove genuinely unused code only after checking references. Do not surface unused features just to fill space.

Exit evidence: each control has a purpose, one clear home or justified shortcut, a usable empty/saved/error state, and accessible semantics. Recheck the inventory against the final rendered app.

## 3. Verify and freeze a release candidate

Owner: Codex for host checks and candidate preparation; Cameron/testers for physical-device actions requiring hands-on access.

- [x] Run lint, TypeScript/build, affected unit checks, and relevant Chromium/WebKit phone flows; resolve failures without disabling checks.
- [ ] Capture fresh Night/Daylight and Big Text screens, active timer, history edit, Sessions, care setup, and long sheets. Check supported smaller screens, landscape, and tablet if offered.
- [ ] Record exact source revision and web/native artifact hashes; increment native build numbers and synchronize assets for both platforms.
- [ ] Verify icons, splash, bundled illustrations, listing screenshots, support/privacy URLs, and metadata reflect the final UI. Regenerate screenshots affected by fixes.
- [ ] Build iOS archive and Android release candidate. Confirm signing identity, app identifiers, permissions, and embedded source provenance without exposing credentials.
- [ ] Execute NATIVE-DEVICE-ACCEPTANCE.md on the exact distributed candidate: offline start; background/lock/relaunch timing; edit/cancel/delete/undo; Live Activity or Android notification; export/import; recovery; VoiceOver/TalkBack; text scaling; keyboard; privacy/support.
- [ ] Reconcile existing clinical-copy and observed-user evidence against this candidate; address unresolved release-blocking findings.

Exit evidence: identified artifacts, successful affected checks, fresh rendered evidence, and recorded physical-device acceptance. Missing device or reviewer evidence remains an explicit open gate.

## 4. Finish distribution and store release

Owner: Codex for authorized preparation and console work; Cameron for account verification, missing signing credentials, and new approvals; Apple/Google for processing and review decisions.

- [ ] Refresh current App Store Connect and Play Console state; reconcile existing builds, external beta review, account verification, signing, and listing gaps without duplicating submissions.
- [ ] Upload the new verified iOS candidate within the session's approved release scope; verify processing, compliance, beta metadata, and tester availability. Respect any pending external-beta review dependency.
- [ ] Verify invitation status for the explicitly requested tester addresses; only send invitations already authorized and only when the build is installable.
- [ ] Prepare/complete Android signing and internal testing within authorized scope, then verify installation and processed release state.
- [ ] Complete store privacy/data declarations, screenshots, support URLs, age/content information, review notes, and release metadata using actual app behavior.
- [ ] Complete authorized submission/publication steps. Request any genuinely new external-action approval only when a concrete candidate is ready; do not treat this plan as authorization for purchases or unrelated mutations.
- [ ] Record submission receipts, decisions, and final availability on both stores. Resolve actionable review feedback and reverify changed candidates.
- [ ] Update existing shipping issues with evidence when authorized; preserve history and do not close based on uploads alone.

Exit evidence: intended iOS and Android store release outcomes verified, with installable final versions and support/rollback handoff. Apple/Google review time cannot be promised.

## Execution and reporting

Work in order: recording correctness → placement/accessibility → candidate verification → native/store release. Independent safe preparation may continue while a device/account/review gate is pending. No new monetization, relay, wearable app, or localization expansion is part of this cleanup.

Maintain a short progress record identifying verified work, candidate identity, remaining gate, owner, and resume condition. Mark the goal complete only after the intended release outcomes, or after Cameron explicitly narrows the objective. Do not equate browser QA, local builds, upload processing, or a waiting store review with shipping completion.

Current next action: execute physical-device acceptance on internal TestFlight build 8, finish native listing images and professional copy review, and restore the original Android upload key while Google account verification proceeds. Earlier implementation entries below retain their original next actions as history.

## Implementation round 1 — October 7, 2026

Local changes implement Sessions as a bounded modal with a persistent header and selected session state; the header has separate Olive identity and Sessions action. Removed the duplicate people-management route inside Sessions. Safari touch opening explicitly focuses the opener so closing returns focus correctly.

Timing edits now use an isolated draft; Save commits start/end and annotations, and Cancel clears the draft without deleting records or disabling an unrelated active timer. Big Text uses the enlarged root sizing without reducing display font sizes.

New regression coverage exercises session viewport placement, focus restoration and switching, actual Big Text duration size, and Save/Cancel persistence for recent and older records while another timer runs. These are browser checks; physical-device wake-lock and accessibility acceptance remain open.

Next implementation: keep Stop reachable through scrolling/secondary flows and remove preset examination measurements. Then continue the remaining control-placement and accessibility cleanup. No new native build or store upload has been made from this changed source.

## Implementation round 2 — October 7, 2026

All five review P1 code defects now have local remediation. The active timer has one Stop action: large in the hero, compact while scrolling or in a sheet. Inside a sheet it belongs to the dialog's accessible tree and focus trap. Sheets leave clear space above for Stop, including landscape; active sheets do not apply a backdrop filter that would change fixed positioning. Stopping inside a sheet preserves usable focus.

New exams start with all measurements not recorded. Save requires an entered measurement or note; unknowns stay null, explicitly entered zeroes remain zero, invalid ranges are rejected, and a new exam resets the fields. Older numeric exam records retain their display and storage shape. Exam header now matches the Exams entry; further global label cleanup is in phase 2.

Verification includes scroll/edit/sheet/landscape Stop reachability and non-overlap, single-action count, focus behavior, blank exam defaults, partial measurement persistence and reload, and unit storage/failure/backup checks. Navigation waits in affected browser tests use DOM readiness followed by app assertions rather than a load event that timed out on already-rendered WebKit pages. No assertions were removed or checks disabled.

Remaining: phase 2 navigation/accessibility cleanup, full final-candidate checks, physical-device acceptance and store release. No native upload or publication has been made from these changes.

## Implementation round 3 — October 7, 2026

The timer screen now puts history before the preparation entry. Removed the More tools grid and its duplicate session, backup and contact routes; backup remains in Settings, and session management remains in Sessions. The header shows Sessions, with Primary retained only as the saved current-session name inside the sheet.

Birth journey owns provider contact/reminder setup, hospital bag, exams, contacts and existing journey modules. Set care-team contact opens the provider fields directly. Nested tools return to the journey without stacking modal dialogs; closing restores focus to the original shortcut. Settings now holds preferences, backup, privacy/support and version.

Optional record annotations are collapsed under Optional details. Pain-region buttons support keyboard activation, selected states and at least 44-pixel targets while preserving existing stored identifiers. Intensity and tag selections expose pressed states. Impossible end-time corrections are disabled. Checklist reorder mode offers Up/Down buttons and retains drag for those who prefer it; normal packing is uncluttered.

Settings, contacts and journey headers stay outside their scroll areas. Contact labels remain visible and input text is 16 pixels. Browser reduced-viewport checks do not replace physical-device keyboard/VoiceOver testing.

Remaining phase 2 work: reminder copy and snooze/mute behavior; unused source and stale-test audit; final control-inventory reconciliation. Native keyboard/device acceptance and all candidate/distribution steps remain open. This round is local only.

## Implementation round 4 — October 7, 2026

Saved reminder speech now uses the actual configured interval, seconds and window on initial and repeated announcements. The app clock supports ten-minute repeats. Mute and quiet hours suppress both speech and tones. A clearly labeled 24-hour sound pause persists across reload, shows its expiry, and can be resumed; factual timing and care-call access remain available. Persistence failures report an error rather than claiming a saved pause.

Removed unmounted FrequencyChart, Timeline, PhotoPicker, VoiceMemoPicker, TodayPanel and speech-recognition module after checking references. Historical tests under legacy remain historical; stored record/photo/voice data fields and backup formats are preserved. Replaced misleading chart/audio source assertions and skipping backup checks with actual recent-summary assertions, recorded speech/tone calls and export/import in a separate fresh browser context. Mocked audio calls do not establish native audibility.

Postpartum phase now puts First 12 weeks first within Birth journey. Floating timer is browser-only, guarded in both UI and handler; native screen-awake wording no longer promises unsupported behavior. Current 48-family placement audit is CONTROL-HOME-AUDIT.csv. Device/keyboard and final candidate checks remain open.

A test launch hit ENOSPC before running. Cleared the regenerable npm download cache under the existing disk-cleanup authorization; source, installed dependencies, release artifacts and unrelated validation files were preserved. Disk availability recovered sufficiently for tests; native-build headroom still needs rechecking.

Next: finish the final candidate check matrix and rendered state capture, then make isolated clean native builds with exact source provenance. Clinical-copy professional review is still recorded as outstanding in CLINICAL-COPY-REVIEW.md; do not claim store acceptance or replace that evidence with automated checks.

Fresh reminder screenshots also exposed a stacked-notice layout problem: fixed notices above the scrolling main area displaced the timer. Moved saved reminders, frequent/stale notices and backup nudges into main content after the timer and care shortcuts. Start/Stop now precede those notices; active Stop remains available while scrolling. Final regression checks explicitly require the primary Start and Stop to be fully in the phone viewport with saved/frequent notices present.

Round 4 verification: npm run verify passed; 16 affected unit checks passed; final 34 Chromium/WebKit cases passed with no skips. Fresh paused-reminder screens were inspected after notice relocation. Xcode 27.0 is installed. System java_home has no registered runtime, but the project scripts' Homebrew JDK 21.0.12 is present and executable, along with Android API 36. This is toolchain availability, not a native build result.


## Final host verification and console refresh — October 7, 2026

Source UI is 5001c1aff340ae9591b264055b6a58b2d1f0577c. Full browser matrix: 212 passed, six failed (three stale expectations in each engine); all 24 cases in the affected brand, journey and changelog specs passed after updating assertions. No skipped results. Replaced the external-cache changelog no-op with required current repository listing assertions. All unit checks, offline build check, store metadata and asset format checks passed. iOS structure: 11 passed; Android host unit tests and instrumentation source compilation passed after a disk-space failure and regenerable CocoaPods cache cleanup. These results do not establish physical-device acceptance.

Prepared native build number 8 for the remediation candidate. Current browser screenshot previews are being regenerated for seven supported profiles into the task outputs. Browser-only floating-timer UI can appear in these previews: they must not be represented as native store screenshots. Capture the final native candidate on device before publishing its listing images.

Authenticated console observations: Apple Olive app 6819506377 is Prepare for Submission; existing build 7 is Waiting for Review and predates remediation. Google Ashbi Design account 4743214850621961541 requires identity, organization website and phone verification; Create app is disabled and Olive is not yet created. Cameron was asked to complete those verifications in the open Chrome tab. No new invitations, submissions or uploads occurred in this check.

Next: commit build-8 preparation, make a clean isolated signed iOS candidate with embedded source provenance, verify its payload, then continue the approved upload. Android upload signing configuration remains absent; physical-device and professional clinical-copy review remain explicit open gates.


## Build 8 upload and Android preparation — October 7, 2026

Frozen candidate: 235e91f6ab596a230c0e04115fdb9405a430efd6, 1.3.0 (8). iOS archive/export succeeded using the existing paid distribution certificate and manual App Store profiles. Signature verification, app/extension versions and embedded web payload/source hashes passed. Xcode upload succeeded; App Store Connect upload ID 941bb3ca-cad7-4d08-a68d-88944f4716b9 advanced from Processing to Missing Compliance. Export compliance was saved after checking the app encryption behavior. Build 8 now shows Testing in the existing Olive Internal Testing group, whose sole tester is cameron@ashbi.ca. What to Test instructions were saved. This establishes internal availability, not installation or device acceptance.

Android host tests, bundleRelease and assembleRelease passed. Both unsigned artifacts have the same embedded payload hash as iOS and are retained with SHA-256 evidence. They cannot be submitted without the original upload key. Issue #78 was fetched live and confirms that key/properties are on CAM-DESKTOP; Cameron has been asked to restore them locally. Google account verification remains open. Issue #69 was also fetched live: both independent professional reviews remain required and no accepted records exist.

The isolated iPhone 17/iOS 26.5 Simulator build and native launch succeeded. Sessions, timer, onboarding, care access and safe areas rendered; browser-only floating-timer UI is absent. Saved native-window evidence is supplementary. Device Hub coordinate input returned noWindowsAvailable; accessibility-based screenshot capture still worked, but app interaction checks remain unverified; do not mark any hands-on check passed. No physical phone was connected in devicectl/adb inventory. Booting the Simulator exhausted disk headroom; removed only this candidate's regenerable compiler caches, preserving archive, IPA, Simulator app, source and all evidence.

Next: complete native images and device acceptance on build 8. Apple allows only one build from version 1.3.0 in Beta App Review at a time; build 7 is Waiting for Review, so leave that review intact and resume external build-8 distribution after Apple resolves it. External tester records for both requested Bianca addresses exist, but currently show No Builds Available. Do not resend invitations or claim installation while beta review is pending.
