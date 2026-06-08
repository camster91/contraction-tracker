# User Flow Gaps — Olive v1.0.0

Found during end-to-end flow walkthrough, 2026-06-08.

## ✅ Fixed (committed)

1. **Backup banner shown before first contraction** — brand-new users
   saw "Save a backup" asking them to back up nothing. Fixed: banner
   now requires ≥1 finished contraction.

2. **Backup card auto-downloaded without confirmation** — "Export &
   restore" card triggered an instant file download. Users expected
   to see options. Fixed: card now opens info sheet with "Export backup"
   and "Import backup" buttons.

3. **No guidance after first contraction** — after stopping the first
   contraction, the "Since last" block said only "since first
   contraction." First-time users had no idea what's normal. Fixed:
   added "Real labor contractions usually come every 3-5 minutes and
   get stronger."

4. **ChecklistSheet empty state** — no items showed blank space.
   Fixed: added "No items yet — tap Add to build your hospital bag list."

## ⚠️ Known gaps (not fixed yet)

5. **State transitions have no undo** — StatePicker lets you change
   from prenatal → labor → postpartum with one tap. No undo. If user
   accidentally taps "postpartum," they can't go back. Need: undo
   toast for 5 seconds after state change.

6. **Floating timer is PiP-only** — uses `document.pictureInPictureEnabled`
   which is NOT supported in Safari iOS or some Android browsers.
   Users on unsupported browsers never see the floating timer button.
   Need: fallback (minimized overlay?) or at least an info message.

7. **After creating a share — no guidance** — share code appears as
   a text URL, but there's no "Share via text message" prompt, no
   system share sheet trigger, and no copy confirmation. User might
   think the code is enough and never actually share the link.

8. **Memory book link buried** — the "Download PDF" link only appears
   in archived shares on the share view. User must: open the share,
   know to scroll to it. No card or notification on the main screen.
   Need: "You have a memory book" card when share transitions to archived.

9. **Share sheet opens with "Send update" before creating a share** —
   the Send Update button appears alongside the Create Share button.
   Users might tap Send Update before creating a share, getting a text
   summary with no link. The two flows should be more visually distinct.

10. **Error messages inconsistent** — some errors show detailed inline
    text (relay error during share creation), some use `alert()`
    (backup import validation), some silently fail. Examples:
    - Relay unreachable: clear inline message ✓
    - Backup import invalid: `alert()` ✗
    - Push to relay failed: inline message ✓
    - Undo after delete: toast ✓
    - Checklist item add fails: silent ✗

## 📝 Feature gaps (design questions for Cam)

11. **No session timer stop alert** — if a contraction has been running
    for >5 minutes, the user probably forgot to stop it. Should we
    alert them? The 4-hour stale-state detection exists but is silent.

12. **Floating timer on Android** — the PiP button shows "Open floating
    timer" but what it actually does is enter PiP mode (video-like)
    which requires the browser support. On Android Chrome it works, on
    Safari iOS it doesn't. Should we invest in a real in-app floating
    timer?

13. **Postpartum auto-progression** — after 24h of no contractions,
    shares auto-progress to postpartum. But the user might not notice.
    There's a toast but it's easy to miss. Need: more prominent
    notification?

14. **No "I'm done" button** — there's no explicit way for the user
    to say "labor is over." They must manually set the state to
    postpartum. Many users wouldn't know to do this.
