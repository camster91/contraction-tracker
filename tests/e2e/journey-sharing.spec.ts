import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
  });
  await page.goto('/');
  await waitForApp(page);
});

test('partner sharing requires an explicit responsibility review and names excluded categories', async ({ page }) => {
  await page.getByRole('button', { name: /open birth journey/i }).click();
  const journey = page.getByRole('dialog', { name: 'Birth journey' });
  await journey.getByRole('button', { name: 'Responsibilities' }).click();
  await page.getByLabel('Responsibility').fill('Bring the hospital bag');
  await page.getByRole('button', { name: 'Add responsibility' }).click();

  const task = page.getByRole('article', { name: 'Bring the hospital bag' });
  await expect(task.getByText('Private')).toBeVisible();
  await task.getByRole('button', { name: 'Include in a reviewed partner share' }).click();
  await expect(task.getByText('Ready to share')).toBeVisible();
  await journey.getByRole('button', { name: 'Close birth journey' }).click();

  await page.getByRole('button', { name: 'Share with partner', exact: true }).click();
  const share = page.getByRole('dialog', { name: 'Share with partner' });
  const permission = share.getByRole('checkbox', { name: /Share 1 reviewed responsibility/i });
  await expect(permission).not.toBeChecked();
  await expect(share.getByText(/Care card, provider questions, notes, and private responsibilities stay on this device/i)).toBeVisible();
  await permission.check();
  await expect(permission).toBeChecked();
});
