# User Flow Gaps — Olive v1.0.0

All 10 gaps found during the 2026-06-08 flow walkthrough are now closed.

## ✅ 1-4: Fixed in first batch (commit 4be157e)

1. Backup banner shown before first contraction → now requires ≥1 finished
2. Backup card auto-downloaded → opens info sheet with Export/Import buttons
3. No guidance after first contraction → added "Real labor contractions usually come every 3-5 minutes"
4. ChecklistSheet empty state → "No items yet — tap Add to build your hospital bag list"

## ✅ 5-10: Fixed in second batch (commit 7ca0e56)

5. State transitions no undo → 5-second undo toast on state change
6. Floating timer PiP-only → fallback message: "Keep the app open — your screen won't sleep"
7. Share creation no guidance → "Send this link to your partner via text, WhatsApp, or any app"
8. Memory book link buried → "Memory book" card on main screen when archived share exists
9. Send Update vs Create Share order → "Send update without a link" moved below Create share
10. Error messages inconsistent → backup import errors use inline toast instead of alert()

## 📝 Design questions for Cam

These are product decisions, not bugs:

11. No session timer stop alert — if contraction runs >5min, user probably forgot to stop
12. Floating timer on Android — PiP works on Chrome but "floating" UX varies by browser
13. Postpartum auto-progression — toast is easy to miss, need more prominent notification?
14. No "I'm done" button — no explicit way for user to say "labor is over"

Status: all automatable gaps closed. Remaining questions are product
decisions for Cam to prioritize post-v1.0.0.
