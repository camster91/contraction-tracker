# Olive — Birth Journey Companion

A calm, private coordination companion for the final weeks of pregnancy, birth day, and the first 12 postpartum weeks. Olive's shipped core is an offline-first contraction timer with secure partner sharing, built as a PWA + Capacitor iOS/Android app. No account is required.

**Live:** [contractions.ashbi.ca](https://contractions.ashbi.ca) (PWA) · [relay.ashbi.ca](https://relay.ashbi.ca) (backend) · **Release pricing:** free.

**Product direction:** Olive helps the expecting parent, partner, and care team stay aligned without attempting diagnosis or replacing professional care. The expanded Birth Journey experience is specified for v1.2 and is not yet represented as shipped functionality. See [`docs/PRODUCT-VISION.md`](docs/PRODUCT-VISION.md) and [`docs/V1.2-BIRTH-JOURNEY-SPEC.md`](docs/V1.2-BIRTH-JOURNEY-SPEC.md).

---

## Features

### Core Tracking
- One-tap start/stop for each contraction
- Duration and interval tracking per contraction
- Provider-configurable timing reminders, with non-diagnostic language
- Full contraction history with timestamps
- One-tap objective care summary for calls, messages, or email

### Real-Time Multi-Device Sync (SSE)
- Both partners see the same live session — no refreshing, no lag
- Shared via a single link; partner joins instantly without an account
- Uses Server-Sent Events for instant push updates across devices

### Voice Control
- Start and stop timers by speaking — hands-free when you can't reach your phone
- Audio processed on-device via Web Speech API; no voice data leaves your device

### User-Controlled Care Plan
- Save the interval, duration, and sustained-window instructions from your care team
- Store a care-team name and phone number for a direct call action when the saved pattern appears
- Timing patterns never automatically diagnose labor or change the shared session's status

### Designed for the Moment
- Large, high-contrast timer visible across the room
- Core timer and history work offline, including reopening the installed PWA
- No account required — open and start
- Preparation and record-keeping tools stay behind a single disclosure during labor

### Memory Book PDF
- When labor is over, export a beautiful PDF of your contraction timeline
- A keepsake of the work, the timing, and the team

---

## Privacy

- **No ads, no analytics, no third-party SDKs.**
- Session data stays on your device unless you create a share link. Shared contraction data and optional activity-feed content are sent over HTTPS to the Olive relay, expire automatically, and can be revoked by the host.
- Voice control runs entirely on-device; no voice recordings are transmitted.
- Full privacy policy hosted at the app's support page.

---

## Tech Stack

| Layer | Technology |
|---|---|
| App | React 19 + TypeScript + Vite + Tailwind CSS |
| Native | Capacitor 8 (iOS + Android wrappers around the PWA) |
| Backend | olive-relay (Node.js + Express + sql.js WASM, deployed at relay.ashbi.ca) |
| Sync | Server-Sent Events (SSE) |
| PWA | Versioned offline app shell (`olive-v22`) |
| Version | 1.1.0 |

---

## Repository

| Repo | URL |
|---|---|
| App / Frontend | github.com/camster91/contraction-tracker |
| Backend / Relay | github.com/camster91/luna-relay (the backend is still branded "luna-relay" — rename to olive-relay is a separate task) |

---

## Getting Started

### Run locally (development)

```bash
git clone https://github.com/camster91/contraction-tracker.git
cd contraction-tracker
npm install
npm run dev
# Open http://localhost:5173 — the PWA runs in any modern browser
```

### Build for production

```bash
npm run build
# Outputs to dist/ — the PWA bundle
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

### Backend (relay)

```bash
git clone https://github.com/camster91/luna-relay.git
cd olive-relay
npm install
npm start
# Runs on relay.ashbi.ca (or localhost for dev)
```

---

## Deploy

The frontend is a PWA + Capacitor app — deploy the `dist/` build to your CDN / static host (currently contractions.ashbi.ca, hosted on Coolify). The relay backend should be deployed separately (currently relay.ashbi.ca, also on Coolify) and its URL configured in the frontend.

The repository includes a GitHub Actions deployment workflow for normal releases. Olive v1.1.0 was intentionally pushed with `[skip ci]` and released through the verified manual SSH/docker-compose path.

---

## Version History

| Version | Notes |
|---|---|
| 1.1.0 | Provider-specific care-plan reminders, objective care summary, non-diagnostic pattern language, user-controlled status, and focused labor-mode hierarchy |
| 1.0.1 | Secure capability-based sharing, offline reload recovery, accessibility release fixes, and production security headers |
| 1.0.0 | First Olive release with SSE live sync, voice control, multi-device sharing, and memory book PDF |
| 2.0.4 | Last version under the old name — SSE reconnect backoff, voice de-dup, state auto-progress |
| 2.0.0 | Initial Capacitor iOS + Android native app setup |

---

## License

Proprietary. Not open source. All rights reserved.

---

*Built by [camster91](https://github.com/camster91) — for Bianca, who is having Olive right now.*
