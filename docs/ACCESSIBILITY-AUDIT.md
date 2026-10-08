> Historical review or plan. Use [RELEASE-PLAN.md](RELEASE-PLAN.md) for current v1.3.0 gates; this record is not current signed-binary, console, or launch evidence.

# Olive accessibility evidence

Status: local automated and browser stress checks pass. Physical assistive-technology validation remains open.

Evidence date: 2026-08-28. The current evidence describes the dirty local source snapshot and must be rerun against the exact signed candidates.

## Automated coverage

- WCAG 2 A/AA axe checks cover the primary timer, settings/data controls, and a live private-share state; sharing-state semantics and target sizes have focused assertions.
- Timer start/stop automation verifies an assertive state announcement and focus transfer to the replacement Stop/Start action.
- Backup validation failures are exposed as assertive alerts, recovered timers as live status, and Settings exposes pressed-state groups plus named quiet-hour selects.
- Reduced-motion automation confirms repeating timer animation is suppressed.
- Modal tests verify accessible dialog semantics, initial focus, focus containment, and keyboard dismissal.
- The 320 CSS-pixel reflow test keeps the timer, urgent-help action, sessions, sharing, and settings operable without horizontal page overflow.
- The 200% root-text stress test keeps settings, sharing, destructive data controls, and manual-entry save/close controls reachable without horizontal page overflow.
- Critical header, history, sheet-close, backup-reminder, onboarding, and share-link controls use a 44-by-44 CSS-pixel minimum touch target that does not double into an unusable header when text is enlarged.
- Focused pseudo-translation expansion and RTL-direction checks keep timer, Settings, backup, privacy, destructive controls, manual entry, labor events, partner activity/messaging, the public partner view, and the Today → Birth journey → Care card route operable without horizontal page overflow. Real `ar-XB` catalog renders cover start, active timing, stop, annotation, the complete Settings safety/data surface, private sharing, public partner view, missed-contraction validation, factual labor-event safety/validation, activity identity/send/retry, and care-card privacy/save/copy output. Focused dialogs, the activity composer, care card, and public-view fixture pass automated WCAG A/AA scans; composer actions now have programmatic names and 44px targets, while PIN, loading, validation, and relay-error states expose live semantics.
- Provider-question and responsibility destructive actions use 44px targets, deterministic next-item/input focus, persistent live status, and a five-second parent-owned Undo that restores the exact item and focus without replacing concurrent journey changes. User-entered question, task, and assignee text is never pseudo-transformed.
- Postpartum Timeline fixed copy is catalog-backed; add, complete, reopen, and delete states announce politely; destructive and completion controls use 44px targets; deletion shares the parent-owned five-second Undo and deterministic restored-item focus. A real pseudo-RTL journey preserves raw Arabic and placeholder-like user text, avoids page overflow, and passes the focused WCAG A/AA scan.
- Hospital exams fixed copy is catalog-backed with a non-diagnostic boundary that tells users to record only care-team-reported measurements. Dilation and station groups expose legends, selected state, and descriptive names; effacement has a programmatic label; primary and destructive controls meet the 44px convention; saved/deleted states announce politely. Pseudo-RTL preserves reported Arabic notes, avoids page overflow, and passes the focused WCAG A/AA scan.
- People and Sessions sheets use catalog-backed labels, 44px actions, modal focus trapping, named call/share/view/end/delete controls, polite status, RTL-aware alignment, and raw user-value interpolation. The People pseudo-RTL flow preserves Arabic names and contact links and passes its focused WCAG A/AA scan. Session deletion is disabled while contraction records belong to that session, and empty-session deletion exposes a named two-step confirmation.
- Hospital Bag exposes a named progressbar, catalog-backed default items, raw custom text, 44px toggle/delete/add actions, accessible keyboard move controls, live mutation status, assertive storage-failure feedback, and a five-second deletion Undo that restores focus. Its pseudo-RTL custom-item/reorder/Undo journey avoids overflow and passes the focused WCAG A/AA scan.

Run the focused evidence with:

```bash
npx playwright test tests/e2e/automated-accessibility.spec.ts tests/e2e/accessibility-release.spec.ts tests/e2e/large-text-reflow.spec.ts tests/e2e/localization-stress.spec.ts --project="iPhone 14 (chromium)"
```

## Issues resolved in this pass

- Added a visible, named close control to Settings instead of relying on the backdrop or Escape key.
- Enlarged the sharing close control to the platform minimum target size.
- Made missed-contraction entry vertically scrollable at constrained heights and enlarged text.
- Prevented critical header controls from forcing horizontal overflow under enlarged root text.
- Enlarged compact history actions to the minimum touch height while allowing wrapping.
- Preserved keyboard and screen-reader context when the primary Start/Stop control is replaced.
- Added live semantics for timer recovery and backup errors, and programmatic names/state for theme, hour-cycle, and quiet-hour controls.
- Made clipboard feedback truthful when browser permission is denied, labeled the read-only private-link field, added a dedicated sharing live region, and preserve focus when a share is created, revoked, or fails because the server is unavailable.
- Added focus trapping, Escape/return-focus behavior, labeled measurement inputs, 44-point controls, an assertive error region, and an automated WCAG A/AA scan to the birth-record sheet.
- Localized and re-audited ended-session detail in pseudo-RTL, preserving user-owned names while exposing a 44-point labeled close action and passing a scoped WCAG A/AA scan.
- Replaced pointer-only SVG pain regions with labeled, keyboard-operable 44-point pressed-state buttons; pseudo-RTL browser coverage verifies selection, the three-region limit, and persisted stable identifiers.
- Added an explicitly labeled shared-photo review group with an informative preview, disclosure, 44-point Send/Cancel actions, and failure-preserving retry behavior.
- Removed nested interactive controls from incoming-activity toasts, separated Open and Dismiss into labeled 44-point buttons, and expanded global-toast dismissal to a 44-point target.
- Localized the crash-recovery surface and replaced the unconditional data-safety claim with accurate reload/backup recovery guidance.
- Added accessible localized summaries to both the interval and duration-pattern charts, hid decorative chart internals from the accessibility tree, added pressed-state semantics and 44-point targets to history filters, and added pseudo-RTL coverage for statistics, charts, custom tags, tool navigation, and truthful backup guidance.
- Catalog-backed PiP labels, native share-sheet titles, backup-share text, and care-summary export copy preserve provider names, notes, phone numbers, and other user-owned values under pseudo-RTL. The memory-book PDF now lazily embeds licensed Unicode font subsets; automated extraction verifies Canadian French copy and Arabic-script numerals without transforming user-owned text.
- Replaced the secondary empty-state timer pseudo-button with a native button and brought timer, annotation, history-edit, onboarding, and floating-timer actions to the local 44px target convention.
- Birth-journey subviews now move focus to the Back action and restore focus to the originating module; journey Back/Close controls and module launchers meet the local 44px target convention.

## Required physical validation

Automation does not prove screen-reader wording, focus order in native WebViews, gesture discoverability, switch scanning, operating-system Dynamic Type behavior, orientation transitions, or motor usability. Before public release, record dated results from the exact signed iOS and Android candidates for:

- VoiceOver and TalkBack through start, stop, correction, urgent-help, export, sharing, and deletion flows.
- 200% system text/Dynamic Type, display zoom, and font scaling on supported physical devices.
- Switch Control/Switch Access, external keyboard, and reduced-motion settings.
- Portrait and landscape on the smallest supported phone and a supported tablet.
- Permission allow, deny, and later-enable flows for voice and notifications.

Any clipped content, inaccessible action, misleading announcement, focus loss, or dependence on color alone is a release blocker until fixed and retested.
