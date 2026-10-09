/**
 * Screenshot capture â€” generates the iPhone 6.7" screenshots for the
 * App Store / Play Store listings. Each shot captures a different state.
 *
 * Default target: a local production build at http://127.0.0.1:8765/
 *   (matches what the shipped apps bundle).
 *
 * Override: PLAYWRIGHT_BASE_URL to target another deployment.
 *
 * Run: npx playwright test e2e/screenshots.spec.ts --reporter=line
 */
import { test, expect } from '@playwright/test';
import * as helpers from './helpers';
import * as fs from 'fs';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8765/';
// Default: write to project's own screenshots/ dir (CI-safe).
// Override with SCREENSHOT_OUT env var to write to your local indie-ship cache.
const OUT = process.env.SCREENSHOT_OUT
  ?? `${process.cwd()}/playwright-report/screenshots`;
fs.mkdirSync(OUT, { recursive: true });

interface Shot { name: string; desc: string }
const SHOTS: Shot[] = [
  { name: '01-hero-timer', desc: 'Main timer screen with Start button, calm hero shot' },
  { name: '02-contraction-active', desc: 'Active contraction in progress with timer running' },
  { name: '03-history', desc: 'History of recorded contractions' },
  { name: '05-care-plan-reminder', desc: 'Saved care-team timing reminder' },
];

for (const shot of SHOTS) {
  test(`screenshot: ${shot.name}`, async ({ page }, info) => {
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
    }
    else if (shot.name === '05-care-plan-reminder') {
      await page.evaluate(() => {
        const now = Date.now();
        const contractions = Array.from({ length: 11 }, (_, i) => {
          const start = now - (55 - i * 5) * 60_000;
          return {
            id: `care-plan-${i}`,
            sessionId: 'primary',
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
          enabled: true,
          providerName: 'Example care team',
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
    }

    // Let animations settle
    await page.waitForTimeout(1_000);

    // iPhone 6.7" Display: 1290 Ã— 2796. Set logical viewport, screenshot
    // at native pixel ratio (3x) to hit the App Store size.
    await page.setViewportSize({ width: 430, height: 932 });

    const buffer = await page.screenshot({
      fullPage: false,
      // deviceScaleFactor=3 is set in playwright.config.ts; combined with
      // 430x932 viewport, the resulting PNG is 1290x2796.
    });
    const out = `${OUT}/${info.project.name.replace(/[^a-z0-9]+/gi, "-")}-${shot.name}.png`;
    fs.writeFileSync(out, buffer);
    console.log(`wrote ${out} (${buffer.length} bytes)`);

    // PNG compression varies by engine and platform. Verify the actual
    // listing dimensions and rendered state rather than an arbitrary file size.
    expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(buffer.readUInt32BE(16)).toBe(1290);
    expect(buffer.readUInt32BE(20)).toBe(2796);
    if (shot.name === '02-contraction-active') {
      await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeInViewport();
    } else if (shot.name === '05-care-plan-reminder') {
      await expect(page.getByText('Saved care-plan reminder')).toBeVisible();
    } else {
      await expect(page.getByRole('button', { name: /^Start/ })).toBeInViewport();
      if (shot.name === '03-history') await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
    }
  });
}
