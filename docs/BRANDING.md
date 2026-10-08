# Olive botanical brand, build 7

The approved leaf O is the first letter of the wordmark. Never place a separate
O beside the full wordmark. The single O is reserved for the app icon. Masters
are in `resources/branding`; runtime exports are in `public/branding`.

Night uses olive `#26382C`, ivory `#F5F1E7`, sage `#B8C5A2`, apricot `#E8AD8B`
and stone `#C9C7BB`. Daylight reverses the canvas and ink, with darker semantic
colors for contrast. Existing `calm` and `cool` saved preferences map to Night
and Daylight respectively. Appearance never changes automatically during timing.
Legacy CSS token names remain stable across care/history components.

Fraunces headings and Inter body fonts remain bundled offline. The approved
raster wordmark is rendered as a CSS alpha mask so both appearances use exactly
the same silhouette. These are original generated raster masters, not editable
vector logos. No exact image model version is claimed.

Illustrations are decorative with empty alternatives; text carries the meaning.
Use timing/support for onboarding, care for preparation and records for sessions.
Keep patterns and illustrations out of the running timer. Start and Stop share
the same large tap area. Screen readers have a separately named elapsed timer;
per-second ticks do not interrupt announcements.

`python3 scripts/export-brand-assets.py` requires Pillow and makes mechanical
web/iOS exports from the masters. `node scripts/generate-store-assets.mjs`
generates listing icons and the feature graphic. Use
`scripts/shoot-store-screenshots.mjs` for real rendered application states with
fabricated records. Browser screenshots are not physical-device evidence.

Do not add diagnosis, predictions or default clinical thresholds. Follow the
care team's plan. No account, telemetry or network-dependent timing is introduced.
