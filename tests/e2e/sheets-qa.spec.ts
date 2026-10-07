import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('sheet-initialized')) return;
    localStorage.clear();
    sessionStorage.setItem('sheet-initialized', '1');
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
});

test('hospital bag packing survives reload', async ({ page }) => {
  await page.getByRole('button', { name: 'More tools' }).click();
  await page.getByRole('button', { name: /Hospital bag/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Hospital bag' });
  const pack = sheet.getByRole('button', { name: /^Mark .* as packed$/ }).first();
  const name = (await pack.getAttribute('aria-label'))!.replace(' as packed', ' as not packed');
  await pack.click();
  await expect(sheet.getByRole('button', { name, exact: true })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.getByRole('button', { name: 'More tools' }).click();
  await page.getByRole('button', { name: /Hospital bag/ }).click();
  await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
});

test('hospital exam is saved locally', async ({ page }) => {
  await page.getByRole('button', { name: 'More tools' }).click();
  await page.getByRole('button', { name: /Exams/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Hospital exams' });
  await sheet.getByRole('button', { name: 'Log exam' }).click();
  await sheet.getByLabel('Dilation (cm)').fill('3');
  await sheet.getByRole('button', { name: 'Save exam' }).click();
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('contraction-tracker:cervical-exams:')).some(k => JSON.parse(localStorage.getItem(k) || '[]').length === 1))).toBe(true);
});

test('a fabricated contact persists after reload', async ({ page }) => {
  await page.getByRole('button', { name: 'More tools' }).click();
  await page.getByRole('button', { name: /People/ }).click();
  const sheet = page.getByRole('dialog', { name: 'People' });
  await sheet.getByRole('button', { name: 'Add', exact: true }).click();
  await sheet.getByPlaceholder('Name (required)').fill('Example support person');
  await sheet.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(sheet.getByText('Example support person')).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.getByRole('button', { name: 'More tools' }).click();
  await page.getByRole('button', { name: /People/ }).click();
  await expect(page.getByRole('dialog', { name: 'People' }).getByText('Example support person')).toBeVisible();
});

test('a new session becomes the active timer session', async ({ page }) => {
  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByLabel('Session name').fill('Example hospital session');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect.poll(() => page.evaluate(() => {
    const sessions = JSON.parse(localStorage.getItem('contraction-tracker:sessions') || '[]');
    return sessions.find((s: { id: string; name: string }) => s.id === localStorage.getItem('contraction-tracker:active-session'))?.name;
  })).toBe('Example hospital session');
});

test('settings controls are reachable', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Big text' })).toBeVisible();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeHidden();
});
