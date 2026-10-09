# Olive build 15 remediation

October 9, 2026. This is the approved correction round after the agent code, feature and UI review. Existing store receipts remain historical. Build 15 is a replacement candidate; no build 15 upload, physical acceptance or store approval is claimed here.

## Corrections

- Timing, history, care-plan reminders, spoken updates and shared summaries follow the selected session. The selected session is visible beside the timer as a label.
- Creating, switching or ending the recording session requires stopping the active contraction first. Ended sessions are view-only. Ending/deleting an active session updates React state and persisted selection together; sessions containing saved contractions, exams or checklist items cannot be deleted.
- Import reads live sessions instead of stale component state and validates nested backup records before touching storage. Legacy record backups remain supported. Portable records exclude device preferences and the UI says so.
- Corrupt sessions, contacts, exams, hospital-bag and journey documents recover from validated local shadows. Journey startup reads its IndexedDB mirror before default data can overwrite it. Crash backup preserves valid local and mirrored contraction records.
- Cancelling a phone share does not copy private data. Unavailable sharing opens a selectable text sheet with explicit Copy and Select all actions. Error toasts leave the timer visible; session refusal feedback is inside the accessible dialog.
- Cross-tab delivery accepts annotation changes and intentional reversions without an echo loop.
- Native Start/Stop use Capacitor haptics. A failed lock-screen timer update is shown without interrupting recording.

## Verification and remaining release gates

Local lint, TypeScript (app and end-to-end tests), production build and 44 unit tests passed. Metadata, offline assets and 11 iOS structure checks passed. Full browser results and immutable candidate identity are recorded in the task's build-15 evidence. Run lint, TypeScript, production build, unit tests, Chromium/WebKit journeys, store metadata/offline checks and native structure checks before freezing the candidate.

Native sharing, permission denial, Live Activities, background/relaunch timing and accessibility still need physical-device results on the exact candidate. Host tests do not establish those results or Apple/Google acceptance.

The original iCloud-offloaded checkout and its unrelated validation data are preserved. Execution uses a fresh local clone outside iCloud. Build 14 receipts remain available for rollback and existing testers until build 15 is signed, uploaded, processed and explicitly observed in TestFlight.

Android uses the approved new local upload key because Olive had no existing Play app. Do not infer key registration from a signed local AAB. Google organization documents were submitted on October 8; representative phone verification and Google's approval remain external gates until freshly verified.

The Android host compile attempt failed while extracting AAPT2 with "No space left on device". This is an environment failure, not a passed native check. Disposable task npm downloads and Gradle transforms were cleared; source, archives, exports and signing material were retained. Signed native rebuilding remains pending adequate disk headroom.
