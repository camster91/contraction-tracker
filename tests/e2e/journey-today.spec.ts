import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
  });
});

test('preparation has three direct actions and a reachable timer on a narrow phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await waitForApp(page);
  const home = page.getByRole('region', { name: 'One step at a time' });
  await expect(home.getByRole('button')).toHaveCount(3);
  const start = page.getByRole('button', { name: /Start Tap when it begins/i });
  const box = await start.boundingBox();
  expect(box!.y + box!.height).toBeLessThan(740);
  expect(await page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/journey-today-preparing-320.png' });
  await home.getByRole('button', { name: 'Appointments & notes' }).click();
  await expect(page.getByRole('heading', { name: 'Appointments & notes' })).toBeVisible();
  await page.getByRole('button', { name: 'Close birth journey' }).click();
  await expect(home.getByRole('button', { name: 'Appointments & notes' })).toBeFocused();
  await start.click();
  await expect(home).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Stop/i }).first()).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('olive:journey:v1')!).profile.phase)).toBe('preparing');
});

test('recovery and archived home follow explicit saved stages, with timing always available', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: 'Open birth journey' }).click();
  await page.getByRole('button', { name: 'Postpartum', exact: true }).click();
  await page.getByRole('button', { name: 'Close birth journey' }).click();
  await page.reload();
  await waitForApp(page);
  await expect(page.getByRole('region', { name: 'Take today gently' })).toBeVisible();
  await page.getByRole('button', { name: 'Recovery & appointments' }).click();
  await expect(page.getByRole('heading', { name: 'First 12 weeks' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to birth journey' }).click();
  await page.getByRole('button', { name: 'Archived', exact: true }).click();
  await page.getByRole('button', { name: 'Close birth journey' }).click();
  const archived = page.getByRole('region', { name: 'Your saved journey' });
  await expect(archived.getByRole('button')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/journey-today-archived.png' });
  await page.getByRole('button', { name: /Start Tap when it begins/i }).click();
  await expect(archived).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Stop/i }).first()).toBeVisible();
});


test('daylight and larger text keep home actions operable offline', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Daylight' }).click();
  await page.getByRole('switch', { name: 'Big text' }).click();
  await page.getByRole('button', { name: 'Close settings' }).click();
  const start = page.getByRole('button', { name: /Start Tap when it begins/i });
  await expect(start).toBeInViewport({ ratio: 1 });
  expect(await page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/journey-today-daylight-big-text.png' });
  await page.context().setOffline(true);
  await page.getByRole('region', { name: 'One step at a time' }).getByRole('button', { name: 'Pregnancy planner' }).click();
  await expect(page.getByRole('heading', { name: 'Pregnancy planner' })).toBeVisible();
  await page.getByRole('button', { name: 'Close birth journey' }).click();
  await start.click();
  await expect(page.getByRole('button', { name: /Stop/i }).first()).toBeVisible();
});
