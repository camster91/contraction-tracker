# Olive — Changelog

## v1.2.0 (August 2026) — Birth journey release

- Expanded Olive into a local-first companion spanning preparation, labor, and the first 12 weeks postpartum.
- Added a unified care card, private provider-question list, practical partner responsibilities, and a factual postpartum timeline.
- Added explicit phase controls; Olive never infers or diagnoses a journey phase.
- Added versioned journey recovery, IndexedDB mirroring, and backup v2 while retaining valid v1.1 imports.
- Added reviewed responsibility sharing. Private responsibilities, care details, provider questions, and notes remain excluded unless the owner explicitly changes their local privacy choice.
- Added category-scoped relay permissions and identity-proven, idempotent partner completion.
- Preserved the labor timer as the dominant action, offline reload, mobile accessibility, and 320px layouts.
- Advanced the offline app cache to `olive-v23` and native builds to version 1.2.0 (build 4).

## v1.1.0 (August 2026) — Care-team handoff release

- Added a provider-configurable timing reminder: interval, duration, sustained window, care-team name, and phone number.
- Reworked timing notices to report observations without diagnosing a stage of labor.
- Removed automatic labor/postpartum state changes; shared status remains under the user's control.
- Added a concise, objective care summary through the native share sheet or clipboard fallback.
- Kept partner sharing primary while moving preparation and record-keeping tools behind “More tools.”
- Tightened sustained-pattern detection so a short contraction cluster cannot trigger a long-window reminder.
- Advanced the offline app cache to `olive-v22` and native builds to version 1.1.0 (build 3).

## v1.0.0 (June 2026) — First public release

Olive is a contraction timer for expecting couples. It tracks labor
contractions in real time and shares them with your partner. Built
during my wife's pregnancy with our daughter Olive.

### What's new

**Contraction timer**
- One-tap Start/Stop — designed for one-handed use at 3am
- Automatic pattern detection — the app knows when you're in active
  labor and tells you when to call your provider
- Per-contraction notes, intensity, tags, and pain locations
- History view with frequency chart

**Partner sharing**
- Generate a 6-character share code your partner enters on their phone
- Real-time sync via our relay (your data, in encrypted form, briefly
  routed through our server during the active session)
- No app install required for your partner — they view the share in
  the browser

**Hospital bag checklist**
- Pre-loaded list of what to pack
- Check items off as you go
- Persists between sessions

**Privacy**
- Your contraction data lives on your device, period
- Zero analytics, zero tracking, zero third-party SDKs
- The relay only sees an encrypted session ID — not your contractions
- Voice control audio is processed on-device, never leaves your phone
- Read the full policy: https://contractions.ashbi.ca/privacy

**On-device features**
- Wake lock prevents the screen from sleeping while timing
- Voice control — say "start" or "stop" hands-free
- Works offline — the timer doesn't need a network connection
- Live Activity on iOS — see the timer on your lock screen

### For partners

When you receive a 6-character code from the person giving birth,
go to https://contractions.ashbi.ca and enter it. You'll see their
contraction history and real-time updates. You don't need to install
anything.

### For App Store reviewers

- **Bundle ID:** com.ashbi.olive
- **Primary Category:** Health & Fitness
- **Secondary Category:** Medical
- **Privacy Policy:** https://contractions.ashbi.ca/privacy
- **Support URL:** https://contractions.ashbi.ca
- **Content Rights:** All content is original to the developer

### Coming in v1.1

- Multi-language support (currently English-only)
- Apple Watch complication
- Hospital "we're on the way" pre-arrival notification
- Contraction intensity history graph
