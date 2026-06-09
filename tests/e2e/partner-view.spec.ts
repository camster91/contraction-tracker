/**
 * Partner view tests — verify the partner sees the time-remaining
 * countdown and the read-only footer with the exact expiry timestamp.
 *
 * Cam's feedback: "A person can share and that data can be shared
 * for up to 7 days" — the partner needs to know when the link
 * stops working, not be surprised.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://contractions.ashbi.ca/';

test('partner: time-remaining countdown appears in share view', async ({ page }) => {
  // We use a real share code from the seed setup in share-reuse.spec.ts
  // or just create a temporary one via the localStorage
  const code = '2pwd29'; // from the live demo share

  await page.goto(`${BASE_URL}?share=${code}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3_000);

  const body = (await page.locator('body').textContent()) || '';

  // The header should show "This link works for X more days"
  const hasCountdown = /This link works for \d+ more days?|expires today|expires tomorrow/i.test(body);
  if (!hasCountdown) {
    // If the share doesn't exist (live code may have been revoked),
    // skip rather than fail
    if (/This share link is no longer valid|Share not found|expired/i.test(body)) {
      test.skip(true, `Share ${code} no longer valid — create a new one to test`);
      return;
    }
  }
  expect(hasCountdown, 'Partner view should show time-remaining countdown').toBe(true);

  // The footer should show exact expiry timestamp
  const hasExpiryDate = /expires \d{1,2}\/\d{1,2}\/\d{4}/i.test(body);
  expect(hasExpiryDate, 'Footer should show exact expiry date').toBe(true);
});

test('partner: 5-1-1 alert copy is reassuring, not alarming', async ({ page }) => {
  // The partner view shows a 5-1-1 banner when the pattern matches.
  // Cam mentioned in feedback that the language should be calm
  // ("time to call your provider", not "EMERGENCY").
  await page.goto(`${BASE_URL}?share=tc8dwj`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3_000);

  const body = (await page.locator('body').textContent()) || '';

  // Even on expired shares, the language shouldn't be alarming
  const hasAlarming = /emergency|urgent|danger|warning|alert/i.test(body);
  expect(hasAlarming, 'Partner view should use calm, reassuring language').toBe(false);
});
