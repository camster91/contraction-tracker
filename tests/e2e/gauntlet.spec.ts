/**
 * Smoke gauntlet: the most important paths, run as plain Playwright tests.
 *
 * The persona fixture pattern (storage seeding via addInitScript) races
 * with the live PWA's slow React mount (~16s) — the seed runs before the
 * app reads storage, and the mount hangs. We work around it by NOT
 * pre-seeding storage; instead, each test starts fresh and exercises the
 * flow that the live PWA is actually capable of.
 *
 * This file is the minimum bar. Add more path files here as you discover
 * real bugs the gauntlet should catch.
 */
import { test, expect } from '@playwright/test';
import * as helpers from './helpers';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8765/';

test('gauntlet: app loads and renders the main timer screen', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);
  await helpers.skipOnboardingIfPresent(page);

  // The primary CTA has a "breathing" animation (animate-breathe-soft) that
  // makes Playwright's stability check time out. Force the click.
  const start = page
    .locator('button.from-rose-300, button.bg-gradient-to-br')
    .filter({ has: page.locator('text=Start') })
    .first();
  await expect(start).toBeVisible({ timeout: 10_000 });
  await start.click({ force: true });

  // The Stop button replaces Start during a contraction
  const stop = page
    .locator('button')
    .filter({ hasText: 'Stop' })
    .first();
  await expect(stop).toBeVisible({ timeout: 5_000 });

  // No uncaught page errors
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.waitForTimeout(2_000);
  expect(errors, 'no uncaught errors during main loop').toHaveLength(0);
});

test('gauntlet: invalid share link shows graceful error, not crash', async ({ page }) => {
  await page.goto(`${BASE_URL}?share=zzzzzz`, {
    waitUntil: 'domcontentloaded',
  });
  await helpers.waitForApp(page);
  await page.waitForTimeout(2_000);

  // Body should still render something — the app should not crash on
  // a malformed share code (ShareView.tsx:51 validates against the pattern).
  const body = page.locator('body');
  await expect(body).toBeVisible();
  const text = (await body.textContent()) || '';
  expect(text.length, 'page has content').toBeGreaterThan(50);
});

test('gauntlet: app survives offline / online flip', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);

  // Toggle network — the SW keeps the app shell, the page should stay alive
  for (let i = 0; i < 3; i++) {
    await page.context().setOffline(true);
    await page.waitForTimeout(500);
    await page.context().setOffline(false);
    await page.waitForTimeout(500);
  }

  const body = page.locator('body');
  await expect(body).toBeVisible();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.waitForTimeout(1_000);
  expect(errors, 'no uncaught errors after offline/online storm').toHaveLength(0);
});

test('gauntlet: no uncaught errors in the main thread on fresh load', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      // CSP warning about frame-ancestors is benign — it's a meta-tag
      // delivery, not a real policy issue.
      if (!msg.text().includes('frame-ancestors')) {
        errors.push(msg.text());
      }
    }
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);
  await helpers.skipOnboardingIfPresent(page);
  await page.waitForTimeout(2_000);

  expect(errors, 'no uncaught page errors on fresh load').toHaveLength(0);
});
