> Historical planning/evidence. Current v1.3.0 scope and release gates are in [RELEASE-PLAN.md](RELEASE-PLAN.md). Do not use this file as current submission approval or artifact evidence.

# Olive store asset review

Status: reproducible screenshot candidate generated and visually reviewed locally; final signed-binary reconciliation remains open.

Review date: 2026-08-28  
Generator: `tests/e2e/screenshots-store.spec.ts`  
Durable output: `store-assets/`

## Generation evidence

- 25 of 25 screenshot captures passed after a production web build: 20 Apple-size candidates plus a dedicated five-image Google Play set.
- Five states were captured at each configured size: idle timer, active timer, contraction history, summary-first sharing, and saved care-plan reminder.
- The generator now opens the actual sharing dialog and asserts it is visible before capture.
- Seeded history uses the current numeric intensity schema, dismisses the backup prompt, and scrolls the history into the viewport.
- Generated Apple candidate sizes are 1290x2796, 1170x2532, 1242x2208, and 2048x2732. The dedicated Play set is 1080x1920 because the 1290x2796 Apple image exceeds Google Play's maximum 2:1 long-edge ratio.
- The opaque 1024x1024 Apple icon, opaque 512x512 Play icon, and opaque 1024x500 Play feature graphic are repository-owned and checked alongside the screenshots by `npm run check:store-assets`.
- `store-assets/captions.json` maps each screenshot state to a concise non-diagnostic headline and accessibility description. The asset verifier requires all five entries, enforces length limits, and rejects known diagnostic/reassurance language.
- iOS, Android/PWA, and store presentation now use the same existing heart mark; the stale iOS-only olive-branch artwork was removed from every iOS icon size.
- Current requirements were reconciled against Apple App Store Connect screenshot specifications and Google Play preview-asset guidance on 2026-08-28.

Authoritative references:

- Apple: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- Google Play: https://support.google.com/googleplay/android-developer/answer/9866151

## Visual review

The phone candidates clearly show the primary timer, live timing, factual history, summary-first privacy boundary, and care-team handoff. No diagnostic or all-clear claim appears in the reviewed frames.

The initial 12.9-inch iPad candidates exposed excessive unused horizontal space because the application remained phone-width. A deliberate 672px tablet canvas now passes portrait and landscape visual review in `TABLET-UX-AUDIT.md`. Store candidates still require regeneration from the final signed build and physical iPad validation.

## Open release gates

- [x] Retain iPad support with a deliberate wider single-column tablet canvas; see `TABLET-UX-AUDIT.md`.
- [ ] Complete human review of the drafted, automatically validated marketing captions without obscuring product state or safety language.
- [ ] Capture from, or reproduce against, the exact signed TestFlight and Play internal-testing binaries.
- [ ] Record immutable source revision, artifact identifiers, screenshot hashes, reviewer, and review date.
- [ ] Upload only after the clinical/store-copy review and explicit release approval.
