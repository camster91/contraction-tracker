import { expect, test, type Page } from '@playwright/test';

async function resetApp(page: Page, seed?: () => void) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => localStorage.setItem('contraction-tracker:onboarding-seen', '1'));
  if (seed) await page.evaluate(seed);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Olive' })).toBeVisible();
}

async function expectModalDialog(page: Page, name: string | RegExp) {
  const dialog = page.getByRole('dialog', { name });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect.poll(() => page.evaluate(() => {
    const active = document.activeElement;
    const openDialog = document.querySelector('[role="dialog"][aria-modal="true"]');
    return !!active && !!openDialog && openDialog.contains(active);
  })).toBe(true);

  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => {
    const active = document.activeElement;
    const openDialog = document.querySelector('[role="dialog"][aria-modal="true"]');
    return !!active && !!openDialog && openDialog.contains(active);
  })).toBe(true);
}

test('mobile viewport permits user zoom', async ({ page }) => {
  await page.goto('/');
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).not.toMatch(/user-scalable\s*=\s*no/i);
  expect(viewport).not.toMatch(/maximum-scale\s*=\s*1(?:\.0)?(?:,|$)/i);
});

test('bottom sheets expose modal semantics and keep keyboard focus inside', async ({ page }) => {
  const sheets: Array<{ button: string | RegExp; dialog: string | RegExp }> = [
    { button: 'Settings', dialog: 'Settings' },
    { button: 'Share with partner', dialog: 'Share with partner' },
    { button: 'Hospital bag: 0/12 packed', dialog: 'Hospital bag' },
    { button: 'Exams: Log exam', dialog: 'Hospital exams' },
    { button: 'People: Add contacts', dialog: 'People' },
  ];

  for (const sheet of sheets) {
    await resetApp(page);
    await page.getByRole('button', { name: sheet.button, exact: true }).click();
    await expectModalDialog(page, sheet.dialog);
  }

  await resetApp(page, () => {
    const sessions = [
      { id: 'primary', name: 'Primary', startedAt: '2026-08-07T00:00:00.000Z', endedAt: null },
      { id: 'ended-qa', name: 'Accessibility QA', startedAt: '2026-08-07T00:00:00.000Z', endedAt: '2026-08-07T01:00:00.000Z' },
    ];
    localStorage.setItem('contraction-tracker:sessions', JSON.stringify(sessions));
    localStorage.setItem('contraction-tracker:sessions::shadow', JSON.stringify(sessions));
  });
  await page.getByRole('button', { name: 'Sessions' }).click();
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await expectModalDialog(page, /Accessibility QA/);
});

test('secondary timer control activates with Space', async ({ page }) => {
  await resetApp(page);
  const start = page.getByRole('button', { name: 'Tap to start a contraction' });
  await start.focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: /Stop/i })).toBeVisible();
});

test('onboarding step controls have at least 24 by 24 CSS pixel targets', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  for (const step of [1, 2, 3]) {
    const box = await page.getByRole('button', { name: `Go to step ${step}` }).boundingBox();
    expect(box, `step ${step} should be visible`).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(24);
    expect(box!.height).toBeGreaterThanOrEqual(24);
  }
});
