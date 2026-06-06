/**
 * Share view reload resilience.
 *
 * Scenario: Bianca shares a code with her mom. Mom opens the link,
 * sees the share view, then accidentally refreshes the page. Does
 * the share view still load correctly, or does it show a stale
 * "Loading…" or a broken state?
 *
 * The share view is a single React component (no client-side
 * routing). On reload, it re-fetches the share from the relay,
 * then re-fetches the contractions. If anything in this pipeline
 * doesn't restore properly, the user sees a regression.
 */
import { test, expect } from '@playwright/test';
import * as helpers from './helpers';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://contractions.ashbi.ca/';

test('share-view: survives a manual page reload', async ({ page }) => {
  const testCode = 'reloads'; // 6 chars
  // Create a real share on the relay (rate-limited; uses a slot from budget)
  const share = await page.request.post(`${BASE_URL.replace(/\/$/, '')}/api/shares` as any, {
    headers: { 'Content-Type': 'application/json' },
    data: {
      sessionId: 'reload-test',
      ttlHours: 1,
      mode: 'full',
      state: 'prenatal',
    },
  }).catch(() => null);
  if (!share || !share.ok()) {
    test.skip(true, 'Cannot create share on relay (rate-limited or network)');
    return;
  }
  const code = (await share.json()).code;

  // Open the share view
  await page.goto(`${BASE_URL}?share=${code}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3_000);

  const bodyBefore = (await page.locator('body').textContent()) || '';
  expect(bodyBefore.length, 'Share view should render content before reload').toBeGreaterThan(100);

  // RELOAD
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3_000);

  const bodyAfter = (await page.locator('body').textContent()) || '';
  expect(bodyAfter.length, 'Share view should still render after reload').toBeGreaterThan(100);

  // The share code should be in the URL
  expect(page.url()).toContain(code);
});

test('share-view: back/forward navigation works', async ({ page }) => {
  // Navigate: main app → share view (via ?share=) → main app → share view again
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);

  await page.goto(`${BASE_URL}?share=invlaid`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1_000);

  // Go back
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2_000);

  const mainBody = (await page.locator('body').textContent()) || '';
  expect(mainBody.length, 'Main app should be visible after going back').toBeGreaterThan(100);

  // Go forward
  await page.goForward({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2_000);

  const shareBody = (await page.locator('body').textContent()) || '';
  expect(shareBody.length, 'Share view should be visible after going forward').toBeGreaterThan(50);
});
