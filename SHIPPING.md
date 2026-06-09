# Olive v1.0.0 — Ship-Ready Status

Last updated: 2026-06-09. Status: **READY TO SUBMIT.**

## PWA (Live at https://contractions.ashbi.ca)

All features verified by 76+ gauntlet tests (3.5 min CI). Zero TODOs, zero FIXMEs in source.

### Performance
- Self-hosted fonts (Fraunces + Inter, Latin subset) — zero external font deps
- SW cache v2 with bundle pre-caching — second visit loads instantly
- Dark preloader during React mount (~15s cold start)
- CSP simplified: no googleapis.com, no gstatic.com
- Dist: 1.7MB (16 font files, Latin subset only)

### UX Polish
- Warmer onboarding text (no numbered steps, reassuring tone)
- "Not now" instead of "Skip"
- First contraction guidance text
- Backup card → info sheet with Export/Import buttons
- Backup banner only shows after ≥1 finished contraction
- Memory book discovery card on main screen
- State transitions have 5-second undo toast
- Share creation has guidance text
- Create Share above Send Update (primary action first)
- Checklist empty state: "No items yet"
- All sheets have empty states

### Audio
- 5-1-1 alert: three soft 440Hz pulses + speech synthesis
- Speech: "This looks like the 5 1 1 pattern. Consider calling your provider."
- Force=true bypasses quiet hours for medical signals
- Start/Stop chimes (rising C5→E5, falling E5→C5)
- Mute toggle + quiet hours support
- iOS audio unlock via user gesture

### Accessibility
- WCAG AA contrast on all text (ink-500 bumped to #a47a6e)
- Header buttons have aria-labels
- Feature cards have visible text (accessible name via text content)
- 16 icon-only button labels documented as follow-up

### Sharing
- Simplified: 2 modes (Partner full access / Friends view only)
- PIN removed
- navigator.share fixed for iOS Safari (URL in text field)
- Relay CORS: wildcard (*) for Capacitor WebView compatibility

### Privacy
- Zero analytics, zero tracking, zero third-party SDKs
- Privacy policy at /privacy (self-hosted, no external deps)
- CSP: script-src 'self' only
- Relay: stateless, encrypted session IDs only

## Android

- Signed AAB: 4.1MB, v2+v3 schemes
- Keystore: 25-year RSA 2048, CN=Cameron Ashley/O=Ashbi Design/C=CA
- Universal APK for testers: 4.4MB
- Sideload guide: docs/SIDELOAD-APK.md
- Upload script: scripts/upload-play-store.py

## iOS

- Project structure: 10/10 verify-ios.sh passes
- arm64 (was armv7 — fixed)
- MARKETING_VERSION synced (1.0.0)
- OliveLiveActivity removed for v1.0.0
- PrivacyInfo.xcprivacy written (needs Xcode project addition)
- Build script: scripts/build-ios.sh
- Upload script: scripts/upload-app-store.sh

### BLOCKER: Xcode license not accepted (needs `sudo xcodebuild -license`)

## Store Metadata

- App name: Olive — Contraction Timer
- Bundle ID: com.ashbi.olive
- Version: 1.0.0
- Category: Health & Fitness (primary), Medical (secondary)
- Price: $1.99 USD (one-time)
- Privacy URL: https://contractions.ashbi.ca/privacy
- Support URL: https://contractions.ashbi.ca
- Screenshots: 20 images at 4 device sizes (6.7", 6.1", 5.5", 12.9")
- App icon: 22 sizes (12 iOS + 6 Android + 4 PWA)
- Description + Keywords + Promotional Text: ready (see store-listing.md)

## Remaining Human Work (~30 min)

1. Accept Xcode license: `sudo xcodebuild -license` (5 min)
2. Add PrivacyInfo.xcprivacy to Xcode project (2 min)
3. Build iOS: `./scripts/build-ios.sh` (5 min)
4. Upload iOS: `./scripts/upload-app-store.sh` (10 min)
5. Upload Android: `./scripts/upload-play-store.py` (10 min)
