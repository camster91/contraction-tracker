# Olive v1.3.0 native-device acceptance

No physical-device runs are recorded here. Test the exact signed candidate distributed through TestFlight/internal testing. Cover physical iPhone, iPad if offered by the iOS app, and Android devices representative of supported OS/screen sizes. Browser/simulator checks are supplementary.

Use fabricated records. Record tester ID, device/model, OS, version/build, full source revision, distribution reference, artifact hash, date, result, issue and redacted evidence for every check. Never put credentials, real clinical records or contact details in Git.

| Check | Steps and expected evidence |
|---|---|
| Install | Open processed build without account setup; confirm version/identity and no missing assets, blank screen or crash. |
| Offline cold start | Disable networking before launch/relaunch; time contractions and open history/settings. Confirm no server dependency; restore networking afterward. |
| Timing / background | Compare to independent clock through background, lock/unlock, relaunch and Stop. Confirm one authoritative record and correct duration. |
| Recovery | Relaunch with unfinished timer and history; resume/discard explicitly. Import valid fixture with pending timer. Preserve history without duplicates. |
| Manual entry / edits | Add missed contraction, verify marker, edit/delete/undo and reload. Reject invalid/future/excessive-duration edits without changing saved records. |
| iOS Live Activity | Exercise available Start/Stop actions on supported iPhone and reconcile app state. Disable/deny activities and confirm in-app fallback. Check unsupported-device behavior. |
| Android notification | Allow/deny permission in isolated runs; exercise timer actions and return to app. Verify elapsed time, no duplicate timer and usable denied-permission fallback. |
| Native export | Export backup/summary, cancel, save to Files/local storage and open saved file in destination. Receiver must read after share sheet closes; temporary cache copy must be cleaned up. |
| Import | Confirm all populated fixture domains/current timer; malformed backup must cause no partial writes. Back up before destructive fixture testing. |
| Failure recovery | Induce only isolated supported fault fixtures; check recovery/export/reload and visible storage failures. Record what was actually induced. Do not corrupt real data or exhaust real-device storage. |
| Opt-in reminder | Fresh install disabled; explicitly enter fabricated values/enable. Verify displayed/spoken reminder, disable/snooze and persistence. Do not dial a real number. |
| Screen readers | VoiceOver/TalkBack operate timer, forms, modal close, switch, history and import/share. Record names, state announcements, focus and errors. |
| Text / layouts | OS accessibility text sizes, small screens, portrait/landscape and iPad. Core controls must stay reachable, labels readable and modal content scrollable. |
| Motion / motor | Actual reduced-motion/assistive-input settings. Simulated settings do not replace lived-experience study evidence. |
| Uninstall | Disposable fixture only: export, uninstall/reinstall and verify local records gone, independently saved exports retained. No implied cloud recovery. |
| Support / privacy | Open final public URLs from installed app; check scope, contact and readability. |

Record failures in existing issues with reproduction/evidence. Fix/retest affected cases on a new identified candidate and retain earlier runs. Closure needs recorded results, resolved blocking findings and explicit review. This matrix complements #69/#70; it is not store approval.

## Supplementary Simulator run — October 7, 2026

Candidate source `235e91f6ab596a230c0e04115fdb9405a430efd6`, version 1.3.0/build 8, iPhone 17 Simulator/iOS 26.5. The Simulator binary uses the same verified embedded web payload as the signed iOS candidate; it is not the TestFlight binary or a physical device. Only isolated fabricated records were used.

Observed: onboarding dismissal and native timer Start; Sessions opens with current Primary name inside, and a reachable Stop above the sheet ends recording and saves one 19-second record. Editing its end by −5 seconds displays a 14-second draft; Cancel restores the saved 19-second record. Big Text increases native preferences, labels and the active timer without shrinking it. A second timer continued across Home/background and reopening Olive (13 seconds before background; 27 seconds on return); Stop saved one 30-second record. This is a continuity observation, not independent-clock timing accuracy, lock-screen or process-kill acceptance.

The separate Device Hub display restores touch input that failed in the combined window. Wheel scrolling did not move app content; touch-drag scrolling did. Screenshot saves are asynchronous: copied captures were reconciled to their original capture filenames after saving and visually checked. Manifest includes dimensions and SHA-256 values.

Evidence: task `outputs/remediation-build8/native-simulator-manifest.json` and eight original native PNG captures. Physical offline, lock/relaunch, Live Activity, export/import, VoiceOver, native keyboard, OS text scaling, iPad and Android acceptance remain open. No row in the physical-device matrix is closed by this run.
