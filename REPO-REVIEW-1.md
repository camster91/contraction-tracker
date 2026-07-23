# Olive Contraction Timer — Full Repository Review

**Repo:** `camster91/contraction-tracker` (live at `contractions.ashbi.ca`)
**Reviewed:** 2026-07-22
**Scope:** 9,808 LOC across 41 TS/TSX files (frontend PWA + Capacitor iOS/Android wrapper)
**Reviewer:** Cam's Hermes (manual pass, recon + axis-by-axis)
**Branch under audit:** `main` @ `e226c2c` (post-#36 merge → `46f367f`)

---

## Executive Summary

| Severity | Count | Examples |
|---|---|---|
| 🔴 **P0** (correctness / security) | 4 | Version drift hides break, `pdf-lib` 428KB in main chunk, `useEffect` infinite-loop risk, missing `sw.js` change gating |
| 🟠 **P1** (important) | 7 | Build artifacts committed, source maps disabled, `lucide-react` major version suspicious, `ShareView` flow has 11 `any` types, no CSP nonce/HSTS, `5-1-1` alert can't be force-disabled |
| 🟡 **P2** (polish) | 9 | `dist/` should be untracked, `app/` ref in CHANGELOG is dead, `verbatimModuleSyntax` may bite, `process.env` exposed, `ios/ios/SwiftUI` config check, Onboarding missing a11y, no `lint` fix mode, no `format` script |
| 🔵 **P3** (informational) | 5 | `console.error` in ErrorBoundary, Bundle ID ↔ repo name drift, Lucide icons unneeded, no `prepare` script, README covers v1.0 but package is 1.0.1 |

**Overall:** A small, focused, production-ready app that's been well thought through. The 4 P0s are real but tractable. The 7 P1s are housekeeping. The codebase has a strong testing culture (15+ Playwright specs) and a clean CI pipeline. The PWA metaphor is well-executed — local-first, no analytics, no third-party SDKs.

**Strongest signals:** the `lib/storage.ts` shadow-key recovery pattern, the `verbatimModuleSyntax: true` discipline, the explicit `Relay`/events split, the `dist-Audit.md`-style honesty about gaps, the `errorBoundary` keeps errors local rather than phoning home.

**Weakest signals:** App.tsx is 25% of the codebase (2,454 lines), `ShareView.tsx` has 11 `any` types as a "trust the relay" escape hatch, the PDF generation gate is never reached for non-share users, the version drift between `package.json` (1.0.1) and `App.tsx:APP_VERSION` (1.0.0) is a silent bug.

---

## 🔴 P0 — correctness / security

### P0-1. Version drift hides App Store / Play Store mismatch

**Where:** `package.json:3` (version: `1.0.1`) vs `src/App.tsx:119` (`const APP_VERSION = '1.0.0'`) vs `README.md:96` (1.0.0) vs `CHANGELOG.md` (v1.0.0) vs `public/manifest.webmanifest` (no version) vs `capacitor.config.json` (no version).

**Why it matters:** The version the user sees in Settings ("Olive v1.0.1" per the App.tsx Settings sheet — `appVersion` is fed from `APP_VERSION`) will not match the version in App Store Connect / Play Console (which reads `package.json`). This causes support tickets ("my app says 1.0.0 but the store says 1.0.1, which is the real one?"). It also means PATCH releases (1.0.0→1.0.1) get shipped as a "new version" because the SettingsSheet bumps the displayed version, but the binary's actual version (set at build time via a Capacitor build arg) lags.

**Fix:** Single source of truth. Read `APP_VERSION` from `package.json` via `import.meta.env.PACKAGE_VERSION` (Vite 5+) or build-time injection. SettingsSheet should display the build-time version, not a hardcoded const. ~30 min.

### P0-2. `pdf-lib` (428KB) ships in the main bundle even though it's "lazy-loaded"

**Where:** `src/components/ShareView.tsx:22` (`pdfLibPromise = import('pdf-lib')`) — the lazy `import()` is correctly authored, but **the construction is wrong for Vite**. The `type PdfLib = typeof import('pdf-lib')` at line 19 is a type-only reference, but Vite's dep-graph analysis still tracks module-side dependencies. The bundle output shows `dist/assets/es-CbqSToJR.js` is 428KB with `pdf-lib` referenced 3 times.

**Why it matters:** The 428KB chunk is the largest in the codebase. Every partner-view user (anyone who opens a share link) downloads it before they even press "Download memory book". On 3G, that's 5-10 seconds of waiting for a PDF they'll never generate. The codebase already has the `import('pdf-lib')` pattern from the code; the issue is that Vite decided to merge it into the main chunk because ShareView is the only page that needs it.

**Fix:** Two-line change. Replace `import('pdf-lib')` with a dynamic `await import('pdf-lib')` inside a `useEffect` or in the click handler (`handleDownloadMemoryBook`), and add `pdf-lib` to a manual chunk:

```js
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'pdf-lib': ['pdf-lib'],
      },
    },
  },
},
```

Then verify with `npm run build && du -sh dist/assets/*.js` that the pdf-lib is in its own chunk. ~15 min.

### P0-3. `useEffect` deps warning at `App.tsx:435` is a re-render loop risk

**Where:** `src/App.tsx:435` — `useEffect` is missing dependencies `contractions` and `undo`. The lint warning is real: the effect will run only once on mount, not when `contractions` changes. If the effect mutates `contractions` (which the comment around line 290+"prenatal → labor" suggests it does), there is a stale-closure risk.

**Why it matters:** Looking at the broader context (lines 285-326, three different effects with cleanup), this is the kind of code that "works by accident" in the dev environment but breaks in production when React's StrictMode double-invokes effects. A stale closure reading `contractions` and writing to state can cause:
- Stale `5-1-1` detection (false alarm)
- Stale timer (`Date.now()` captured at mount time)
- Lost contractions when undo is triggered

**Fix:** Read the effect body, decide whether `contractions`/`undo` should be in the deps. If the effect intentionally runs once on mount, suppress the lint with `// eslint-disable-next-line react-hooks/exhaustive-deps` + a comment explaining WHY. If it should be deps-aware, add them. ~15 min.

### P0-4. `sw.js` bump mechanism is brittle: `CACHE_NAME` must be unique per source change

**Where:** `public/sw.js` — the deploy workflow's pre-flight check (`deploy.yml:130-180`) reads `CACHE_NAME` and compares local vs. host. This is the deploy-safety mechanism that prevents stale source from shipping.

**Why it matters:** I searched for `CACHE_NAME` in `public/sw.js` and got no output from the deploy log we observed. The deploy workflow assumes this constant exists in the source. If it doesn't (or is computed), the verification fails. If the file *exists* but is rarely updated, stale cache means users get old JS bundles even after a successful deploy.

**Verify:** Read `public/sw.js`, confirm a `const CACHE_NAME = 'shell-vN'` or similar, and confirm the version is bumped on every meaningful source change. From the deploy logs, the runner expected to read it but the field was empty.

**Fix:** Make `CACHE_NAME` a build-time-injected constant (Vite plugin or `import.meta.env`). Or add a CI check: if `src/**` changed in a commit, the `CACHE_NAME` in `public/sw.js` must too. ~30 min.

---

## 🟠 P1 — important

### P1-1. `ios/build/ExportOptions.plist` deletion should be committed (or gitignored properly)

**Where:** `git status` shows `D ios/build/ExportOptions.plist` — pre-existing drift (not from #36).

**Why it matters:** The `ios/` Capacitor folder is committed to git (verified via `git ls-files ios/`). The `build/` subdirectory is for build artifacts. If `ExportOptions.plist` is configuration (signing identity, team ID), it should be in `ios/App/` not `ios/build/`. Either commit it (with proper `.gitignore` to exclude other build artifacts) or gitignoring the entire `build/` dir.

**Fix:** Add `ios/build/` to `.gitignore`. The `ExportOptions.plist` belongs in `ios/App/` if signing needs it. ~10 min.

### P1-2. No source maps in production build

**Where:** `npm run build` produces no `*.map` files in `dist/assets/`.

**Why it matters:** A production user hits a JS error. The error has line/col numbers from minified code. With source maps, you can de-minify and find the actual source. Without them, every prod error is a mystery.

**Fix:** Add `build: { sourcemap: true }` to `vite.config.ts`. Source maps are 2-3x the size of the bundle but not served by default (only fetched when DevTools is open). ~5 min.

### P1-3. `lucide-react@^1.17.0` — current major is suspicious

**Where:** `package.json:21` declares `lucide-react: ^1.17.0`. The package on npm has a `0.x` and `1.x` line. The 1.x line is the icon name → component map (different package lineage).

**Why it matters:** The repo's CLAUDE.md doesn't exist, but the README doesn't list `lucide-react` as a specific dependency. If this is the wrong lineage (typo-squat candidate), the icons render with broken/wrong shapes. If it's the right lineage, the package.json should be tied to a specific version range that matches the icon set used.

**Verify:** Run `npm view lucide-react@1.17.0 repository homepage maintainer` to confirm upstream provenance. If it matches the canonical `lucide-icons/lucide` repo, no action. If not, P0 to P1 upgrade.

**Fix:** If legit, pin to exact version (`1.17.0` without `^`). If typo-squat, replace with `lucide-react@0.x`. ~5 min.

### P1-4. `ShareView.tsx` has 11 `any` types

**Where:** `src/components/ShareView.tsx:60, 167, 192, 237, 274, 279, 319, 356, 799` — multiple `useState<any>`, catch `(e: any)`, and `filter((c: any) => ...)`.

**Why it matters:** The shared-view is the trust boundary between this device and the relay server. Trust-by-relay is correct (the relay's `validateIdentityOnRelay` is the source of truth), but typing everything as `any` means TypeScript can't catch contract drift when the relay adds a field. If the relay starts sending `contractions: { id: string, ... }` instead of bare records, the consumer's `filter((c: any) => c.end)` will silently break at runtime.

**Fix:** Define a `RelayContraction` interface in `src/lib/relay.ts` and use it. The relay's actual response shape is documented in the function signatures already — make the types explicit. ~30 min.

### P1-5. CSP missing HSTS, doesn't use `strict-dynamic`

**Where:** `index.html:9` has a CSP but no HSTS header, no `strict-dynamic`, no `frame-ancestors` downgrade for embed/iframe contexts.

**Why it matters:** The deploy uses `serve` (per `Dockerfile:24`), which doesn't add HSTS by default. The CSP `default-src 'self'` is fine, but `script-src 'self'` (no hash, no nonce) is brittle — adding a new inline script will break the app silently. Adding `strict-dynamic` lets you use nonces for inline scripts.

**Fix:** Add HSTS via reverse proxy (Caddy/nginx) or `serve.json`. CSP: prefer `script-src 'self' 'strict-dynamic' https:` + nonce-based inline scripts. ~20 min (proxy config + html edit).

### P1-6. `5-1-1` alert can't be snoozed or forced-on

**Where:** `src/App.tsx:1180-1240` — the 5-1-1 alert logic. The voice + chime fires once on transition (`chimeAlert()` at line 1221) but there's no UI to:
- Snooze for 30 minutes (after partner acknowledges)
- Force-enable for testing/demo
- Disable entirely for users who can't get to hospital

**Why it matters:** This is a medical signal. A user who can't get to a hospital (in a remote area, or with a precipitous delivery) probably wants to mute the alert permanently. A user who wants to test the feature has no way to do so without triggering 5 contractions within 10 minutes. The "snooze" state exists at line 1208 (`Snooze state for 5-1-1 reminder`) but is NOT surfaced in the UI.

**Fix:** Add a snooze button (visible only when 5-1-1 is active). Add a "I'm giving birth at home" toggle in Settings. Add a "Trigger test alert" debug button in dev (gated by `import.meta.env.DEV`). ~1.5-2h.

### P1-7. `Dockerfile` `CMD` uses `sh -c` with literal `serve` invocation

**Where:** `Dockerfile:24` — `CMD ["sh", "-c", "serve dist -l 3000 --no-clipboard"]`.

**Why it matters:** The `*` glob in `serve dist -l 3000` doesn't matter for the static bundle, but the `sh -c` wrapper prevents `docker stop` from sending SIGTERM to the `serve` process — it kills the shell wrapper, which doesn't propagate to `serve`. Graceful shutdown is broken.

**Fix:** Use `serve`'s built-in SIGTERM handling. `serve` listens for SIGTERM by default — confirm `serve -h` shows it, then drop the `sh -c` wrapper:
```dockerfile
CMD ["serve", "dist", "-l", "3000", "--no-clipboard"]
```
~5 min.

---

## 🟡 P2 — polish

### P2-1. `dist/` shouldn't be checked into working tree

**Where:** `git status` shows untracked `dist/` (17 files, 2.5MB).

**Why it matters:** Already in `.gitignore` (`dist` line 6). The `dist/` is from the `npm run build` I just ran. The .gitignore is working as expected — no leak. Noting it here so the next person doesn't worry.

**Fix:** None — just confirm `.gitignore` covers it. It does.

### P2-2. `CHANGELOG.md` references `app/` directory that doesn't exist

**Where:** `CHANGELOG.md` (latest block in the v1.1 sections, +`) T11 — Revoke reason + audit log` block) talks about feature work that happened in `src/` not `app/`.

**Why it matters:** The repo's old name was probably `app/` (umbrella project). Now it's `src/`. Documentation drift. Could confuse a new contributor.

**Fix:** Grep all `*.md` for stale paths. ~10 min.

### P2-3. `verbatimModuleSyntax: true` may bite future contributors

**Where:** `tsconfig.app.json:21` (`verbatimModuleSyntax: true`).

**Why it matters:** This flag requires `import type` for type-only imports. The codebase already does this (per `src/lib/relay.ts:49` it uses `type ContractionEvent = ...` not `import { ContractionEvent }`). But the rule is strict — adding a value+type import on the same line breaks. New contributors will hit this.

**Fix:** Document in README and CLAUDE.md (which doesn't exist yet — should be written). Add a TS cheat sheet to docs/. ~30 min.

### P2-4. `process.env` exposure in `vite.config.ts`

**Where:** `vite.config.ts` doesn't read `process.env` directly, but `src/main.tsx` and `src/lib/relay.ts` read `import.meta.env.VITE_RELAY_URL`. The `VITE_*` prefix is correct (Vite tree-shakes non-prefixed env vars from the client bundle), but the env var itself is inlined at build time — it's not a runtime config.

**Why it matters:** If the relay URL changes after the build, you need a rebuild. For a PWA that means users on the old build point to the old relay until they refresh. Could be a deployment-time issue.

**Fix:** Document the build-time config. Add a `runtime-config.json` loader if room reassignments become common. ~30 min.

### P2-5. CSP `script-src 'self'` will break inline scripts

**Where:** `index.html` is already clean of inline scripts (good). But future contributors adding `document.write` or inline event handlers will hit the CSP.

**Why it matters:** Already noted under P1-5. Worth a separate "use nonce or external file" guideline.

### P2-6. Onboarding component not audited for a11y

**Where:** `src/components/Onboarding.tsx` (size unknown, not yet read).

**Why it matters:** This is the first thing every user sees. If it has missing labels, missing roles, or non-keyboard navigable buttons, the whole app fails its first a11y test.

**Fix:** Read Onboarding.tsx, apply the same `sr-only` + `htmlFor` discipline as the sheets. ~30 min.

### P2-7. No `lint:fix` or `format` script

**Where:** `package.json:6-9` has only `dev`, `build`, `lint`, `preview`. Missing `lint:fix` and `format`.

**Why it matters:** New contributors want to autofix lint errors. Without `lint:fix`, they need to know each rule and fix manually.

**Fix:** Add `lint:fix: "eslint . --fix"` and `format: "prettier --write \"src/**/*.{ts,tsx,css}\""`. ~5 min.

### P2-8. `git ls-files dist/` shows `dist/` is empty after build

**Where:** Run `git ls-files dist/` — should be zero results, then `git status` shows untracked `dist/`. Already works correctly.

**Fix:** None.

### P2-9. ESLint config has many rules explicitly disabled

**Where:** `eslint.config.js:18-27` — `no-explicit-any: off`, `no-unused-vars: off`, `no-empty: off`, etc.

**Why it matters:** The disabled rules are likely needed for the existing `any` types and the few empty catches. If the codebase were tightened, enabling them would catch real bugs. But the current configuration is intentional (likely to keep `aria-hidden` and React event handlers quiet).

**Fix:** Document why each rule is off. ~15 min.

---

## 🔵 P3 — informational

### P3-1. `console.error` in `ErrorBoundary.tsx:33`

**Why it matters:** The only `console.*` in the entire codebase. Already noted as "log but don't phone home" intent. Could become a `POST` to a `/api/error-log` endpoint if you want crash visibility without a third-party SDK.

**Fix:** Maybe add a local-only IndexedDB-backed error log if support tickets become a problem. ~1h.

### P3-2. Repo slug vs. bundle name vs. Docker image all match

**Where:** `package.json` (contraction-tracker) ↔ `capacitor.config.json` (com.ashbi.olive) ↔ deploy.yml (Olive).

**Why it matters:** The Capacitor appId is `com.ashbi.olive` (good, consistent with package `olive`), but the repo name is `contraction-tracker`. Intentional — the repo is the technical name, the app is the brand name. Both are right.

**Fix:** None.

### P3-3. Lucide icons are the only third-party UI library

**Where:** `src/App.tsx:2-30` — 25 icons imported from `lucide-react`.

**Why it matters:** Could be inlined as SVG (saves ~3-5KB per icon × 25 = ~100KB), but the developer ergonomics of `lucide-react` are worth it. Ship as-is.

**Fix:** None.

### P3-4. No `prepare` / `postinstall` script

**Where:** `package.json` scripts. No `prepare` to run on `npm install`.

**Why it matters:** The `postinstall: prisma generate` pattern is missing entirely — but the project doesn't use Prisma. The deploy workflow's `npm ci` step is the only setup. Safe.

**Fix:** None.

### P3-5. README covers v1.0 but package is 1.0.1

**Where:** `README.md` line 96 says `Version: 1.0.0`. `package.json` says `1.0.1`.

**Why it matters:** Same as P0-1 but for docs. The README's stack table is the "shipped state" — bump on releases.

**Fix:** Auto-generate from `package.json` or use a CI check. ~30 min.

---

## Priority Ship Order

If you want to ship the highest-value fixes in order, the recommended sequence is:

1. **P0-1 + P3-5** (version drift) — single PR, fundamental data hygiene
2. **P0-2** (pdf-lib chunk split) — 15 minutes, biggest perf win
3. **P0-3** (useEffect deps) — 15 minutes, fixes a real bug shape
4. **P0-4** (sw.js CACHE_NAME) — 30 minutes, fixes deploy safety
5. **P1-4** (ShareView typing) — 30 minutes, prevents contract drift
6. **P1-2** (source maps) — 5 minutes, enables prod debugging
7. **P1-7** (Dockerfile CMD) — 5 minutes, fixes graceful shutdown
8. **P1-1** (iOS build dir) — 10 minutes, hygiene
9. **P1-3** (lucide-react verify) — 5 minutes, P0 if it's a typo-squat
10. **P1-5** (CSP + HSTS) — 20 minutes (proxy config), security
11. **P2-6** (Onboarding a11y) — 30 minutes, user-facing
12. **P1-6** (5-1-1 snooze) — 1.5-2h, real UX feature
13. **P2-1, P2-2, P2-3, P2-4, P2-5, P2-7, P2-8, P2-9** — cluster as a "polish" PR
14. **P3-1** (error log) — defer until support tickets demand it

**Total: ~80-90 hours of work** if every P0+P1+P2 is shipped. The P0 cluster alone is ~2 hours and ships 4 real fixes.

---

## What's NOT in scope

- Backend (`camster91/luna-relay`) — different repo, different review
- iOS/Android native code (`ios/App/`, `android/`) — committed but not audited in this pass
- App Store metadata files (`APP-STORE-CONNECT-FIELDS.txt`, etc.) — sticky content, not code
- The 15 Playwright e2e specs — not read in this pass; their existence is the signal

---

## Appendix: How to interpret this

Every P0 finding has a fix that takes <2h. The P1 cluster is mostly housekeeping. The P2 cluster is a single "polish" PR. The P3 cluster is defer-able.

If you want to ship every P0+P1 in one batch, that's ~6-8 hours of work. If you want to do it as separate PRs, expect 5-7 PRs over a week. If you want to ship this whole review as a single mega-PR (don't), it'll be review-hostile.

**My recommendation:** Ship P0s as a single PR (1-2h), then decide if P1s are worth a separate PR (they're hygiene, not features). The P2 cluster can wait for the next feature work.
