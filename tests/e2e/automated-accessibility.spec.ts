import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
  });
  await page.goto('/');
  await waitForApp(page);
});

test('primary timer has no automated WCAG A or AA violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('settings and data controls have no automated WCAG A or AA violations', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('timer transition announces state and moves focus to the replacement control', async ({ page }) => {
  const start = page.getByRole('button', { name: /Start Tap when it begins/i });
  await start.focus();
  await start.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: 'In progress' })).toBeVisible();
  const stop = page.getByRole('button', { name: 'Stop' });
  await expect(stop).toBeFocused();
  await stop.press('Enter');
  await expect(page.getByRole('button', { name: /Start Tap when it begins/i })).toBeFocused();
});

test('backup import errors are exposed as assertive alerts', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'not-an-olive-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"not":"a backup"}'),
  });
  await expect(page.getByRole('alert')).toContainText(/not a valid Olive backup/i);
});

test('settings choices and quiet-hour fields expose names and selected state', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('button', { name: /Calm/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '12-hour' }).click();
  await expect(page.getByRole('button', { name: '12-hour' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('switch', { name: 'Quiet hours' }).click();
  await expect(page.getByRole('combobox', { name: 'Quiet hours start time' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Quiet hours end time' })).toBeVisible();
});

test('reduced-motion preference suppresses repeating timer animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  const start = page.getByRole('button', { name: /Start Tap when it begins/i });
  await expect(start).toBeVisible();
  const animation = await start.evaluate((element) => getComputedStyle(element).animationDuration);
  expect(Number.parseFloat(animation)).toBeLessThanOrEqual(0.01);
});
