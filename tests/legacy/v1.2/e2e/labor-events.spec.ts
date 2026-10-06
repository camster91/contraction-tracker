import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers';

test('a factual labor event can be recorded and corrected', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
  });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: 'More tools' }).click();
  await page.getByRole('button', { name: /Labor events/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Labor events' });
  await expect(sheet.getByText(/does not interpret these events/i)).toBeVisible();
  await sheet.getByLabel('Event', { exact: true }).selectOption('care-team');
  await sheet.getByLabel('Optional factual note').fill('Spoke with Alex at triage');
  await sheet.getByRole('button', { name: 'Add event' }).click();
  const event = sheet.getByRole('listitem');
  await expect(event.getByText('Contacted care team')).toBeVisible();
  await expect(event.getByText('Spoke with Alex at triage')).toBeVisible();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:labor-events') || '[]'));
  expect(stored).toHaveLength(1);
  expect(stored[0].kind).toBe('care-team');
  expect(stored[0].sessionId).toBe('primary');
});

test('labor event storage rejection stays visible and does not create a false in-memory record', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
  });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: 'More tools' }).click();
  await page.getByRole('button', { name: /Labor events/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Labor events' });
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key.startsWith('contraction-tracker:labor-events')) {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      }
      return original.call(this, key, value);
    };
  });
  expect(await page.evaluate(() => {
    try { localStorage.setItem('contraction-tracker:labor-events:probe', 'x'); return false; }
    catch { return true; }
  })).toBe(true);
  await sheet.getByLabel('Event', { exact: true }).selectOption('care-team');
  await sheet.getByRole('button', { name: 'Add event' }).click();
  await expect(sheet.getByRole('alert')).toContainText(/could not save/i);
  await expect(sheet.getByRole('listitem')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('contraction-tracker:labor-events'))).toBeNull();
});
