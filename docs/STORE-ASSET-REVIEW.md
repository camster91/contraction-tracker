# Olive v1.3.0 prepared asset inventory

Updated 2026-10-05. Local preparation, not signed-device capture, clinical approval, store upload or acceptance.

## Assets

- iOS icon: opaque 1024x1024 PNG, byte-identical to the frozen native marketing icon.
- Play icon: opaque 512x512 PNG; current matching artwork.
- Play feature graphic: opaque 1024x500 PNG with crisp Olive wordmark and existing brand colors.
- 35 raw UI screenshot candidates: five states in seven size groups.
- Captions/alt text, canonical listing JSON, clean Apple/Play copy sheets, English release notes and TestFlight fields.
- Prepared static privacy/support pages and current device/user/professional review protocols.

| Folder | Pixels | Intended slot |
|---|---|---|
| `6.7_iphone` | 1290x2796 | Apple large Dynamic Island iPhone |
| `6.1_iphone` | 1179x2556 | Apple smaller Dynamic Island iPhone |
| `5.5_iphone` | 1242x2208 | Apple legacy Home-button iPhone |
| `12.9_ipad` | 2048x2732 | Apple 13-inch or compatible 12.9-inch iPad slot |
| `play_phone` | 1080x1920 | Play phone |
| `play_tablet_7` | 1440x2560 | Play 7-inch tablet candidate |
| `play_tablet_10` | 1800x3200 | Play 10-inch tablet candidate |

Order: idle timer, active contraction, history, add-missed form, saved care-plan reminder. Examples use fabricated records and an example care team. No screenshot of removed partner links or memory-book PDF is included. Stale `-v2` artwork is excluded from the upload package; original repository files remain preserved.

## Provenance and validation

Runtime candidate: `23487cf7f7effd041c43ec728648332c0e950a1b`. Tablet candidates were rendered from that frozen production build with the current screenshot script at its actual responsive widths. Existing phone/iPad candidates were prepared against the same runtime in this session. These are Chromium renders with browser feature availability; the floating-timer control/native chrome may differ on a physical native build. Reconcile every selected image with the signed build before upload.

`node scripts/check-store-assets.mjs` checks expected PNG dimensions, opacity, five-state captions and iOS icon identity. `node scripts/check-store-metadata.mjs` checks source/listing consistency. The package manifest adds per-file SHA-256 and render/scope labels. Generated example reminder values are not a universal clinical threshold. Reminders require opt-in in the app.

Current format references:

- https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- https://support.google.com/googleplay/android-developer/answer/9866151
- https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-test-information/

## Final gates

Match images to the processed signed build and actual console slots; review copy with the requested independent reviewers. Verify public privacy/support pages, actual declarations and owner contact details. Optional preview videos are not required for this package; do not synthesize footage of unverified native behavior. No Wear OS, watchOS, TV, automotive, French or public web app listing is prepared for this release.
