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

test('a missed contraction can be added manually and is visibly identified', async ({ page }) => {
  await page.getByRole('button', { name: 'Add missed contraction' }).click();
  const sheet = page.getByRole('dialog', { name: 'Add missed contraction' });
  await expect(sheet).toBeVisible();

  const values = await page.evaluate(() => {
    const end = new Date(Date.now() - 60_000);
    const start = new Date(end.getTime() - 75_000);
    const local = (date: Date) => {
      const offset = date.getTimezoneOffset() * 60_000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };
    return { start: local(start), end: local(end) };
  });
  await sheet.getByLabel('Started').fill(values.start);
  await sheet.getByLabel('Ended').fill(values.end);
  await sheet.getByRole('button', { name: 'Save manual entry' }).click();

  await expect(page.getByText('Manual', { exact: true })).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:v1') || '{}').contractions);
  expect(stored).toHaveLength(1);
  expect(stored[0].source).toBe('manual');
  expect(Date.parse(stored[0].end)).toBeGreaterThan(Date.parse(stored[0].start));
});

test('manual entry rejects an end time before its start time', async ({ page }) => {
  await page.getByRole('button', { name: 'Add missed contraction' }).click();
  const sheet = page.getByRole('dialog', { name: 'Add missed contraction' });
  await sheet.getByLabel('Started').fill('2026-08-28T12:05');
  await sheet.getByLabel('Ended').fill('2026-08-28T12:04');
  await sheet.getByRole('button', { name: 'Save manual entry' }).click();
  await expect(sheet.getByRole('alert')).toContainText('end time must be after');
});

test('editing a completed end time cannot save a reversed duration', async ({ page }) => {
  await page.getByRole('button', { name: 'Add missed contraction' }).click();
  await page.getByRole('button', { name: 'Save manual entry' }).click();
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:v1') || '{}').contractions);
  const clock = await page.evaluate((start) => {
    const d = new Date(start);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  }, before[0].start);
  await page.getByLabel('Edit end time').fill(clock);
  await expect(page.getByText('End must be after the start, within four hours, and not in the future.')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:v1') || '{}').contractions)).toEqual(before);
});
