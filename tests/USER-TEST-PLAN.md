# User Testing Plan — Olive Contraction Timer
## For Cam — 5 real humans, 30 min each, find the friction

**Goal:** 5 real humans, 30 minutes each, find the things automation can't.

**The Gauntlet** (Playwright suite, sibling) catches:
- Buttons that don't work
- Crashes
- State machine bugs
- Permission denials
- Network failure handling

**You** catch what the Gauntlet can't:
- "I couldn't figure out what to tap"
- "The 5-1-1 alert is too clinical, I want to feel held"
- "I expected X to be a button, not a link"
- Copy that lands wrong
- Anything that makes a real pregnant person in labor feel safe or unsafe

---

## Recruitment

**5 testers. No pay, but gift a $25 coffee card.** Skip if you have people who'll do it for free.

**Who to recruit (mix matters):**
1. Pregnant person, third trimester, first baby
2. Pregnant person, third trimester, second-or-later baby (different mental model)
3. Partner of a pregnant person (support role — can they follow the timer and care summary?)
4. Friend who's NOT pregnant, has never been pregnant, no context (cold-start UX)
5. Someone who recently gave birth (last 6 months) — postpartum state, birth journey

**Where to find them:** JW community (Bianca's network), your work colleagues, partner-of-friends. Do not use any of your paying clients. Do not use Reddit or social media — those testers don't know you and won't give honest feedback.

**Send this message** (text or DM, no formal email needed):

---

> Hey, I'm shipping a contraction timer app and I need 5 real people to try it for 30 minutes and tell me everything that's wrong with it. Not gentle feedback — I want to know what confused you, what felt off, what you'd never tap, what copy is bad, where you didn't trust it.
>
> It's a 30-min call. I'll watch you use it, ask a few questions, take notes. You don't need to be pregnant or have any context. $25 coffee card on me.
>
> If interested, reply with a day next week that works. Tuesday or Thursday after 7pm is best.

---

## Before the session

1. **Install the app on a test iPhone** (TestFlight or a sideloaded build)
2. **Don't open it ahead of time** — you want to see cold-start
3. **Have a notepad open** for the rough transcript. You don't need a recording unless they say yes
4. **Set a 30-min timer**

## During the session

Show them the PWA, then run these 5 segments in order. Total: 25 min of tester time, 5 min of wrap-up. Reference the app as "Olive" — not "Olive" — when talking to testers.

### 1. Cold start (5 min) — no app open

> "Open the Olive app"

Watch them:
- What do they do on the landing page?
- Does the onboarding carousel confuse them?
- Can they find the Start button?
- Do they read the copy, or just tap?

**Open question to ask:**
- "What did you expect to see?"
- "Did anything here confuse you?"
- "Is there anything you'd want me to tell you before you started timing contractions for real?"

### 2. Core timer loop (5 min) — record a few contractions

> "Imagine your partner is having contractions. Tap Start when one begins, then Stop when it ends."

Watch them:
- Tap Start
- Do they wait, or do they want to add notes during the contraction?
- When the timer is running, can they tell at a glance how long it's been?
- When they Stop, do they know what happens next?

**Open questions:**
- "How long did that feel? In real labor you'd be in pain — would this UX work?"
- "What would you want to see while a contraction is in progress?"

### 3. Backup & care summary (5 min) — get the data out

> "Your data lives only on this phone. Show me how you'd keep it safe and get it to your care team."

Watch them:
- Can they find Settings → Export backup?
- Does "Send via…" feel trustworthy (it uses the phone's own share sheet)?
- Import the exported file back — do they trust the merge message?
- Can they find the Share care summary action and read what it would send?

**Open questions:**
- "Where did you expect your data to live?"
- "If your phone died mid-labor, what would you want to have happened?"
- "Would you send that care summary to your midwife? Why or why not?"

### 4. Voice control (3 min) — if your tester is alone

> "There's a hands-free mode you can use during contractions. Try it."

If they have a mic:
- Say "start" / "stop" / "begin" / "end" / "done"
- Does it work?
- Do they feel like the activation is clear?

If they decline mic permission, watch:
- Does the error message make sense?
- Do they give up, or look for an alternative?

**Open questions:**
- "If your hands were shaking and you couldn't reach your phone, would you trust this?"
- "Did the voice feel natural or robotic?"

### 5. Subjective (5 min) — open feedback

> "OK, you used it. What did you hate? What confused you? What would you change?"

Write down verbatim. Don't paraphrase. The exact words matter. Things to listen for:
- "I didn't know if my data was private" → trust issue
- "The buttons were too small" → accessibility / labor ergonomics
- "I expected X" → missing feature or wrong copy
- "I wouldn't put my contraction data in some app I just downloaded" → trust signal missing

## Wrap-up

> "Last question: would you actually use this in labor? Why or why not?"

Get the answer. Don't prompt. Write it down.

Thank them. Send the coffee card.

---

## After the sessions — issue intake

Within 24 hours of each session, create a single GitHub issue:

**Title:** "User testing round 1 — [tester description], [date]"

**Body:**
- Tester description (which of the 5 buckets)
- Verbatim quotes (the exact words)
- Bugs observed (P0/P1/P2)
- Feature requests heard
- Trust signals missing
- Body language / hesitation notes

Don't try to triage while the test is happening. Get the raw signal, then triage in a separate session.

## What to do with the issues

Per Cam's per-issue walk-through pattern (FFH Markup, etc.):
1. Group by severity
2. P0 (crash / data loss / blocking): fix within 24 hours
3. P1 (broken behavior): fix before launch
4. P2 (polish): backlog for v1.1
5. P3 (opinion / feature request): archive

One issue at a time. Don't batch.

---

## What you cannot get from this

- 5 testers is a sample, not a study
- No one is in real labor during the test
- No one is using this with a real birth partner
- A test iPhone is not the tester's own device with their real data on it

This is the fastest way to find the **friction** that the Gauntlet can't. It's not a substitute for the real launch — it's the last check before.
