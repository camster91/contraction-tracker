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

Current next action: reconnect Chrome to verify build 10 processing/compliance and internal TestFlight availability, then execute physical-device acceptance on that exact candidate. Ten native iPhone/iPad listing images are prepared; professional copy review, the original Android upload key and Google account verification remain open. Earlier implementation entries below retain their original next actions as history.

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

## Native UI continuation — October 7, 2026

The standalone Device Hub display restored touch interaction. Eight actual native PNGs at 1206 × 2622 are now captured and hashed. Sessions/Stop, a changed edit draft followed by non-destructive Cancel, and enlarged Big Text timer were exercised in the isolated Simulator. Background/reopen continuity was observed, without independent-clock accuracy or lock/process-kill verification. Details and limits are recorded in NATIVE-DEVICE-ACCEPTANCE.md; the final listing set and physical acceptance remain open.

## Header alignment correction — October 7, 2026

Cameron flagged the logo relative to Sessions, speaker and Settings. The leaf makes the lettering sit low within the wordmark bounds, while inline SVG layout offsets the two icon controls. Added a 2px optical lift to the wordmark and explicit centered flex layout for both 44px icon buttons. Eight fresh rendered checks passed in Chromium/WebKit at 320/390px, normal/Big Text; icon centers match and all header touch targets remain at least 44px and within the viewport. Lint, TypeScript and production build passed. Evidence: task outputs/header-alignment.

This source correction is after the distributed build 8. Build 8 remains the verified prior candidate; the alignment change needs a new native build and refreshed affected screenshots before claiming it is distributed. Do not reuse build-8 provenance for the changed payload.

## Build 9 native candidate — October 7, 2026

Source `eaad99ecb5152a50a1cb79d2c2305d132e5bcf8e`, version 1.3.0/build 9, payload `3c4975bbccd1e96d0cca2d7e2b7be0ae0b2ef1516710e58319ee0ef0479bd34c`. iOS archive, existing manual App Store signing/export, strict signature check, matching app/extension versions and embedded source/payload verification passed. Xcode upload succeeded. Console processing/compliance/internal availability await Chrome reconnection; no current build-9 TestFlight availability is claimed.

Android host tests and unsigned release AAB/APK builds passed with matching embedded source/payload identity. The original upload key is still absent; Google verification and creating Olive remain unresolved. Public privacy/support URLs were fetched and byte-match repository copies.

The same isolated iPhone 17/iOS 26.5 Simulator was upgraded without deleting its fabricated history. Installed app and payload independently verified as build 9, despite the original build-8 device name. Five actual native captures show normal/Big Text, Night/Daylight, care setup and native keyboard. Blank opt-in fields remain blank; persistent labels and Close remain visible with the keyboard, and Close dismisses the sheet without saving. This supplements, but does not close, physical-device acceptance. Evidence: task outputs/remediation-build9. No runtime changes occurred after provenance embedding; cap sync only rewrote generated dependency paths to the installed shared node_modules.

## Native date-field finding — October 7, 2026

The build-9 native listing pass found datetime-local fields extending beyond the missed-entry sheet's right padding. Before evidence: task outputs/remediation-build9/native-manual-date-overflow-before.png. The single-column grid previously used an implicit content-sized track; native iOS date widgets can impose intrinsic widths. Added an explicit bounded grid track, shrinkable field labels and bounded native date/time inputs without replacing platform pickers. Lint/typecheck/build and all 10 affected manual-entry/large-text cases passed in Chromium and WebKit. Native verification remains required; build 9 screenshots of this form are withheld from listing use. Replacement candidate is build 10. Prior professional review templates and build-9 evidence remain history until refreshed against the replacement.

## Native date fix verified and build 10 uploaded — October 7, 2026

The grid/min-width-only attempt at d96804e still overflowed in the native Simulator. The final correction at `c354b34621b8055082f363d523f357c899d4287b` applies explicit CSS appearance and border-box sizing to temporal inputs. Both fields now fit inside the sheet, and tapping opens Apple's native calendar/time picker. This matches WebKit issue 301648 (https://bugs.webkit.org/show_bug.cgi?id=301648), which affects padded 100%-width temporal controls on iOS rather than desktop WebKit. Final affected test rerun: 10 passed across Chromium/WebKit; lint/typecheck/build also passed.

Build 10 payload: `78a8d36960654c0635f53e05bd379982266ddcbf40984cca7178acf923793f7d`. iOS archive, manual signed export, strict signature/app-extension-version/embedded-payload checks passed. Xcode upload succeeded; console processing/compliance/internal availability await the existing Chrome reconnect request. Android host tests and unsigned AAB/APK passed with matching provenance; original key remains absent.

Five actual native iPhone screenshots are prepared at task outputs/native-store-build10/review.html with dimensions/SHA-256 manifest. The inaccurate build-9 missed-entry image is withheld. The current professional-review packet is prepared at outputs/remediation-build10/professional-review; both reviewer decisions remain null. iPad and Android images, exact-candidate physical acceptance, professional reviews, Google account verification and actual store release outcomes remain open. No Apple/Google acceptance or build-10 TestFlight availability is claimed.

## Build 10 native iPad package — October 7, 2026

Candidate source `c354b34621b8055082f363d523f357c899d4287b`, version 1.3.0/build 10. Installed iPad Pro 13-inch (M5)/iPadOS 26.5 Simulator metadata and all 49 embedded web files match payload SHA-256 `78a8d36960654c0635f53e05bd379982266ddcbf40984cca7178acf923793f7d`. Five raw Device Hub captures at 2064 × 2752 cover idle timer, active timer, saved history, missed-entry form and care setup. Inputs fit their sheets; care timing values remain blank. The isolated Start/Stop flow saved one fabricated 17-second record.

The current task package `outputs/native-store-build10/` now holds ten native captures (five iPhone, five iPad), a byte/hash/dimension manifest and review gallery. These are prepared local assets, not uploaded screenshots, professional copy approval or physical-device acceptance. Chrome remains unavailable; build 10 Xcode upload succeeded but Apple processing and current TestFlight availability remain unverified. Original Android signing configuration is still absent on this Mac. Google account verification, exact-candidate physical acceptance and two independent professional reviews remain open.

## Build 10 internal TestFlight enabled — October 7, 2026

Chrome reconnected. Apple build UUID 8843cf6f-d990-4903-aa94-aaf78cc4ebdc is processed; export compliance was saved and build-specific What to Test text persisted with Saved confirmation. Build 1.3.0 (10) is Testing in Olive Internal Testing. Its existing sole tester, cameron@ashbi.ca, remains Invited; installation is unverified. External group selection is disabled while build 7 remains Waiting for Review. The pending review was preserved. Evidence: task outputs/remediation-build10/apple-console-evidence.json and apple-internal-testing.png. Next: physical acceptance on this exact build; retain original Android key, Google verification and professional-review gates.

## Store draft continuation — October 7, 2026

Apple version 1.3.0 remains Prepare for Submission. Prepared description, promotional text, keywords, verified support URL, owner-confirmed review contact and current-route review notes were saved. Build 10 was attached and confirmed after reloading. No Add for Review or release action occurred. The native iPhone screenshot chooser supports the prepared 1206 × 2622 dimensions, but upload was blocked because the reconnected Chrome extension lacks Allow access to file URLs. The owner has been asked to enable it; zero images were uploaded. Copyright remains an unfilled owner field. Evidence: task outputs/remediation-build10/apple-listing-draft-evidence.json. Fresh Play Console check confirms identity/organization website/phone Action required, Create app disabled and Olive absent. Physical/professional acceptance and original Android signing files remain open.

## App information and privacy draft — October 7, 2026

Subtitle Private labor timer and primary Health & Fitness category persisted after returning to App Information. Verified privacy-policy URL and Data Not Collected response persisted in App Privacy. Final Publish opens an agreement attesting accuracy, legal compliance and future updates; the owner was asked for action-time approval and no final Publish occurred. Age rating, content rights, regulated-medical-device declaration, trader status, copyright and launch countries remain incomplete or awaiting owner facts. Screenshot upload permission, physical/professional acceptance and Android/account gates remain open. Evidence: task outputs/remediation-build10/apple-app-info-evidence.json and apple-privacy-publish-confirmation.png.

## October 7 saved age questionnaire

Apple questionnaire completed and reload verified for Olive: calculated 9+ in 172 regions; Vietnam/Brazil 12+, Korea All, earlier operating systems global 4+ with exceptions. No override. Current observations and preparation tools support wellness Yes, with no diagnostic/treatment guidance or objectionable content. This is separate from owner medical-device status. Chrome 5 reconnect allowed questionnaire work, but screenshot upload still reports disabled extension file-URL access; none uploaded. Privacy publishing attestation, owner facts, physical acceptance, professional reviews, Google verification and original Android key remain open.

## October 8 native screenshots uploaded

Apple version 1.3.0 now contains five native build-10 screenshots in each iPhone medium and iPad 13-inch slot. Reload verified both sets. Upload permission resolved; own regenerable build caches cleared to recover disk space, while signed exports, archives, screenshots and keys were preserved. Public submission remains open alongside privacy attestation approval, owner facts, device/professional acceptance and Android account/signing dependencies.
