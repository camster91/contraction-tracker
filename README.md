# Olive — Birth Journey Companion

A calm, private companion for the final weeks of pregnancy, birth day, and the first 12 postpartum weeks. Olive's shipped core is an offline-first contraction timer with a local birth journey, distributed as native iOS/Android apps built with Capacitor. No account is required.

**Privacy policy:** [olive.ashbi.ca/privacy](https://olive.ashbi.ca/privacy) · **Release pricing:** free.

**Product direction:** Olive helps the expecting parent and care team stay prepared without attempting diagnosis or replacing professional care. See [`docs/PRODUCT-VISION.md`](docs/PRODUCT-VISION.md).

---

## Features

### Core Tracking
- One-tap start/stop for each contraction
- Duration and interval tracking per contraction
- Provider-configurable timing reminders, with non-diagnostic language
- Full contraction history with timestamps
- One-tap objective care summary for calls, messages, or email

### Birth Journey
- Care card, provider questions, and practical responsibilities, all on-device
- Postpartum first-12-weeks timeline
- Hospital bag checklist with pre-loaded items

### Voice Control
- Start and stop timers by speaking — hands-free when you can't reach your phone
- Audio processed on-device via Web Speech API; no voice data leaves your device

### User-Controlled Care Plan
- Save the interval, duration, and sustained-window instructions from your care team
- Store a care-team name and phone number for a direct call action when the saved pattern appears
- Timing patterns never automatically diagnose labor

### Designed for the Moment
- Large, high-contrast timer visible across the room
- Core timer and history work entirely offline
- No account required — open and start
- Preparation and record-keeping tools stay behind a single disclosure during labor

---

## Privacy

- **No ads, no analytics, no third-party SDKs.**
- Everything you record stays on your device. Olive makes no network requests and sends nothing to any server.
- Backups and care summaries leave the device only through your own system share sheet, when you choose.
- Voice control runs entirely on-device; no voice recordings are transmitted.
- Full privacy policy at [olive.ashbi.ca/privacy](https://olive.ashbi.ca/privacy).

---

## Tech Stack

| Layer | Technology |
|---|---|
| App | React 19 + TypeScript + Vite + Tailwind CSS |
| Native | Capacitor 8 (iOS + Android) |
| Version | 1.3.0 |

---

## Repository

| Repo | URL |
|---|---|
| App | github.com/camster91/contraction-tracker |

---

## Getting Started

### Run locally (development)

```bash
git clone https://github.com/camster91/contraction-tracker.git
cd contraction-tracker
npm install
npm run dev
# Open http://localhost:5173 — the app runs in any modern browser
```

### Build for production

```bash
npm run build
# Outputs to dist/ — the web bundle the native apps ship
```

### Native iOS

```bash
npm run build
npx cap sync ios
cd ios/App
open App.xcworkspace
# Then build & run in Xcode as usual
```

### Native Android

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleRelease   # APK at app/build/outputs/apk/release/
./gradlew bundleRelease      # AAB at app/build/outputs/bundle/release/
```

---

## Deploy

Olive is distributed through the App Store and Google Play only; there is no public web deployment. The `dist/` web build exists because the Capacitor apps bundle it locally.

The GitHub-hosted workflow runners are currently unavailable, so hosted Actions are not used as the release gate — verify locally with `npm run verify` and the Playwright suite.

---

## Version History

| Version | Notes |
|---|---|
| 1.3.0 | Private-by-default, native-only release: partner sharing, relay, memory book, and the public web app removed |
| 1.1.0 | Provider-specific care-plan reminders, objective care summary, non-diagnostic pattern language, user-controlled status, and focused labor-mode hierarchy |
| 1.2.1 | Live reviewed-responsibility reconciliation for hosts, including the active app session |
| 1.2.0 | Local-first birth journey, care card, provider questions, partner responsibilities, postpartum timeline, backup migration, and reviewed category-scoped sharing |
| 1.0.1 | Secure capability-based sharing, offline reload recovery, accessibility release fixes, and production security headers |
| 1.0.0 | First Olive release with SSE live sync, voice control, multi-device sharing, and memory book PDF |
| 2.0.4 | Last version under the old name — SSE reconnect backoff, voice de-dup, state auto-progress |
| 2.0.0 | Initial Capacitor iOS + Android native app setup |

---

## License

Proprietary. Not open source. All rights reserved.

---

*Built by [camster91](https://github.com/camster91) — for Bianca, who is having Olive right now.*
