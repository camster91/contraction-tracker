# Olive v1.3.0 maternity-professional wording review

Prepared packet; professional review has not occurred. Issue #69 requests two independent maternity professionals, including a currently registered midwife or labor-and-delivery nurse. Verify credentials/independence in restricted records and use anonymous reviewer IDs in Git. Contacting reviewers requires authorization.

This reviews wording and interpretation; it is not medical-device certification or clinical endorsement. Review the rendered signed candidate, recording version/build, full source revision, installed distribution and matching artifact hashes. Source strings or browser images alone do not establish native-candidate approval.

## Current inventory

| Surface | Current source and review focus |
|---|---|
| Saved reminder | `src/App.tsx`: Saved care-plan reminder and matching-timing detail. Assess diagnosis, reassurance and travel-direction interpretations. |
| Opt-in settings | `src/components/SettingsSheet.tsx`, `src/lib/carePlan.ts`: disabled by default. Assess prefilled numbers and individualized instructions. |
| Spoken reminder | The care-plan `speak(...)` call in `src/App.tsx`; assess audio without the visual disclaimer. |
| Objective frequency | `src/components/ActiveLaborBanner.tsx`: Frequent contractions/count in ten minutes. Review wording, color and prominence. |
| History / summary | Current history/chart and exported summary. Assess clinical interpretation of counts, averages and intervals. |
| Questions / responsibilities | `src/components/ProviderQuestionsPanel.tsx`, `src/components/ResponsibilitiesPanel.tsx`; user-entered prompts/tasks without clinical advice. |
| Exam log | `src/components/HospitalSheet.tsx` and English `hospital.*` messages in `src/lib/i18n.ts`; visible labels/instructions and reported-measurement boundary. |
| Care card / postpartum | `src/components/CareCardPanel.tsx`, `src/components/PostpartumTimelinePanel.tsx`; actual current routes and user-entered-information boundary. |
| Support / privacy | `public/support/index.html`, `public/privacy/index.html`; support escalation and limits, then published copies. |
| Store copy / images | Current Apple/Play field drafts and final screenshots; implied validation, endorsement or universal thresholds. |

Partner links, shared session status, the former dedicated labor-event log, the removed Pattern building banner and memory-book PDF are outside this release. Retained localization strings do not prove a surface is displayed. English is the launch language.

## Questions and records

Could wording, color, sound, charts or counts imply confirmed labor, an all-clear, safety of waiting or direction to travel? Is the boundary understandable without a hidden disclaimer? Could layout/language delay seeking help? Are care-team instructions distinguished from app-supplied values? Record omissions and proposed changes against the actual rendered candidate.

Each reviewer records a dated decision per row: approve, changes required, or not applicable with evidence of absence. Include exact wording/message IDs, source path/hash, rendered artifact/hash, rationale, replacement, severity and re-review need. Keep signed attestations and credentials restricted and link sanitized references from #69.

Resolve conflicting advice with a named owner and rationale. Every P0/P1 change needs an issue, source diff, updated rendered evidence and independent re-review on the replacement candidate. Both reviewers must approve the final inventory. Changed copy/binaries require an assessment of whether earlier evidence still applies.

The historical evaluator/template requires retired shared-status/pattern-building surfaces. Reconcile it before automated acceptance. There is no current `npm run evaluate:validation` command. Manual review must remain explicit until tooling is aligned; a historical script pass does not certify v1.3.
