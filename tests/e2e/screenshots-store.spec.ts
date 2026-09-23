/**
 * App Store screenshot generator â€” runs at all required device sizes.
 *
 * Apple App Store requires at least one screenshot for each device class:
 *   - 6.7" iPhone (iPhone 14 Pro Max, 15 Pro Max, 15 Plus): 1290x2796
 *   - 6.1" iPhone (iPhone 14, 15): 1170x2532
 *   - 5.5" iPhone (iPhone 8 Plus): 1242x2208 (legacy but still required)
 *   - 12.9" iPad Pro (3rd-6th gen): 2048x2732
 *
 * Google Play Store requires:
 *   - 7" tablet minimum, but phone-sized screenshots work too
 *   - Recommended: 1080x1920 or higher
 *
 * Run: npx playwright test e2e/screenshots-store.spec.ts --reporter=line
 *
 * Writes to:
 *   ~/.hermes/cache/indie-ship/APPS/olive-contractions/screenshots/{size}/{shot}.png
 *   or PLAYWRIGHT_SCREENSHOT_OUT override
 */
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as helpers from './helpers';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8765/';
const HOME = process.env.HOME || '/Users/biancabienaime';
const OUT_BASE = process.env.PLAYWRIGHT_SCREENSHOT_OUT
  ?? `${HOME}/.hermes/cache/indie-ship/APPS/olive-contractions/screenshots`;

// Required Apple App Store + Google Play Store screenshot sizes
const SIZES: { name: string; width: number; height: number; deviceScale: number; device: string }[] = [
  // 6.7" iPhone 14 Pro Max, 15 Pro Max, 15 Plus
  { name: '6.7_iphone', width: 430, height: 932, deviceScale: 3, device: 'iPhone 14 Pro Max' },
  // 6.1" iPhone 14, 15
  { name: '6.1_iphone', width: 390, height: 844, deviceScale: 3, device: 'iPhone 14' },
  // 5.5" iPhone 8 Plus (legacy but required)
  { name: '5.5_iphone', width: 414, height: 736, deviceScale: 3, device: 'iPhone 8 Plus' },
  // 12.9" iPad Pro 6th gen
  { name: '12.9_ipad', width: 1024, height: 1366, deviceScale: 2, device: 'iPad Pro 12.9' },
];

interface Shot { name: string; desc: string; setup?: (page: any) => Promise<void> }
const SHOTS: Shot[] = [
  { name: '01-hero-timer', desc: 'Main timer screen with Start button' },
  {
    name: '02-contraction-active',
    desc: 'Active contraction in progress with timer running',
    setup: async (page) => {
      const start = page.locator('button').filter({ hasText: /Start/i }).first();
      if (await start.count() > 0) {
        await start.click({ force: true });
        await page.waitForTimeout(3_000);
      }
    },
  },
  {
    name: '03-history',
    desc: 'History of recorded contractions',
    setup: async (page) => {
      // Seed 4 contractions into localStorage and reload
      await page.evaluate(() => {
        const now = Date.now();
        const contractions = [
          { start: new Date(now - 30 * 60_000).toISOString(), end: new Date(now - 30 * 60_000 + 50_000).toISOString() },
          { start: new Date(now - 22 * 60_000).toISOString(), end: new Date(now - 22 * 60_000 + 65_000).toISOString() },
          { start: new Date(now - 14 * 60_000).toISOString(), end: new Date(now - 14 * 60_000 + 70_000).toISOString() },
          { start: new Date(now - 6 * 60_000).toISOString(), end: new Date(now - 6 * 60_000 + 80_000).toISOString() },
        ].map((c, i) => ({
          id: `hist-${i}`,
          sessionId: 'hist-seed',
          start: c.start,
          end: c.end,
          durationMs: c.end ? (new Date(c.end).getTime() - new Date(c.start).getTime()) : 0,
          intensity: ['mild', 'medium', 'strong', 'mild'][i],
          note: '',
          tags: [],
          painLocations: [],
        }));
        localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions }));
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await helpers.waitForApp(page);
      await page.waitForTimeout(2_000);
    },
  },
  { name: '05-care-plan-reminder',
    desc: 'Saved care-team timing reminder',
    setup: async (page) => {
      await page.evaluate(() => {
        const now = Date.now();
        const contractions = Array.from({ length: 11 }, (_, i) => {
          const start = now - (55 - i * 5) * 60_000;
          return {
            id: `care-plan-${i}`,
            sessionId: 'care-plan-seed',
            start: new Date(start).toISOString(),
            end: new Date(start + 60_000).toISOString(),
            durationMs: 60_000,
            intensity: 'medium',
            note: '',
            tags: [],
            painLocations: [],
          };
        });
        localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions }));
        localStorage.setItem('contraction-tracker:care-plan', JSON.stringify({
          providerName: 'North Star Midwives',
          providerPhone: '+1 416 555 0142',
          intervalMinutes: 5,
          durationSeconds: 60,
          windowMinutes: 60,
        }));
        localStorage.setItem('contraction-tracker:onboarding-seen', '1');
        localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await helpers.waitForApp(page);
      await expect(page.getByText('Saved care-plan reminder')).toBeVisible();
    },
  },
];

for (const size of SIZES) {
  test.describe(`screenshots: ${size.name}`, () => {
    test.use({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: size.deviceScale,
      isMobile: size.name.includes('iphone') || size.name.includes('ipad'),
      hasTouch: true,
    });

    for (const shot of SHOTS) {
      test(`${size.name} ${shot.name}`, async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        await helpers.waitForApp(page);
        await helpers.skipOnboardingIfPresent(page);

        // Close backup banner
        const notNow = page.getByRole('button', { name: /Not now/i }).first();
        if ((await notNow.count()) > 0 && (await notNow.isVisible().catch(() => false))) {
          try { await notNow.click({ timeout: 2000 }); } catch { /* */ }
          await page.waitForTimeout(300);
        }

        if (shot.setup) {
          await shot.setup(page);
        }

        const outDir = path.join(OUT_BASE, size.name);
        fs.mkdirSync(outDir, { recursive: true });
        const outFile = path.join(outDir, `${shot.name}.png`);
        await page.screenshot({ path: outFile, fullPage: false });
        console.log(`wrote ${outFile} (${(fs.statSync(outFile).size / 1024).toFixed(0)}KB)`);
      });
    }
  });
}
