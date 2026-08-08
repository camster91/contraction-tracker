# Olive — Contraction Timer

A mobile-first contraction timer built as a PWA + Capacitor iOS/Android app. Tap when a contraction starts, tap when it ends, and Olive tracks duration, interval, and the 5-1-1 pattern automatically. Your partner's device stays in sync in real time.

**Live:** [contractions.ashbi.ca](https://contractions.ashbi.ca) (PWA) · [relay.ashbi.ca](https://relay.ashbi.ca) (backend) · **Release pricing:** decision required (free or upfront paid).

---

## Features

### Core Tracking
- One-tap start/stop for each contraction
- Duration and interval tracking per contraction
- Automatic 5-1-1 pattern detection — the signal to head to the hospital
- Full contraction history with timestamps

### Real-Time Multi-Device Sync (SSE)
- Both partners see the same live session — no refreshing, no lag
- Shared via a single link; partner joins instantly without an account
- Uses Server-Sent Events for instant push updates across devices

### Voice Control
- Start and stop timers by speaking — hands-free when you can't reach your phone
- Audio processed on-device via Web Speech API; no voice data leaves your device

### State Auto-Progress
- Automatically tracks which labor stage you're in based on contraction patterns
- Clear visual indicators of where you are in the labor timeline

### Designed for the Moment
- Large, high-contrast timer visible across the room
- Works fully offline once the session is active
- No account required — open and start

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
| Live Activity | iOS Widget Extension (iOS 16.1+) |
| Bundle | olive-v1 (PWA cache version) |
| Version | 1.0.0 |

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

CI/CD: GitHub Actions auto-deploys to Coolify on push to `main`. The deploy workflow uses SSH directly (not the Coolify API) because this is a standalone docker-compose deploy, not a Coolify-tracked application.

---

## Version History

| Version | Notes |
|---|---|
| 1.0.0 | Rebrand from "Olive" to "Olive." SSE live sync, voice control, multi-device share, state auto-progress, memory book PDF |
| 2.0.4 | Last version under the old name — SSE reconnect backoff, voice de-dup, state auto-progress |
| 2.0.0 | Initial Capacitor iOS + Android native app setup |

---

## License

Proprietary. Not open source. All rights reserved.

---

*Built by [camster91](https://github.com/camster91) — for Bianca, who is having Olive right now.*
