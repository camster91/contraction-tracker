/**
 * Recent timing integration tests.
 *
 * Covers:
 * - Recent summary with seeded data
 */
import { test, expect } from '@playwright/test';
import * as helpers from './helpers';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8765/';

// ---- Recent summary ----

test('recent timing shows the seeded contraction count', async ({ page }) => {
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
    localStorage.setItem('contraction-tracker:sessions', JSON.stringify([
      { id: 'primary', name: 'Primary', startedAt: new Date(now - 60 * 60_000).toISOString(), endedAt: null },
      { id: 'chart-test', name: 'Chart test', startedAt: new Date(now - 60 * 60_000).toISOString(), endedAt: null },
    ]));
    localStorage.setItem('contraction-tracker:active-session', 'chart-test');
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);
  await expect(page.getByRole('region', { name: 'Recent timing' })).toContainText('6 completed');
});
