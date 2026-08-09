/**
 * Cross-browser smoke test — runs against both Chromium and WebKit
 * (real iOS Safari engine) to catch engine-specific bugs.
 *
 * Why this matters: the PWA gets shipped inside a Capacitor iOS
 * wrapper. Capacitor's iOS WebView is WebKit (WKWebView). Chromium
 * in the browser is different. Bugs that only show up in WebKit
 * (e.g., backdrop-filter rendering, certain IndexedDB edge cases,
 * specific CSS Grid behaviors) won't be caught by the chromium
 * gauntlet.
 *
 * Run with: npx playwright test e2e/cross-browser.spec.ts --project='iPhone 14 (webkit)'
 *
 * NOT run in CI by default — these tests require the live PWA to
 * load, and on slow CI networks the `retries: 2` config can amplify
 * a slow first attempt into a 10+ minute hang. Use as a release
 * validation tool: `npx playwright install webkit && npx playwright
 * test e2e/cross-browser.spec.ts --project='iPhone 14 (webkit)'`.
 */
import { test, expect } from '@playwright/test';
import * as helpers from './helpers';

// Skip the entire file in CI — the chromium project already covers
// the same flows against the same live URL, with the same retry
// behavior. Cross-browser is opt-in for release validation, not CI.
test.beforeAll(({ }) => {
  if (process.env.CI) test.skip(true, 'cross-browser suite is opt-in for release validation');
});

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://contractions.ashbi.ca/';

test('cross-browser: main app loads without errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);

  // Main app rendered
  const body = (await page.locator('body').textContent()) || '';
  expect(body.length, 'App should render content').toBeGreaterThan(100);
  expect(body, 'Brand "Olive" should be visible').toContain('Olive');

  // No fatal errors
  const fatal = consoleErrors.filter((e) =>
    /uncaught|failed to load|TypeError|ReferenceError/i.test(e),
  );
  expect(fatal, `No fatal console errors, got: ${fatal.join(' | ')}`).toHaveLength(0);
});

test('cross-browser: short clusters stay observational in every engine', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);

  // Seed a short cluster. It should be described, but must not be treated as
  // a sustained care-plan reminder.
  await page.evaluate(() => {
    const now = Date.now();
    const contractions = [
      { start: new Date(now - 10 * 60_000).toISOString(), end: new Date(now - 9 * 60_000).toISOString() },
      { start: new Date(now - 5 * 60_000).toISOString(),  end: new Date(now - 4 * 60_000).toISOString() },
      { start: new Date(now - 0 * 60_000).toISOString(),  end: new Date(now + 1 * 60_000).toISOString() },
    ].map((c, i) => ({
      id: `cb-${i}`,
      sessionId: 'cb-test',
      start: c.start,
      end: c.end,
      durationMs: 60_000,
      intensity: 'medium',
      note: '',
      tags: [],
      painLocations: [],
    }));
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions }));
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);
  await page.waitForTimeout(3_000);

  const body = (await page.locator('body').textContent()) || '';
  expect(body).toMatch(/Frequent contractions|Pattern building/);
  expect(body).not.toContain('Saved care-plan reminder');
  expect(body).not.toMatch(/active labor|time to call/i);
});

test('cross-browser: privacy page renders without CSP errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  await page.goto(`${BASE_URL}privacy`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');

  // Title and body
  const title = await page.title();
  expect(title).toContain('Privacy Policy');

  // No CSP errors
  const cspErrors = consoleErrors.filter((e) =>
    /Content-Security-Policy|Refused to load/i.test(e),
  );
  expect(cspErrors, `Privacy page should not have CSP errors, got: ${cspErrors.join(' | ')}`).toHaveLength(0);
});

test('cross-browser: localStorage round-trip works', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);

  // Write a value
  await page.evaluate(() => {
    localStorage.setItem('cb-test-key', 'cb-test-value');
  });

  // Reload
  await page.reload({ waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);

  // Read it back
  const readBack = await page.evaluate(() => localStorage.getItem('cb-test-key'));
  expect(readBack, 'localStorage should survive a reload').toBe('cb-test-value');
});
