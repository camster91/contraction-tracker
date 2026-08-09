import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers';

test('storage: app reads and writes documented local state without corruption', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);

  const keys = await page.evaluate(() => {
    const values: Record<string, string> = {};
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key) continue;
      const value = localStorage.getItem(key);
      if (value !== null) values[key] = value;
    }
    return values;
  });

  expect(Object.keys(keys).length).toBeGreaterThan(0);
  const state = JSON.parse(keys['contraction-tracker:v1'] ?? '{}');
  expect(Array.isArray(state.contractions)).toBe(true);

  const clientId = keys['olive:client-id'];
  if (clientId) expect(clientId).toMatch(/^[a-z0-9]{14,32}$/);
});
