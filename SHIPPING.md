# Olive v1.0.1 — Release Readiness

Last updated: 2026-08-07. Status: **WEB RELEASED; STORE SUBMISSION BLOCKED.**

Verified on 2026-08-07: strict lint/typecheck/build passed; the combined local
Chromium release suite completed with 110 passed, 7 environment/optional skips,
and 0 failures against the new relay contract. Focused app/relay integration
passed 11/11, and the relay security/retention suite passed 15/15. Release
coverage includes host and PIN capabilities, identity proof, malformed payload
rejection, offline reload, modal keyboard behavior, zoom, session isolation,
SSE, privacy, and 12-character links. Store submission remains blocked only by
iOS validation on macOS/Xcode and manual store-console access.

The `olive-release-candidate:1.0.1` Docker image also builds successfully with
the production relay origin, and the focused WebKit compatibility run passed
4/4 tests.

## PWA (Live at https://contractions.ashbi.ca)

All features verified by 76+ gauntlet tests (3.5 min CI). Zero TODOs, zero FIXMEs in source.

### Performance
- Self-hosted fonts (Fraunces + Inter, Latin subset) — zero external font deps
- SW cache v21 with cache-first navigation — the installed PWA reloads offline
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
- Mobile zoom is enabled
- Bottom sheets expose dialog semantics, enter/trap/restore focus, and close with Escape
- Timer supports Enter and Space; onboarding step targets are at least 24x24 CSS pixels

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
- Relay: host and PIN access use hashed capabilities; activity identities use separate hashed client proof
- Production source maps are disabled; browser security headers are emitted by the static server
- Expiry cleanup and sensitive-data purge on revocation are covered by automated tests

## Android

- Release AAB compiles successfully after Capacitor sync and is signed with the dedicated Olive upload key
- Signed AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- SHA-256: `CEFD68BA6D5D50AFF2F1654D90D9B66D254B05C4B66DF5534C8B53EBB810BD72`
- `jarsigner -verify` and the release signing task both passed
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
- Price: free (no v1.0.1 IAP)
- Privacy URL: https://contractions.ashbi.ca/privacy
- Support URL: https://contractions.ashbi.ca
- Screenshots: 20 images at 4 device sizes (6.7", 6.1", 5.5", 12.9")
- App icon: 22 sizes (12 iOS + 6 Android + 4 PWA)
- Description + Keywords + Promotional Text: ready (see store-listing.md)

## Remaining store-release work

1. Archive and validate iOS on macOS/Xcode with the Apple Developer team; Xcode is not available on this machine.
2. Review current App Store Connect and Google Play data declarations before manual submission.
3. Upload the signed Android AAB and complete the two store-console review flows manually. GitHub Actions are intentionally skipped for this release; production uses the verified manual deployment path.
