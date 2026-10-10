import { expect, test, type Page } from '@playwright/test';
import { waitForApp } from './helpers';

const seededContraction = {
  id: 'contraction-human-ux',
  start: '2026-08-20T14:29:00.000Z',
  end: '2026-08-20T14:30:00.000Z',
  intensity: null,
  sessionId: 'primary',
  source: 'timer',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((contraction) => {
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: [contraction] }));
    localStorage.setItem('contraction-tracker:people', JSON.stringify([{
      id: 'person-jordan',
      name: 'Jordan',
      relationship: 'Partner',
      phone: '6475550100',
      email: 'jordan@example.com',
      createdAt: '2026-08-01T00:00:00.000Z',
    }]));
  }, seededContraction);
  await page.goto('/');
  await waitForApp(page);
});

async function openContacts(page: Page) {
  await page.getByRole('button', { name: 'Care contacts' }).click();
  return page.getByRole('dialog', { name: 'Care contacts' });
}

async function openJourneyTool(page: Page, name: RegExp | string) {
  await page.getByRole('button', { name: /open birth journey/i }).click();
  const journey = page.getByRole('dialog', { name: 'Birth journey' });
  await journey.getByRole('button', { name }).click();
  return page.getByRole('dialog', { name });
}

test('contact editing, cancellation, honest sharing, and deletion undo stay local', async ({ page }) => {
  const dialog = await openContacts(page);
  const row = dialog.getByRole('listitem').filter({ hasText: 'Jordan' });

  await expect(row.getByRole('button', { name: 'Share update for Jordan' })).toBeVisible();
  await expect(row.getByRole('link', { name: 'Email Jordan' })).toHaveAttribute('href', /mailto:jordan%40example\.com/);

  await row.getByRole('button', { name: 'Edit Jordan' }).click();
  await page.getByLabel('Person name').fill('Jordan updated');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog.getByText('Jordan', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Jordan updated', { exact: true })).toHaveCount(0);

  await row.getByRole('button', { name: 'Edit Jordan' }).click();
  await page.getByLabel('Person name').fill('Jamie');
  await page.getByLabel('Relationship').selectOption('doula');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog.getByText('Jamie', { exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Contact updated' })).toBeVisible();

  const updatedRow = dialog.getByRole('listitem').filter({ hasText: 'Jamie' });
  await updatedRow.getByRole('button', { name: 'Remove Jamie' }).click();
  await expect(dialog.getByRole('button', { name: 'Undo' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Undo' }).click();
  await expect(dialog.getByText('Jamie', { exact: true })).toBeVisible();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:people') ?? '[]'));
  expect(stored).toEqual([expect.objectContaining({ name: 'Jamie', relationship: 'doula' })]);
});

test('contact cards keep long names readable and actions usable at 375px', async ({ page }) => {
  const longName = 'Alexandria Montserrat-Rivera';
  await page.setViewportSize({ width: 375, height: 812 });
  const dialog = await openContacts(page);
  const currentRow = dialog.getByRole('listitem').filter({ hasText: 'Jordan' });
  await currentRow.getByRole('button', { name: 'Edit Jordan' }).click();
  await page.getByLabel('Person name').fill(longName);
  await page.getByRole('button', { name: 'Save changes' }).click();

  const row = dialog.getByRole('listitem').filter({ hasText: longName });
  await expect(row.getByText(longName, { exact: true })).toBeVisible();
  await expect(row.getByRole('link', { name: `Call ${longName}` })).toBeVisible();
  await expect(row.getByRole('button', { name: `Share update for ${longName}` })).toBeVisible();
  await expect(row.getByRole('link', { name: `Email ${longName}` })).toBeVisible();
  await expect(row.getByRole('button', { name: `Edit ${longName}` })).toBeVisible();
  await expect(row.getByRole('button', { name: `Remove ${longName}` })).toBeVisible();

  const fitsViewport = await page.evaluate(() => (
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
    && [...document.querySelectorAll('[role="dialog"]')].every((dialogElement) => dialogElement.scrollWidth <= dialogElement.clientWidth)
  ));
  expect(fitsViewport).toBe(true);
});

test('keeps an edited contact draft when storage is full', async ({ page }) => {
  const dialog = await openContacts(page);
  const row = dialog.getByRole('listitem').filter({ hasText: 'Jordan' });
  const storedBefore = await page.evaluate(() => localStorage.getItem('contraction-tracker:people'));

  await row.getByRole('button', { name: 'Edit Jordan' }).click();
  await page.getByLabel('Phone number').fill('+1 416 555 0199');
  await page.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (key === 'contraction-tracker:people' || key === 'contraction-tracker:people::shadow') {
        throw new DOMException('Storage is full', 'QuotaExceededError');
      }
      originalSetItem.call(this, key, value);
    };
  });

  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not update this contact');
  await expect(page.getByLabel('Person name')).toHaveValue('Jordan');
  await expect(page.getByLabel('Phone number')).toHaveValue('+1 416 555 0199');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('contraction-tracker:people'))).toBe(storedBefore);
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
});

test('exam records can be edited, cancelled, and restored after deletion', async ({ page }) => {
  const dialog = await openJourneyTool(page, 'Exams');
  await dialog.getByRole('button', { name: 'Log exam' }).click();
  await page.getByLabel('Dilation (cm)').fill('6');
  await page.getByLabel('Effacement (%)').fill('80');
  await page.getByLabel('Station').selectOption('0');
  await page.getByLabel('Notes (optional)').fill('Reported by nurse');
  await dialog.getByRole('button', { name: 'Save exam' }).click();

  const exam = dialog.getByRole('button', { name: /Edit exam from/ }).locator('..').locator('..');
  await expect(exam).toContainText('6');
  await dialog.getByRole('button', { name: /Edit exam from/ }).click();
  await page.getByLabel('Dilation (cm)').fill('7');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(exam).toContainText('6');

  await dialog.getByRole('button', { name: /Edit exam from/ }).click();
  await page.getByLabel('Dilation (cm)').fill('7');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(exam).toContainText('7');

  await exam.getByRole('button', { name: /Delete exam from/ }).click();
  await expect(dialog.getByRole('button', { name: 'Undo' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Undo' }).click();
  await expect(dialog.getByRole('button', { name: /Edit exam from/ })).toBeVisible();
});

test('hospital bag deletion has an inline undo action', async ({ page }) => {
  const dialog = await openJourneyTool(page, 'Hospital bag');
  const item = dialog.getByRole('button', { name: 'Delete Phone charger' });
  await item.click();
  await expect(dialog.getByRole('button', { name: 'Undo' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Undo' }).click();
  await expect(dialog.getByRole('button', { name: 'Mark Phone charger as packed' })).toBeVisible();
});
