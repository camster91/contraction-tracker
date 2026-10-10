import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
  });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: /open birth journey/i }).click();
});

test('groups care tools around the person’s current journey', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: 'Birth journey' });

  await expect(dialog.getByRole('heading', { name: 'Care now' })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Preparation' })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'After birth' })).toBeVisible();
  await expect(dialog.getByText('Choose your phase')).toBeVisible();

  await dialog.getByRole('button', { name: 'Care card' }).click();
  await expect(page.getByRole('heading', { name: 'Care card' })).toBeVisible();
});

test('copies the current care-card draft before it is saved', async ({ page }) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { __copiedText: string }).__copiedText = text;
        },
      },
    });
  });

  const dialog = page.getByRole('dialog', { name: 'Birth journey' });
  await dialog.getByRole('button', { name: 'Care card' }).click();
  await page.getByLabel('Preferred name').fill('Draft Person');
  await page.getByLabel('Birth location').fill('North Star Birth Centre');
  await page.getByRole('button', { name: 'Copy care card' }).click();

  const copied = await page.evaluate(() => (window as unknown as { __copiedText: string }).__copiedText);
  expect(copied).toContain('Draft Person');
  expect(copied).toContain('North Star Birth Centre');
  await expect(page.getByText('Care card copied')).toBeVisible();
});

test('keeps the care-card draft when the journey storage write fails', async ({ page }) => {
  const before = await page.evaluate(() => localStorage.getItem('olive:journey:v1'));
  await page.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (key === 'olive:journey:v1' || key === 'olive:journey:v1::shadow') {
        throw new DOMException('Storage is full', 'QuotaExceededError');
      }
      originalSetItem.call(this, key, value);
    };
  });

  const dialog = page.getByRole('dialog', { name: 'Birth journey' });
  await dialog.getByRole('button', { name: 'Care card' }).click();
  await page.getByLabel('Preferred name').fill('Unsaved because storage is full');
  await page.getByRole('button', { name: 'Save care card' }).click();

  await expect(page.getByRole('status')).toContainText('Could not save the care card');
  await expect(page.getByRole('button', { name: 'Save care card' })).toBeVisible();
  await expect(page.getByLabel('Preferred name')).toHaveValue('Unsaved because storage is full');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('olive:journey:v1'))).toBe(before);
});

test('explains and preserves provider-detail autosave separately from reminder save', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: 'Birth journey' });
  await dialog.getByRole('button', { name: 'Care-team contact & reminder' }).click();

  await expect(page.getByText(/Provider details save as you type/i)).toBeVisible();
  await page.getByLabel('Care provider or team').fill('North Star Midwives');
  await page.getByLabel('Care provider phone').fill('+1 416 555 0142');
  await dialog.getByRole('button', { name: 'Close birth journey' }).click();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await expect(page.getByRole('link', { name: 'Call North Star Midwives' })).toBeVisible();
});
