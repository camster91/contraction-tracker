import AxeBuilder from '@axe-core/playwright';
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

test('primary timer has no automated WCAG A or AA violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('settings and data controls have no automated WCAG A or AA violations', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('timer transition announces state and moves focus to the replacement control', async ({ page }) => {
  const start = page.getByRole('button', { name: /Start Tap when it begins/i });
  await start.focus();
  await start.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: 'In progress' })).toBeVisible();
  const stop = page.getByRole('button', { name: 'Stop' });
  await expect(stop).toBeFocused();
  await stop.press('Enter');
  await expect(page.getByRole('button', { name: /Start Tap when it begins/i })).toBeFocused();
});

test('backup import errors are exposed as assertive alerts', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'not-an-olive-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"not":"a backup"}'),
  });
  await expect(page.getByRole('alert')).toContainText(/not a valid Olive backup/i);
});

test('settings choices and quiet-hour fields expose names and selected state', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('button', { name: /Calm/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '12-hour' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('switch', { name: 'Quiet hours' }).click();
  await expect(page.getByRole('combobox', { name: 'Quiet hours start time' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Quiet hours end time' })).toBeVisible();
});

test('sharing actions meet touch-target size and announce clipboard success', async ({ page }) => {
  const code = 'a11y2345share';
  await page.evaluate(({ code }) => {
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
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => undefined },
    });
  });
  await page.getByRole('button', { name: 'Share with partner', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Share with partner' });
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);

  for (const name of ['Copy link', 'Share via…', 'Revoke']) {
    const box = await sheet.getByRole('button', { name }).boundingBox();
    expect(box, `${name} must have a rendered touch target`).not.toBeNull();
    expect(box!.width, `${name} touch target width`).toBeGreaterThanOrEqual(44);
    expect(box!.height, `${name} touch target height`).toBeGreaterThanOrEqual(44);
  }

  await sheet.getByRole('button', { name: 'Copy link' }).click();
  await expect(sheet.getByRole('status').filter({ hasText: 'Share link copied to clipboard.' })).toBeAttached();
  await expect(sheet.getByRole('button', { name: 'Link copied' })).toBeFocused();

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => { throw new Error('permission denied'); } },
    });
  });
  await sheet.getByRole('button', { name: 'Link copied' }).click();
  await expect(sheet.getByRole('status').filter({ hasText: 'Share link selected. Copy it manually.' })).toBeAttached();
  await expect(sheet.locator('input[readonly]')).toBeFocused();
});

test('sharing preserves focus and announces successful create and revoke', async ({ page }) => {
  const code = 'focus2345link';
  await page.route('**/api/shares**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (request.method() === 'POST' && pathname === '/api/shares') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          code,
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
          hostToken: 'host-capability',
          hasPin: false,
          state: 'prenatal',
          mode: 'stats',
          journeyPermissions: [],
        }),
      });
      return;
    }
    if (request.method() === 'PATCH' && pathname === `/api/shares/${code}`) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });

  await page.getByRole('button', { name: 'Share with partner', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Share with partner' });
  await sheet.getByRole('button', { name: 'Create summary link' }).click();
  await expect(sheet.getByRole('status').filter({ hasText: 'Share link created.' })).toBeAttached();
  await expect(sheet.locator(`#share-url-${code}`)).toBeFocused();

  page.once('dialog', (dialog) => dialog.accept());
  await sheet.getByRole('button', { name: 'Revoke' }).click();
  await expect(sheet.getByRole('status').filter({ hasText: 'Share link revoked.' })).toBeAttached();
  await expect(sheet.getByRole('button', { name: 'Create summary link' })).toBeFocused();
});

test('share-server failure is assertive and keeps the create action available', async ({ page }) => {
  await page.route('**/api/shares', (route) => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.getByRole('button', { name: 'Share with partner', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Share with partner' });
  const create = sheet.getByRole('button', { name: 'Create summary link' });
  await create.click();
  await expect(sheet.getByRole('alert')).toContainText('Could not reach the share server');
  await expect(create).toBeEnabled();
  await expect(create).toBeFocused();
});

test('reduced-motion preference suppresses repeating timer animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  const start = page.getByRole('button', { name: /Start Tap when it begins/i });
  await expect(start).toBeVisible();
  const animation = await start.evaluate((element) => getComputedStyle(element).animationDuration);
  expect(Number.parseFloat(animation)).toBeLessThanOrEqual(0.01);
});
