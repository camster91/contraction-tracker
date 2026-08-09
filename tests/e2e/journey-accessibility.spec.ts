import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
  });
});

test('journey modal traps focus and restores the opener', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  const opener = page.getByRole('button', { name: /open birth journey/i });
  await opener.focus();
  await opener.click();

  const dialog = page.getByRole('dialog', { name: 'Birth journey' });
  await expect(dialog).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null)).toBe(true);
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null)).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('journey modules fit at 320px without page-level overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: /open birth journey/i }).click();
  await page.getByRole('dialog', { name: 'Birth journey' }).getByRole('button', { name: 'Care card' }).click();

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document).toBe(dimensions.viewport);
  expect(dimensions.body).toBe(dimensions.viewport);
  await expect(page.getByRole('button', { name: 'Save care card' })).toBeVisible();
});
