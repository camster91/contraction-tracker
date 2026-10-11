import { expect, test, type Page } from '@playwright/test';
import { waitForApp } from './helpers';

async function resetApp(page: Page, seed?: () => void) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => localStorage.setItem('contraction-tracker:onboarding-seen', '1'));
  if (seed) await page.evaluate(seed);
  await page.reload({ waitUntil: 'domcontentloaded' });
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
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).not.toMatch(/user-scalable\s*=\s*no/i);
  expect(viewport).not.toMatch(/maximum-scale\s*=\s*1(?:\.0)?(?:,|$)/i);
});

test('bottom sheets expose modal semantics and keep keyboard focus inside', async ({ page }) => {
  const sheets: Array<{ button: string | RegExp; dialog: string | RegExp }> = [
    { button: 'Settings', dialog: 'Settings' },
    { button: /Hospital bag/, dialog: 'Hospital bag' },
    { button: /Exams/, dialog: 'Exams' },
    { button: 'Care contacts', dialog: 'Care contacts' },
  ];

  for (const sheet of sheets) {
    await resetApp(page);
    if (/Hospital bag|Exams/.test(String(sheet.button))) {
      await page.getByRole('button', { name: 'Open birth journey' }).click();
    }
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

test('primary timer control activates with Space', async ({ page }) => {
  await resetApp(page);
  const start = page.getByRole('button', { name: /Start Tap when it begins/i });
  await start.focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: /Stop/i })).toBeVisible();
});

test('help tips have clear navigation, usable targets, and persistent dismissal', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Tip 1 of 2', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/help-tip-one.png' });
  const next = page.getByRole('button', { name: 'Next', exact: true });
  await next.click();
  await expect(page.getByText('Tip 2 of 2', { exact: true })).toBeVisible();
  await expect(page.getByText('Keep or share your timing', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/help-tip-two.png' });
  for (const label of ['Back', 'Got it']) {
    const box = await page.getByRole('button', { name: label, exact: true }).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByText('Tip 1 of 2', { exact: true })).toBeVisible();
  await next.click();
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await expect(next).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Start/ })).toBeVisible();
});
