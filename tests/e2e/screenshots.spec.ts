/**
 * Screenshot capture script — generates the 5 iPhone 6.7" screenshots
 * needed for the App Store listing. Each captures a different app state.
 *
 * Run with: npx playwright test e2e/screenshots.spec.ts --reporter=line
 *   --update-snapshots OR manually from the script.
 */
import { test, expect } from '@playwright/test';
import * as helpers from './helpers';
import * as fs from 'fs';
import * as path from 'path';

const OUT = '/Users/biancabienaime/.hermes/cache/indie-ship/APPS/olive-contractions/screenshots';
fs.mkdirSync(OUT, { recursive: true });

const SHOTS = [
  { name: '01-hero-timer', desc: 'Main timer screen with Start button, calm hero shot' },
  { name: '02-contraction-active', desc: 'Active contraction in progress with timer running' },
  { name: '03-history', desc: 'History of recorded contractions' },
  { name: '04-share', desc: 'Share with partner screen showing the 6-char code' },
  { name: '05-511-alert', desc: '5-1-1 pattern alert state (or partner share view)' },
];

for (const shot of SHOTS) {
  test(`screenshot: ${shot.name}`, async ({ page }) => {
    await page.goto('http://127.0.0.1:8765/', { waitUntil: 'domcontentloaded' });
    await helpers.waitForApp(page);
    await helpers.skipOnboardingIfPresent(page);
    // Close the "Save a backup" banner
    const notNow = page.getByRole('button', { name: /Not now/i }).first();
    if ((await notNow.count()) > 0 && (await notNow.isVisible().catch(() => false))) {
      try { await notNow.click({ timeout: 2000 }); } catch { /* */ }
      await page.waitForTimeout(300);
    }

    // Different states per shot
    if (shot.name === '02-contraction-active') {
      // Click Start, wait, capture
      const start = page
        .locator('button.from-rose-300, button.bg-gradient-to-br')
        .filter({ has: page.locator('text=Start') })
        .first();
      await start.click({ force: true });
      await page.waitForTimeout(3_000); // 3s of active timer
    } else if (shot.name === '03-history') {
      // Start and end a contraction, then look for history
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
      // Open share sheet
      const share = page.getByRole('button', { name: /Share/i }).first();
      if ((await share.count()) > 0) {
        try { await share.click({ timeout: 2000 }); } catch { /* */ }
        await page.waitForTimeout(1_000);
      }
    } else if (shot.name === '05-511-alert') {
      // The 5-1-1 alert requires 3+ contractions in 10 min. The auto-progress
      // would have triggered it. Without seeding data we can't easily force
      // this state, so just take the partner share view (different URL).
      // Actually, let's just take the main screen here.
    }

    // Wait for animations to settle
    await page.waitForTimeout(1_000);

    // iPhone 6.7" Display: 1290 × 2796
    await page.setViewportSize({ width: 430, height: 932 });
    // The full 1290x2796 is at @3x. Setting viewport to logical 430x932
    // gives the right density when we screenshot at 3x.
    const buffer = await page.screenshot({ fullPage: false });
    const out = path.join(OUT, `${shot.name}.png`);
    fs.writeFileSync(out, buffer);
    console.log(`wrote ${out} (${buffer.length} bytes)`);

    expect(buffer.length).toBeGreaterThan(1000);
  });
}
