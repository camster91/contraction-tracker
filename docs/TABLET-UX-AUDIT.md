> Historical review or plan. Use [RELEASE-PLAN.md](RELEASE-PLAN.md) for current v1.3.0 gates; this record is not current signed-binary, console, or launch evidence.

# Olive tablet UX and accessibility audit

Status: local responsive improvement verified visually; physical iPad and assistive-technology validation remain open.

Audit date: 2026-08-28  
Surface: primary timer at supported iPad portrait and landscape sizes  
User goal: start or stop timing immediately while retaining readable safety, correction, sharing, and secondary actions

## Captured steps

1. **Current iPad portrait — needs improvement.** `playwright-report/tablet-audit-2026-08-28/01-current-ipad-portrait.png`
   - The timer remained usable and centered, but the 448px phone-width canvas occupied about 44% of a 1024px viewport.
   - Large unused margins made the supported iPad build resemble a phone compatibility view.
2. **Improved iPad portrait — healthy for local beta.** `playwright-report/tablet-audit-2026-08-28/02-improved-ipad-portrait.png`
   - The same focused hierarchy now uses a 672px canvas: urgent help, primary timer, correction action, onboarding, sharing, and tools remain in a predictable single column.
   - Measured canvas: 672px wide, centered at x=176 in a 1024px viewport, with no horizontal overflow.
3. **Improved iPad landscape — healthy for local beta.** `playwright-report/tablet-audit-2026-08-28/03-improved-ipad-landscape.png`
   - The constrained canvas prevents overly long text lines and excessive reach while avoiding the former phone-width appearance.
   - Primary and secondary actions remain fully visible without horizontal reordering.

## Strengths

- The primary timer remains visually dominant in both orientations.
- Urgent-help access remains above the timer and is not displaced into a secondary column.
- Correction, sharing, and tools preserve their mobile order, reducing cross-device relearning.
- The larger canvas improves use of space without adding distracting dashboard density.
- No content is clipped or horizontally scrollable in the measured portrait state.

## UX and accessibility risks

- Bottom sheets, long histories, large text, split-screen, external keyboard focus, and running-timer states were not proven by these three screenshots.
- Screenshots cannot verify VoiceOver reading order, switch-control navigation, focus restoration, contrast under device display settings, or physical reach.
- The landscape layout intentionally remains a centered single task column. A two-column dashboard was rejected because it would separate urgent guidance from the timer and increase cognitive scanning during labor.
- The 12.9-inch store screenshots must be regenerated from the final signed candidate before approval.

## Decision

Keep iPad support. Use the responsive 672px maximum canvas on tablet while retaining the phone-width canvas below the medium breakpoint. Do not claim physical iPad or accessibility validation until the device gates in `PAID-LAUNCH-GATE.md` are complete.

