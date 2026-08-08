import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8765/';

test('share view accepts new 12-character relay codes', async ({ page }) => {
  const code = 'abcdefghjkmn';
  let metadataRequested = false;

  await page.route(`**/api/shares/${code}`, async (route) => {
    metadataRequested = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code,
        sessionId: 'primary',
        hasPin: false,
        mode: 'full',
        state: 'prenatal',
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        lastOpenedAt: null,
        createdAt: new Date().toISOString(),
        stateChangedAt: null,
      }),
    });
  });
  await page.route(`**/api/shares/${code}/**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ contractions: [], current: null, messages: [] }),
    });
  });

  await page.goto(`${BASE_URL}?share=${code}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1_000);

  expect(metadataRequested, 'ShareView should request metadata for a 12-character code').toBe(true);
});
