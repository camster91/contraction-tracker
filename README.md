# Luna — Contraction Timer

A mobile-first contraction timer built as a Telegram Mini App. Tap when a contraction starts, tap when it ends, and Luna tracks duration, interval, and the 5-1-1 pattern automatically. Your partner's device stays in sync in real time.

**Live:** [contractions.ashbi.ca](https://contractions.ashbi.ca)  
**Backend relay:** [relay.ashbi.ca](https://relay.ashbi.ca)  
**Price:** $1.99 USD (one-time purchase, no subscription)

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
- Uses SSE (Server-Sent Events) for instant push updates across devices

### Voice Control
- Start and stop timers by speaking — hands-free when you can't reach your phone
- Audio processed on-device; no voice data leaves your device

### State Auto-Progress
- Automatically tracks which labor stage you're in based on contraction patterns
- Clear visual indicators of where you are in the labor timeline

### Designed for the Moment
- Large, high-contrast timer visible across the room
- Works fully offline once the session is active
- No account required — open and start

---

## Privacy

- **No ads, no analytics, no third-party SDKs.**
- Session data stays on your devices. The relay server (relay.ashbi.ca) receives only encrypted sync tokens — no health data, no contraction timestamps, no names.
- Voice control runs entirely on-device; no voice recordings are transmitted.
- Full privacy policy hosted at the app's support page.

---

## Tech Stack

| Layer | Technology |
|---|---|
| App | Telegram Mini App (JavaScript) |
| Backend | luna-relay (Node.js, relay.ashbi.ca) |
| Sync | Server-Sent Events (SSE) |
| Bundle | luna-v56 |
| Version | v2.0.4 |
| Live URL | contractions.ashbi.ca |

---

## Repository

| Repo | URL |
|---|---|
| App / Frontend | github.com/camster91/contraction-tracker |
| Backend / Relay | github.com/camster91/luna-relay |

---

## Getting Started

### Run locally (development)

```bash
# Frontend
git clone https://github.com/camster91/contraction-tracker.git
cd contraction-tracker
# open in browser — Telegram Mini Apps run in Telegram client or @BotFather preview

# Backend relay
git clone https://github.com/camster91/luna-relay.git
cd luna-relay
npm install
npm start
# runs on relay.ashbi.ca (or localhost for dev)
```

### Deploy

The frontend is a Telegram Mini App — deploy by configuring the BotFather webhook to point to your hosted build. The relay backend should be deployed separately (e.g., on a VPS or cloud provider) and its URL configured in the frontend environment.

---

## Version History

| Version | Notes |
|---|---|
| 2.0.4 | SSE live sync, voice control, multi-device share, state auto-progress |
| 2.0.0 | Initial relaunch with shared sessions |

---

*Built by camster91 — available at contractions.ashbi.ca*