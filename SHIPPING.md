# Olive v1.0.1 — Release Readiness

Last updated: 2026-08-07. Status: **WEB RELEASED; STORE SUBMISSION BLOCKED.**

Verified on 2026-08-07: strict lint/typecheck/build passed; the local browser
suite completed with 93 passed, 20 environment-gated skips, and 0 failures;
14 additional app/relay integration tests passed against a local relay; and
the relay's six security/retention regression tests passed. The coordinated app
and relay releases are live behind publicly trusted Let's Encrypt certificates.
The post-deploy production suite passed 11/11 tests, including share creation,
PIN validation, SSE, cross-session isolation, privacy, and 12-character links.
Store submission remains blocked by signing, iOS validation on macOS/Xcode, and
a pricing decision.

The `olive-release-candidate:1.0.1` Docker image also builds successfully with
the production relay origin, and the focused WebKit compatibility run passed
4/4 tests.

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

### Sharing (revised 2026-06-09)
- **One share per session** — creating again returns the same code
- **7-day default TTL** (168 hours), not 30 days
- Partner / Friends modes (PIN removed in earlier pass)
- navigator.share fixed for iOS Safari (URL in text field)
- Time-remaining countdown shown to both host ("X days left") and
  partner ("This link works for X more days")
- Old expired shares auto-filtered from getShares()
- Relay CORS: explicit production and Capacitor origins; untrusted web origins are rejected

### Privacy
- Zero analytics, zero tracking, zero third-party SDKs
- Privacy policy at /privacy (self-hosted, no external deps)
- CSP: script-src 'self' only
- Relay: stores optional shared-session data; expiry cleanup and sensitive-data purge on revocation are covered by automated tests

## Android

- Release AAB compiles successfully after Capacitor sync
- The current local AAB uses the debug key because `android/app/keystore.properties` is absent; Google Play will reject it
- A production keystore and signed-bundle verification are required
- Sideload guide: docs/SIDELOAD-APK.md
- Upload script: scripts/upload-play-store.py

## iOS

- Project structure: 10/10 verify-ios.sh passes
- arm64 (was armv7 — fixed)
- MARKETING_VERSION synced (1.0.1; build 2)
- OliveLiveActivity removed for v1.0.0
- PrivacyInfo.xcprivacy is wired into the App target and declares optional shared-session data
- Build script: scripts/build-ios.sh
- Upload script: scripts/upload-app-store.sh

### BLOCKER: iOS archive/signing must be run and verified on macOS with Xcode and the Apple Developer team

## Store Metadata

- App name: Olive — Contraction Timer
- Bundle ID: com.ashbi.olive
- Version: 1.0.1
- Category: Health & Fitness (primary), Medical (secondary)
- Price: decision required before listing creation (free or upfront paid; no v1.0.1 IAP)
- Privacy URL: https://contractions.ashbi.ca/privacy
- Support URL: https://contractions.ashbi.ca
- Screenshots: 20 images at 4 device sizes (6.7", 6.1", 5.5", 12.9")
- App icon: 22 sizes (12 iOS + 6 Android + 4 PWA)
- Description + Keywords + Promotional Text: ready (see store-listing.md)

## Remaining store-release work

1. Choose free or upfront-paid pricing. v1.0.1 has no in-app purchase implementation.
2. Provide/configure the Olive Android release keystore and build a production-signed AAB. No Olive keystore was found on this Windows machine.
3. Archive and validate iOS on macOS/Xcode with the Apple Developer team; Xcode is not available on this machine.
4. Review current App Store Connect and Google Play data declarations before manual submission.
5. Resolve the GitHub account billing/spending-limit error so hosted Actions can start again. Production was deployed manually from verified Git archives because GitHub rejected all runner jobs before their first step.
