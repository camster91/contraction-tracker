import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('archive-fixture')) return;
    sessionStorage.setItem('archive-fixture', '1');
    localStorage.clear();
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
  });
});

test('archive pauses prompts without deleting records and can be resumed offline', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: 'Open birth journey' }).click();
  await page.getByRole('button', { name: /^Provider questions/ }).click();
  await page.getByLabel('Question for your provider', { exact: true }).fill('My saved question');
  await page.getByRole('button', { name: 'Add question', exact: true }).click();
  await page.getByRole('button', { name: 'Back to birth journey' }).click();
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('olive:journey:v1')!));
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Archived', exact: true }).click();
  await expect(page.getByText('Guidance paused', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Saved records' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Pregnancy planner/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'After birth' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open Lull website' })).toHaveCount(0);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('olive:journey:v1')!));
  expect(after.profile.id).toBe(before.profile.id);
  expect(after.questions).toEqual(before.questions);
  expect(after.responsibilities).toEqual(before.responsibilities);
  expect(after.entries).toEqual(before.entries);
  await page.screenshot({ path: 'test-results/journey-archived-320.png' });
  await page.getByRole('button', { name: 'Close birth journey' }).click();
  await expect(page.getByText('Tip 1 of 2', { exact: true })).toHaveCount(0);
  await expect(page.getByText("When you're ready.", { exact: true })).toHaveCount(0);
  await page.context().setOffline(false);
  await page.reload();
  await waitForApp(page);
  await page.getByRole('button', { name: 'Open birth journey' }).click();
  await expect(page.getByRole('button', { name: 'Archived', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /^Provider questions/ }).click();
  await expect(page.getByText('My saved question', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to birth journey' }).click();
  await page.getByRole('button', { name: 'Preparing', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Pregnancy planner/ })).toBeVisible();
});

test('archiving a matched care plan hides reminders but keeps timing and saved settings', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  await page.evaluate(() => {
    localStorage.setItem('contraction-tracker:care-plan', JSON.stringify({ enabled: true, intervalMinutes: 5, durationSeconds: 60, windowMinutes: 60 }));
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: Array.from({ length: 11 }, (_, index) => {
      const start = Date.now() - (55 - index * 5) * 60000;
      return { id: `archive-${index}`, sessionId: 'primary', start: new Date(start).toISOString(), end: new Date(start + 60000).toISOString() };
    }) }));
  });
  await page.reload();
  await waitForApp(page);
  await expect(page.getByText('Saved care-plan reminder', { exact: true })).toBeVisible();
  const plan = await page.evaluate(() => localStorage.getItem('contraction-tracker:care-plan'));
  await page.getByRole('button', { name: 'Open birth journey' }).click();
  await page.getByRole('button', { name: 'Archived', exact: true }).click();
  await page.getByRole('button', { name: 'Close birth journey' }).click();
  await expect(page.getByText('Saved care-plan reminder', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Frequent contractions', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('contraction-tracker:care-plan'))).toBe(plan);
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.getByRole('button', { name: /^Stop/ }).first()).toBeVisible();
  await page.getByRole('button', { name: /^Stop/ }).first().click();
  await page.getByRole('button', { name: 'Open birth journey' }).click();
  await page.getByRole('button', { name: 'Preparing', exact: true }).click();
  await page.getByRole('button', { name: 'Close birth journey' }).click();
  await expect(page.getByText('Saved care-plan reminder', { exact: true })).toBeVisible();
});

test('failed archive write does not claim guidance is paused', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: 'Open birth journey' }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'olive:journey:v1') throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Archived', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Preparing', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Guidance paused', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('olive:journey:v1')!).profile.phase)).toBe('preparing');
});
