# Olive v1.3.0 maternity-professional wording review

Prepared packet; professional review has not occurred. Issue #69 requests two independent maternity professionals, including a currently registered midwife or labor-and-delivery nurse. Verify credentials/independence in restricted records and use anonymous reviewer IDs in Git. Contacting reviewers requires authorization.

This reviews wording and interpretation; it is not medical-device certification or clinical endorsement. Review the rendered signed candidate, recording version/build, full source revision, installed distribution and matching artifact hashes. Source strings or browser images alone do not establish native-candidate approval.

## Current inventory

The evaluator and review records use inventory ID `olive-native-v1.3-en`. This is the
free, English, native v1.3 surface contract; a browser-only image or an older
candidate does not establish review of the signed native candidate.

| Surface | Current source and review focus |
|---|---|
| `saved-reminder` — Saved reminder | `src/App.tsx`: saved care-plan reminder and matching-timing detail. Assess diagnosis, reassurance and travel-direction interpretations. |
| `care-plan-settings` — Opt-in settings | `src/components/CarePlanPanel.tsx`, `src/lib/carePlan.ts`: disabled by default. Assess prefilled numbers and individualized instructions. |
| `spoken-reminder` — Spoken reminder | The care-plan `speak(...)` call in `src/App.tsx`; assess audio without the visual disclaimer. |
| `objective-frequency` — Objective frequency | `src/components/ActiveLaborBanner.tsx`: frequent contractions/count in ten minutes. Review wording, color and prominence. |
| `history-summary` — History / summary | `src/App.tsx`, `src/components/HistoryHeader.tsx`, `src/lib/contractions.ts`: assess clinical interpretation of counts, averages, intervals and the exported summary. |
| `questions-responsibilities` — Questions / responsibilities | `src/components/ProviderQuestionsPanel.tsx`, `src/components/ResponsibilitiesPanel.tsx`; user-entered prompts/tasks without clinical advice. |
| `hospital-exams` — Exam log | `src/components/HospitalSheet.tsx` and English `hospital.*` messages in `src/lib/i18n.ts`; visible labels/instructions and reported-measurement boundary. |
| `care-card-postpartum` — Care card / postpartum | `src/components/CareCardPanel.tsx`, `src/components/PostpartumTimelinePanel.tsx`; actual current routes and user-entered-information boundary. |
| `support-privacy` — Support / privacy | `src/components/SettingsSheet.tsx`, `public/support/index.html`, `public/privacy/index.html`; support escalation, privacy limits and published copies. |
| `store-copy-images` — Store copy / images | `APP-STORE-CONNECT-FIELDS.txt`, `PLAY-STORE-CONSOLE-FIELDS.txt`, `docs/STORE-ASSET-REVIEW.md`; assess implied validation, endorsement or universal thresholds. |
| `pregnancy-planner` — Pregnancy planner | `src/components/PregnancyPlannerPanel.tsx`, `src/components/JourneySheet.tsx`; assess optional due date, provider prompts and user-entered planning boundaries. |
| `archive-pause` — Archive pause | `src/components/JourneySheet.tsx`, `src/App.tsx`, `src/messages/en.ts`, `src/lib/journey.ts`; assess pause wording, record retention and explicit resume without implying a new pregnancy record. |
| `text-sharing` — Text sharing | `src/components/ManualShareSheet.tsx`, `src/lib/shareSummary.ts`, `src/components/HistoryHeader.tsx`, `src/App.tsx`; assess explicit review/copy behavior, cancellation and no automatic transfer. |
| `lull-handoff` — Optional Lull website handoff | `src/components/JourneySheet.tsx`; assess postpartum-only placement, clear website destination and the explicit no-record-transfer boundary. |

Retired surfaces remain historical context only and cannot satisfy the current inventory:

| Historical ID | Current disposition |
|---|---|
| `urgent-help`, `pattern-building`, `shared-status`, `labor-events` | Removed or superseded; retain historical records, but do not map them to a current approval. |
| `postpartum-boundary` | Superseded by `care-card-postpartum`; review the current source and rendered candidate. |
| `support-escalation`, `privacy-boundary` | Superseded by `support-privacy`; review the combined current boundary. |
| `store-copy`, `screenshots` | Superseded by `store-copy-images`; review current metadata and images together. |

Retained localization strings do not prove a surface is displayed. Partner links,
shared session status, the former dedicated labor-event log, the removed Pattern
building banner and memory-book PDF are outside this release. English is the launch
language.

## Questions and records

Could wording, color, sound, charts or counts imply confirmed labor, an all-clear, safety of waiting or direction to travel? Is the boundary understandable without a hidden disclaimer? Could layout/language delay seeking help? Are care-team instructions distinguished from app-supplied values? Record omissions and proposed changes against the actual rendered candidate.

Each reviewer records a dated decision per row: approve, changes required, or not applicable with evidence of absence. Include exact wording/message IDs, source path/hash, rendered artifact/hash, rationale, replacement, severity and re-review need. Keep signed attestations and credentials restricted and link sanitized references from #69.

Resolve conflicting advice with a named owner and rationale. Every P0/P1 change needs an issue, source diff, updated rendered evidence and independent re-review on the replacement candidate. Both reviewers must approve the final inventory. Changed copy/binaries require an assessment of whether earlier evidence still applies.

`npm run evaluate:validation` now checks the current inventory and remains red until
genuine records meet the exact-candidate, independent-review, rendered-artifact and
retest gates. `npm run evaluate:validation -- --check-templates` checks only the
structural templates. Neither command creates acceptance evidence: manual review,
consent, physical-device checks, store evidence and owner decisions remain separate.
