# AGENTS.md

## Cursor Cloud specific instructions

Olive is a **frontend-only** mobile-first PWA (React 19 + TypeScript + Vite + Tailwind v4), wrapped by Capacitor for iOS/Android. There is no backend in this repo: the relay/sync server (`luna-relay`) lives in a separate repository. Standard commands live in `package.json` `scripts`; the notes below are only the non-obvious caveats.

### Services / how to run
- Dev server: `npm run dev` serves the PWA at `http://localhost:5173`. This is the primary way to develop and test; it runs Vite directly (no `tsc`).
- The app's **core** functionality (start/stop contraction timing, history, 5-1-1 detection, local storage) works fully standalone/offline with no backend.
- Only the share/multi-device sync features call the relay, which defaults to `https://relay.ashbi.ca`. Override with `VITE_RELAY_URL` (e.g. `VITE_RELAY_URL=http://localhost:8787`). The page CSP `connect-src` only allows `'self'` and `https://relay.ashbi.ca`, so pointing at a different relay host also requires adjusting the CSP in `index.html`. Share features are expected to silently no-op in this environment since the relay is not run here.

### Build caveat (pre-existing)
- `npm run build` currently FAILS at the `tsc -b` step with `vite.config.ts(33,3): error TS1117: An object literal cannot have multiple properties with the same name` — there are two `build` keys in the Vite config object. This is a pre-existing code bug, not an environment problem. Dev mode is unaffected because `vite` alone tolerates duplicate JS object keys.

### e2e tests (Playwright)
- Playwright's `chromium` browser must be installed (`npx playwright install chromium`).
- Tests default to the **live** site (`https://contractions.ashbi.ca`). To test the local dev server, set `PLAYWRIGHT_BASE_URL=http://localhost:5173` and run e.g. `npx playwright test --project='iPhone 14 (chromium)'`. Start `npm run dev` first — Playwright does not auto-start it.
- Typecheck the e2e suite separately: `./node_modules/.bin/tsc -p tests/tsconfig.json`.
- Known pre-existing test failure: `tests/e2e/logic.spec.ts` "reads/writes documented localStorage keys" asserts every localStorage value is valid JSON, but `olive:client-id` is stored as a raw (unquoted) string by design (`src/lib/identity.ts`), so that one assertion fails. Unrelated to environment setup.
