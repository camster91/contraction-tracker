import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers';

test('an existing private share link can be shown as a QR code', async ({ page }) => {
  const code = 'abcd2345wxyz';
  await page.addInitScript(({ code }) => {
    localStorage.clear();
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
    localStorage.setItem('contraction-tracker:shares', JSON.stringify([{
      id: code,
      sessionId: 'primary',
      mode: 'stats',
      state: 'prenatal',
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      revoked: false,
      createdAt: new Date().toISOString(),
      journeyPermissions: [],
    }]));
    localStorage.setItem(`olive:share-host-token:${code}`, 'test-host-capability');
  }, { code });

  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: 'Share with partner', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Share with partner' });
  await sheet.getByRole('button', { name: 'Show QR code' }).click();

  const qr = sheet.getByRole('img', { name: 'QR code for this Olive share link' });
  await expect(qr).toBeVisible();
  await expect(qr).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(sheet.getByText(/Anyone who photographs or receives this code can open the link/i)).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Hide QR code' })).toBeVisible();
});
