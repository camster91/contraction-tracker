# Olive: Birth Journey Companion

A calm, private contraction timer and birth companion for iOS and Android. Offline-first, no account, no tracking.

![Olive](store-assets/play-feature-graphic-1024x500-v2.png)

## What it does

Olive supports the final weeks of pregnancy, the day of birth, and the first 12 postpartum weeks. Its core is a one-tap contraction timer built to be usable at 3 a.m. with one hand: a large, high-contrast display, optional voice control, and a care plan that uses the timing instructions from the user's own care team. Around the timer sits a local birth journey: care card, questions for the provider, a hospital bag checklist and a postpartum timeline.

Olive does not attempt diagnosis or replace professional care. Timing patterns never automatically "diagnose" labor; the app only surfaces the instructions the user saved. Everything is stored on the device, and the app makes no network requests of its own.

## Features

**Contraction tracking**
- One-tap start and stop, with duration and interval for every contraction
- Full history with timestamps, sessions, tags and a frequency chart
- Undo for accidental taps
- Screen wake lock so the timer stays visible, plus haptic feedback on native builds

**Care plan**
- Save the interval, duration and sustained-window instructions from your care team
- Store a care-team name and phone number for a direct call action when the saved pattern appears
- One-tap objective care summary to share by call, message or email

**Birth journey**
- Care card, provider questions and practical responsibilities
- Hospital bag checklist with pre-loaded items
- Postpartum first-12-weeks timeline

**Voice control**
- Start and stop the timer by speaking, using the on-device Web Speech API

**Privacy**
- No ads, no analytics, no third-party SDKs, no account
- Data stays on the device (localStorage, mirrored to IndexedDB so a storage wipe does not lose history)
- Backups and summaries leave the device only through the system share sheet, when the user chooses

## Tech stack

| Layer | Technology |
|---|---|
| App | React 19, TypeScript, Vite 8 |
| Styling | Tailwind CSS 4, Fraunces and Inter (self-hosted via Fontsource), lucide-react icons |
| Native | Capacitor 8 (iOS + Android): app, haptics, splash screen, status bar |
| Storage | localStorage mirrored to IndexedDB, BroadcastChannel cross-tab sync |
| Testing | Playwright end-to-end suite, Node unit tests |
| Quality | ESLint, TypeScript build check |

## Getting started

Requires Node 22 or newer.

```bash
git clone https://github.com/camster91/contraction-tracker.git
cd contraction-tracker
npm install
npm run dev          # http://localhost:5173, runs in any modern browser
```

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check and build to `dist/` (the bundle the native apps ship) |
| `npm run typecheck` | TypeScript build check |
| `npm run lint` | ESLint |
| `npm run verify` | Lint and build |
| `npm run preview` | Preview the production build |

### Native iOS

```bash
npm run build
npx cap sync ios
open ios/App/App.xcworkspace
```

### Native Android

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleRelease   # APK
./gradlew bundleRelease     # AAB
```

## Testing

```bash
npm run test:e2e     # build, then run the Playwright suite on an iPhone 14 profile
```

The Playwright suite covers timer logic and edge cases, overnight "3 a.m." scenarios, voice keywords, wake lock, backup and restore, the privacy page, accessibility, and the birth journey screens.

## Project structure

```
src/
├── App.tsx          # Main timer screen and app shell
├── components/      # Sheets and panels: history, sessions, settings, journey, care card, checklist
├── lib/             # Contractions, sessions, storage (IndexedDB), backup, voice, wake lock, audio, sync
├── hooks/           # Modal dialog handling
└── messages/        # UI copy
tests/
├── e2e/             # Playwright specs
└── unit/            # Journey and backup unit tests
android/  ios/       # Capacitor native projects
```

## Documentation

- [Product vision](docs/PRODUCT-VISION.md)
- [Privacy policy](docs/privacy-policy.md)
- [Changelog](CHANGELOG.md)

Olive is distributed as native iOS and Android apps; there is no public web deployment.
