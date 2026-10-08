import { expect, test } from '@playwright/test';

test('a startup render failure offers a saved-data export without exposing the error', async ({ page }) => {
  await page.addInitScript(() => {
    // Inject a render-time read failure independently of any particular UI
    // feature; the retired backup reminder no longer causes a startup crash.
    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) {
      if (key === 'contraction-tracker:onboarding-seen') throw new Error('invalid-json-private-marker');
      return getItem.call(this, key);
    };
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: [
      { id: 'fake-c1', start: '2026-10-05T12:00:00.000Z', end: '2026-10-05T12:01:00.000Z' },
    ] }));
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Olive needs to reload' })).toBeVisible();
  await expect(page.getByText('Recovered 1 saved contractions.')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('invalid-json-private-marker');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export recovered backup' }).click();
  expect((await download).suggestedFilename()).toMatch(/^olive-backup-.*\.json$/);
  await expect(page.getByRole('button', { name: 'Reload Olive' })).toBeEnabled();
  await expect(page.getByRole('link', { name: 'Contact Olive support' })).toHaveAttribute('href', 'https://olive.ashbi.ca/support/');
});

test('fresh install requires explicit opt-in before saved timing reminders are enabled', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('contraction-tracker:onboarding-seen', '1'));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Set care-team contact' }).first().click();
  const reminder = page.getByRole('checkbox', { name: 'Enable my saved care-team timing reminder' });
  await expect(reminder).not.toBeChecked();
  await page.getByRole('spinbutton', { name: /Contractions every/ }).fill('5');
  await page.getByRole('spinbutton', { name: /Lasting at least/ }).fill('60');
  await page.getByRole('spinbutton', { name: /For at least/ }).fill('60');
  await reminder.check();
  await page.getByRole('button', { name: 'Save reminder' }).click();
  await expect(page.getByRole('status')).toContainText('saved and enabled');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Set care-team contact' }).first().click();
  await expect(reminder).toBeChecked();
});
