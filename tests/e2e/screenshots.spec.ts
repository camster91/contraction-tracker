/**
 * Screenshot capture — generates the iPhone 6.7" screenshots for the
 * App Store / Play Store listings. Each shot captures a different state.
 *
 * Default target: the live PWA at https://contractions.ashbi.ca/
 *   (matches what real users see — most accurate for store listings)
 *
 * Override: PLAYWRIGHT_BASE_URL=http://127.0.0.1:8765/ to use a local
 *   build (set up a static file server in the dist/ dir first).
 *
 * Run: npx playwright test e2e/screenshots.spec.ts --reporter=line
 */
import { test, expect } from '@playwright/test';
import * as helpers from './helpers';
import * as fs from 'fs';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://contractions.ashbi.ca/';
const OUT = '/Users/biancabienaime/.hermes/cache/indie-ship/APPS/olive-contractions/screenshots';
fs.mkdirSync(OUT, { recursive: true });

interface Shot { name: string; desc: string }
const SHOTS: Shot[] = [
  { name: '01-hero-timer', desc: 'Main timer screen with Start button, calm hero shot' },
  { name: '02-contraction-active', desc: 'Active contraction in progress with timer running' },
  { name: '03-history', desc: 'History of recorded contractions' },
  { name: '04-share', desc: 'Share with partner modal' },
  { name: '05-511-alert', desc: 'Main screen (5-1-1 alert requires seeded data; see follow-up)' },
];

for (const shot of SHOTS) {
  test(`screenshot: ${shot.name}`, async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await helpers.waitForApp(page);
    await helpers.skipOnboardingIfPresent(page);

    // Close the "Save a backup" banner if present
    const notNow = page.getByRole('button', { name: /Not now/i }).first();
    if ((await notNow.count()) > 0 && (await notNow.isVisible().catch(() => false))) {
      try { await notNow.click({ timeout: 2000 }); } catch { /* */ }
      await page.waitForTimeout(300);
    }

    // Per-shot state
    if (shot.name === '02-contraction-active') {
      const start = page
        .locator('button.from-rose-300, button.bg-gradient-to-br')
        .filter({ has: page.locator('text=Start') })
        .first();
      await start.click({ force: true });
      await page.waitForTimeout(3_000);
    } else if (shot.name === '03-history') {
      const start = page
        .locator('button.from-rose-300, button.bg-gradient-to-br')
        .filter({ has: page.locator('text=Start') })
        .first();
      await start.click({ force: true });
      await page.waitForTimeout(2_500);
      const stop = page.locator('button').filter({ hasText: 'Stop' }).first();
      await stop.click({ force: true });
      await page.waitForTimeout(1_500);
    } else if (shot.name === '04-share') {
      const share = page.getByRole('button', { name: /Share/i }).first();
      if ((await share.count()) > 0) {
        try { await share.click({ timeout: 2000 }); } catch { /* */ }
        await page.waitForTimeout(1_000);
      }
    }
    // 05-511-alert: would need seeded data. Falls through to main screen.

    // Let animations settle
    await page.waitForTimeout(1_000);

    // iPhone 6.7" Display: 1290 × 2796. Set logical viewport, screenshot
    // at native pixel ratio (3x) to hit the App Store size.
    await page.setViewportSize({ width: 430, height: 932 });

    const buffer = await page.screenshot({
      fullPage: false,
      // deviceScaleFactor=3 is set in playwright.config.ts; combined with
      // 430x932 viewport, the resulting PNG is 1290x2796.
    });
    const out = `${OUT}/${shot.name}.png`;
    fs.writeFileSync(out, buffer);
    console.log(`wrote ${out} (${buffer.length} bytes, ${buffer.length > 100_000 ? 'ok' : 'TOO SMALL'})`);

    expect(buffer.length).toBeGreaterThan(100_000);
  });
}
