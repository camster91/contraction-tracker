/**
 * "3am scenarios" â€” tests for the things that actually break when a
 * real person is in labor at 3am. The happy path is easy. The
 * failure modes are not.
 *
 * 1. Fast-tap test: the user starts a contraction and stops it within
 *    5 seconds. Does the duration record correctly? Does the
 *    `Contraction.end` field get set?
 * 2. Stop-then-immediately-start: user finishes one contraction and
 *    hits Start for the next one within 200ms. Does the state machine
 *    handle this without dropping the second contraction?
 * 3. Storage under pressure: seed 200 contractions, verify all
 *    round-trip through localStorage and re-render correctly.
 * 4. The "5-1-1" alert: at exactly 3 contractions in 5 minutes
 *    averaging 60s, does the active-labor banner appear?
 * 5. App boot with stale state: localStorage has an active contraction
 *    (`end === null`) from a previous session. Does the app handle it?
 * 6. Service worker doesn't serve stale bundle after a deploy
 *    (the "fossil" pattern from the PWA testing notes).
 */
import { test, expect } from '@playwright/test';
import * as helpers from './helpers';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8765/';

test('3am: fast start/stop (5 seconds) records duration correctly', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);
  await page.evaluate(() => {
    // Mark as onboarded so the carousel doesn't intercept clicks
    localStorage.setItem('olive:onboarded', '1');
    // Also dismiss the backup reminder
    localStorage.setItem('olive:backup-reminder-dismissed', '1');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);
  await page.waitForTimeout(1_000);

  // The Start button is the big primary CTA. It contains both "Start"
  // and the subtitle "TAP WHEN IT BEGINS", so we use a partial match.
  const startBtn = page.getByRole('button').filter({ hasText: /Start/i }).first();
  await expect(startBtn).toBeVisible({ timeout: 10_000 });
  await startBtn.click({ force: true });
  await page.waitForTimeout(5_000);

  // The button label changes from "Start" to "Stop" while a
  // contraction is active. Match by the Stop text.
  const stopBtn = page.getByRole('button').filter({ hasText: /Stop/i }).first();
  await expect(stopBtn).toBeVisible({ timeout: 5_000 });
  await stopBtn.click({ force: true });
  await page.waitForTimeout(2_000);

  // Verify the contraction was saved with a duration
  const result = await page.evaluate(() => {
    const stored = localStorage.getItem('contraction-tracker:v1');
    if (!stored) return { ok: false, reason: 'no storage' };
    const parsed = JSON.parse(stored);
    const finished = (parsed.contractions || []).filter((c: any) => c.end);
    if (finished.length === 0) return { ok: false, reason: 'no finished contractions' };
    const c = finished[finished.length - 1];
    const durationMs = new Date(c.end).getTime() - new Date(c.start).getTime();
    return {
      ok: true,
      start: c.start,
      end: c.end,
      durationMs,
      durationSec: Math.round(durationMs / 1000),
    };
  });

  expect(result.ok, `Contraction should be saved: ${JSON.stringify(result)}`).toBe(true);
  // We waited 5s, click latency maybe adds/subtracts a second.
  // Allow 3-10s range.
  expect(result.durationSec, `Duration should be ~5s, got ${result.durationSec}s`).toBeGreaterThanOrEqual(3);
  expect(result.durationSec, `Duration should be <10s, got ${result.durationSec}s`).toBeLessThanOrEqual(10);
});

test('3am: many contractions in sequence (200) â€” all stored, no data loss', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);

  // Seed 200 contractions directly into localStorage
  await page.evaluate(() => {
    const now = Date.now();
    const contractions = [];
    for (let i = 0; i < 200; i++) {
      const start = new Date(now - (200 - i) * 5 * 60_000).toISOString();
      const end = new Date(now - (200 - i) * 5 * 60_000 + 60_000).toISOString();
      contractions.push({
        id: `seeded-${i}`,
        sessionId: 'seeded',
        start,
        end,
        durationMs: 60_000,
        intensity: 'medium',
        note: '',
        tags: [],
        painLocations: [],
      });
    }
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions }));
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);
  await page.waitForTimeout(2_000);

  // Verify all 200 are still there
  const result = await page.evaluate(() => {
    const stored = localStorage.getItem('contraction-tracker:v1');
    if (!stored) return { count: 0 };
    const parsed = JSON.parse(stored);
    return { count: (parsed.contractions || []).length };
  });

  expect(result.count).toBe(200);

  // Verify the page didn't crash
  const bodyText = (await page.locator('body').textContent()) || '';
  expect(bodyText.length, 'Page should have rendered with 200 contractions').toBeGreaterThan(50);
});

test('3am: stale active contraction in storage (end === null) on app boot â€” graceful', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);

  // Simulate a session crash: an in-progress contraction from yesterday
  const oneHourAgo = new Date(Date.now() - 60 * 60_000).toISOString();
  await page.evaluate((startTime) => {
    const stored = {
      contractions: [{
        id: 'stale',
        sessionId: 'stale-session',
        start: startTime,
        end: null, // active
        intensity: 'medium',
        note: '',
        tags: [],
        painLocations: [],
      }],
    };
    localStorage.setItem('contraction-tracker:v1', JSON.stringify(stored));
  }, oneHourAgo);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);
  await page.waitForTimeout(2_000);

  // App should boot without crashing
  const bodyText = (await page.locator('body').textContent()) || '';
  expect(bodyText.length).toBeGreaterThan(50);

  // The page should NOT show the "in progress" timer (because the
  // contraction started over an hour ago â€” it's clearly abandoned).
  // We're not asserting the exact UI state here, just that the app
  // didn't white-screen.
  const hasErrorBoundary = /something went wrong|error boundary/i.test(bodyText);
  expect(hasErrorBoundary, 'App should not show error boundary for stale active contraction').toBe(false);
});

test('3am: a short cluster stays observational and does not diagnose labor', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);

  // Seed 3 contractions: 60s each, 5 min apart (so avgDuration >= 45s
  // and avgGap <= 5:30)
  await page.evaluate(() => {
    const now = Date.now();
    const contractions = [
      { start: new Date(now - 10 * 60_000).toISOString(), end: new Date(now - 9 * 60_000).toISOString() },
      { start: new Date(now - 5 * 60_000).toISOString(),  end: new Date(now - 4 * 60_000).toISOString() },
      { start: new Date(now - 0 * 60_000).toISOString(),  end: new Date(now + 1 * 60_000).toISOString() },
    ].map((c, i) => ({
      id: `511-${i}`,
      sessionId: '511-test',
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

  // A short cluster should be visible as timing data, not a sustained reminder.
  const bodyText = (await page.locator('body').textContent()) || '';
  expect(bodyText).not.toMatch(/Frequent contractions|Pattern building/);
  expect(bodyText).not.toContain('Saved care-plan reminder');
  expect(bodyText).not.toMatch(/active labor|time to call|head to the hospital/i);
});
