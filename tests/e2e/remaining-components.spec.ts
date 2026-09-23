/**
 * Remaining component integration tests.
 *
 * Covers:
 * - FrequencyChart (renders with seeded data)
 */
import { test, expect } from '@playwright/test';
import * as helpers from './helpers';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8765/';

// ---- FrequencyChart ----

test('frequency-chart: chart renders with seeded contraction data', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);

  // Seed 6 contractions over 30 minutes
  await page.evaluate(() => {
    const now = Date.now();
    const contractions = Array.from({ length: 6 }, (_, i) => ({
      id: `ch-${i}`,
      sessionId: 'chart-test',
      start: new Date(now - (6 - i) * 5 * 60_000).toISOString(),
      end: new Date(now - (6 - i) * 5 * 60_000 + 60_000).toISOString(),
      durationMs: 60_000,
      intensity: 'medium',
      note: '',
      tags: [],
      painLocations: [],
    }));
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions }));
    localStorage.setItem('olive:onboarded', '1');
    localStorage.setItem('olive:backup-reminder-dismissed', '1');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);
  await page.waitForTimeout(2_000);

  const body = (await page.locator('body').textContent()) || '';
  // The chart is rendered via canvas or SVG; we verify the page has
  // contraction-count text somewhere visible
  expect(body, 'Should show contraction count').toMatch(/6 contraction/);
});