> Historical review or plan. Use [RELEASE-PLAN.md](RELEASE-PLAN.md) for current v1.3.0 gates; this record is not current signed-binary, console, or launch evidence.

# Olive maternity-professional copy review packet

Status: packet ready; professional review has not occurred and must not be claimed.

## Reviewers and independence

Reviewer 1 must be a currently registered midwife or labor-and-delivery nurse. Reviewer 2 must be an independent maternity professional who did not author Reviewer 1's response. Use stable anonymous reviewer IDs in repository evidence. In a restricted study file, verify each professional's name, current credential, registration jurisdiction, verification date and verifier, relevant practice context, conflicts, separate submission, and lack of shared authorship.

This is a language and safety-boundary review, not a request to certify Olive as a medical device or endorse it for clinical decision-making.

## Product boundary

Olive records user observations, preserves a timer, and offers optional communication. It must not diagnose labor, interpret symptoms, recommend when to travel or remain home, provide an all-clear, replace individualized instructions, or delay contact with a professional or emergency service.

The reviewer should mark every surface **approve**, **change**, or **remove**, supply replacement wording for every requested change, and identify missing context or region-specific assumptions.

## Source-linked review inventory

Review the rendered current build and these sources together:

| Surface | Source | Required judgment |
| --- | --- | --- |
| Persistent urgent-help disclosure and care-team call | `src/App.tsx`, “Need help now?” | Is escalation language prominent, understandable under stress, non-exhaustive where necessary, and never falsely reassuring? |
| Saved timing reminder | `src/App.tsx`, “Saved care-plan reminder” | Does it describe a user-entered observation without diagnosing labor or directing travel? |
| Pattern-building message | `src/App.tsx`, “Pattern building” | Could any count, color, tone, or progress framing be mistaken for reassurance, risk scoring, or a clinical threshold? |
| Care-plan settings | `src/components/SettingsSheet.tsx` | Is it clear that values must come from the user's own care team and are not defaults supplied by Olive? |
| Spoken reminder | `src/App.tsx`, the care-plan `speak(...)` call | Is the audio safe when heard without the surrounding visual disclaimer? |
| Shared session status | `src/lib/shareStateCopy.ts`, `src/components/ShareView.tsx`, `src/components/JourneySheet.tsx`, and the shared-state controls/toast in `src/App.tsx` | Is every phase clearly a status selected in Olive rather than a diagnosis, prediction, or all-clear? |
| Factual labor-event log | `src/components/LaborEventsSheet.tsx` and `src/lib/laborEvents.ts` | Are event names neutral observations, with no inferred meaning or recommended action? |
| Hospital exam log | `src/components/HospitalSheet.tsx` and every `hospital.*` entry in `src/lib/i18n.ts` | Does every label and instruction describe user-recorded, care-team-reported facts without implying that Olive measures or interprets cervical progress? |
| Postpartum timeline boundary | `src/components/PostpartumTimelinePanel.tsx` | Does it avoid recovery scoring, symptom interpretation, and false reassurance? |
| Support escalation copy | `public/support/index.html` | Is urgent-help language appropriate for a non-clinical support page? |
| Privacy medical boundary | `docs/privacy-policy.md` and `public/privacy/index.html` | Is the distinction between informational processing and medical advice accurate and clear? |
| App Store and Play Store copy | `APP-STORE-CONNECT-FIELDS.txt`, `PLAY-STORE-CONSOLE-FIELDS.txt` | Do marketing claims avoid clinical benefit, proven reliability, diagnosis, or implied endorsement? |
| Screenshots | `docs/STORE-ASSET-REVIEW.md` and generated candidate set | Could any screenshot be read as an all-clear, recommendation, or universal threshold? |

## Required questions

1. Can any message, color, sound, vibration, or progress indicator mean “labor is confirmed,” “it is safe to wait,” or “go to hospital now” to a reasonable user?
2. Does urgent-help wording improperly imply a complete symptom list? Should wording or ordering change for bleeding, fluid loss, reduced fetal movement, severe symptoms, possible preterm labor, urge to push, or general concern?
3. Is “care team” understandable across midwifery, obstetric, family-practice, and hospital-led care?
4. Does the reminder remain safe when individualized instructions differ from common timing mnemonics?
5. Could “pattern building,” charts, counts, or calm visual treatment delay help-seeking?
6. Does the spoken reminder remain non-diagnostic without visual context?
7. Are postpartum and labor-event labels factual and non-interpretive?
8. Is any essential disclaimer too hidden, too long for urgent use, or inaccessible with assistive technology?
9. Which wording must vary by jurisdiction, care model, gestational context, or local emergency system?
10. Is any store phrase likely to imply clinical validation or professional endorsement?

## Review record and acceptance

For each item record source path, exact message IDs or original wording, rendered artifact reference, decision, rationale, replacement wording, severity, and whether the reviewer must see the revision again. Attach annotated screenshots where layout or prominence affects judgment. A broad surface approval does not cover wording absent from its recorded message IDs or artifact.

Start each independent record from `validation/templates/clinical-review.json`. Keep professional contact/registration evidence in the restricted study file rather than the repository record. Run `npm run evaluate:validation` to verify two distinct reviewers, complete inventory coverage, shared candidate identity, explicit decisions, and resolution/re-review of every P0/P1 change.

Acceptance requires both reviewers to complete every inventory row; every requested change to link to a source diff; P0/P1 changes to be re-reviewed in the rendered signed-candidate flow; conflicting advice to have a documented decision owner, final wording, rationale, linked diff and rendered re-review; and the dated evidence record to be linked from `PAID-LAUNCH-GATE.md`. Candidate version, source revision and artifact hash must match a named release-evidence record rather than relying only on manual transcription.

Completion permits the factual statement that named copy was reviewed on a specific build. It does not permit claims that Olive is clinically proven, medically approved, safe for all pregnancies, or a substitute for care.
