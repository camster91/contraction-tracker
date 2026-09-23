# Olive — User Testing Recruitment

If you're sharing the app with friends and family for testing, here's
how to get the most useful feedback in the least amount of their time.

## Who to ask

Best testers (in priority order):
1. **Bianca** — she's the actual user, will use it for real
2. **Anyone currently pregnant or recently gave birth** — they have the
   lived experience to spot UX issues
3. **Anyone who's been a birth partner** (dad, mom, doula, sister) —
   they know what a support person needs to see at a glance
4. **Anyone tech-savvy with iPhones or Android** — they'll find crashes

What you DON'T need: a software engineer or a tester by profession.
You need: someone who could plausibly be in a hospital room at 3am
trying to time their contractions.

## Recruitment message (copy-paste)

> Hey — I'm launching a contraction timer app called Olive, and I need
> 5 people to try it for 10-15 minutes before I submit it to the App
> Store. It's free, no signup, no ads. Your data stays on your phone.
>
> If you can: install it, time a fake contraction (just hit Start, wait
> 5 seconds, hit Stop), and tell me:
> - Was anything confusing?
> - Did anything look broken?
> - Did the "call your provider" 5-1-1 alert work when you tried it?
> - What would make you use this at 3am in labor?
>
> iPhone: <App Store link once it's up>
> Android: <link to the universal APK>
>
> Thanks. — Cameron

## What to look for in feedback

1. **Confusion moments** — "I tapped X expecting Y, got Z"
2. **Visual bugs** — wrong colors, overlapping text, things that look
   broken on different screen sizes
3. **Performance** — does the timer lag? Does the screen feel slow to
   respond when starting/stopping a contraction?
4. **The 5-1-1 alert timing** — when it fires, is the message clear?
   Is the timing right? (Real labor + this app: a tester should tap
   3+ contractions in 5 minutes apart and see the alert.)
5. **Backup and restore** — export a backup on one device, import it on
   another, and confirm everything carries over.
6. **Edge cases** — what if you go back to the app 4 hours after
   starting a contraction? What if your phone dies mid-contraction?
   What if you uninstall and reinstall?

## What NOT to ask about

- Marketing copy / app icon design (those are aesthetic, not functional)
- Specific feature requests (this is v1.0.0, save it for v1.1)
- Release pricing: free (the v1.0.1 build has no IAP)

## Bug report template

If a tester reports a bug, ask for:

```
Device: [iPhone 13, Pixel 7, etc.]
OS: [iOS 17.4, Android 14, etc.]
App version: 1.0.0 (visible in Settings)
What were you doing: [starting a contraction, exporting a backup, etc.]
What you expected: [the timer to start]
What happened: [nothing happened, or screen froze, etc.]
Screenshot: [attached]
Time of bug: [4:32 PM PT]
```

## What to do with feedback

Within 1 hour of receiving feedback:
1. Triage: cosmetic (no fix needed for v1.0) / functional (fix in 1.0.1) / blocker (fix in 1.0.0-rc2)
2. For functional issues, add a Playwright test that reproduces the bug
3. For blockers, fix immediately and ship a 1.0.1 within 24 hours

## The 1-week testing plan

| Day | Test focus | Tester group |
|-----|-----------|--------------|
| Day 1-2 | Install + first-time UX | Family members (non-pregnant, fresh eyes) |
| Day 3-4 | Real contractions (timed, not real labor) | Bianca + 1 pregnant friend |
| Day 5-6 | Backup, restore, and care summary handoff | Tester + a second device |
| Day 7 | Edge cases / battery / multi-day | Long-term tester |

If a critical bug is found on Day 1-3, ship a hotfix before the 15th
(Apple review for an existing app is faster than for a new app).
