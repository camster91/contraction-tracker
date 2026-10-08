import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
    localStorage.setItem('contraction-tracker:people', JSON.stringify([{
      id: 'person-jordan',
      name: 'Jordan',
      relationship: 'Partner',
      createdAt: '2026-08-01T00:00:00.000Z',
    }]));
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.getByRole('button', { name: /open birth journey/i }).click();
});

test('responsibility can be assigned and completed offline', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: 'Birth journey' });
  await dialog.getByRole('button', { name: 'Responsibilities' }).click();
  await page.getByLabel('Responsibility').fill('Bring the hospital bag');
  await page.getByLabel('Assign to').selectOption('person-jordan');
  await page.getByRole('button', { name: 'Add responsibility' }).click();

  const task = page.getByRole('article', { name: 'Bring the hospital bag' });
  await expect(task.getByText('Jordan')).toBeVisible();
  await task.getByRole('button', { name: 'Mark complete' }).click();
  await expect(task.getByRole('button', { name: 'Reopen responsibility' })).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('olive:journey:v1') ?? 'null'));
  expect(stored.responsibilities[0].assigneePersonId).toBe('person-jordan');
  expect(stored.responsibilities[0].completedAt).toBeTruthy();
});

test('postpartum timeline records a private appointment without scoring recovery', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: 'Birth journey' });
  await dialog.getByRole('button', { name: 'Postpartum' }).click();
  const modules = dialog.getByRole('button').filter({ hasText: /First 12 weeks|Care-team contact & reminder/ });
  await expect(modules.first()).toContainText('First 12 weeks');
  await dialog.getByRole('button', { name: 'First 12 weeks' }).click();
  await page.getByLabel('Timeline entry').fill('Midwife follow-up');
  await page.getByLabel('Entry type').selectOption('appointment');
  await page.getByLabel('Date and time').fill('2026-08-20T14:30');
  await page.getByRole('button', { name: 'Add to timeline' }).click();

  const entry = page.getByRole('article', { name: 'Midwife follow-up' });
  await expect(entry.getByText('Private')).toBeVisible();
  await expect(page.getByText(/does not score recovery/i)).toBeVisible();
  await entry.getByRole('button', { name: 'Mark complete' }).click();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('olive:journey:v1') ?? 'null'));
  expect(stored.profile.phase).toBe('postpartum');
  expect(stored.entries).toHaveLength(1);
  expect(stored.entries[0].kind).toBe('appointment');
  expect(stored.entries[0].private).toBe(true);
});
