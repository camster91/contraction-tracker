import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('approval-ux-fixture')) return;
    sessionStorage.setItem('approval-ux-fixture', '1');
    localStorage.clear();
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', 'damaged old reminder value');
    const state = window as unknown as { clipboardWrites: string[]; shareAttempts: number };
    state.clipboardWrites = []; state.shareAttempts = 0;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (text: string) => { state.clipboardWrites.push(text); },
    } });
  });
});

test('damaged retired reminder state does not block startup or timing', async ({ page }) => {
  await page.goto('/'); await waitForApp(page);
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
});

test('Stop immediately counts the new record before the next display tick', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-08T16:00:00Z') });
  await page.goto('/'); await waitForApp(page);
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.clock.pauseAt(new Date('2026-10-08T16:01:00Z'));
  // Move the clock without advancing animation frames to reproduce a stale
  // display tick at the instant Stop saves its new end timestamp.
  await page.clock.setSystemTime(new Date('2026-10-08T16:01:00.500Z'));
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Recent timing' })).toContainText('1 completed');
});

for (const failure of ['cancel', 'error']) {
  test(`backup share ${failure} leaves private data off the clipboard`, async ({ page }) => {
    await page.addInitScript((failure) => {
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
      Object.defineProperty(navigator, 'share', { configurable: true, value: async () => {
        (window as unknown as { shareAttempts: number }).shareAttempts++;
        if (failure === 'cancel') throw new DOMException('Canceled', 'AbortError');
        throw new Error('Share unavailable');
      } });
    }, failure);
    await page.goto('/'); await waitForApp(page);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: /^Share backup/ }).click();
    expect(await page.evaluate(() => (window as unknown as { clipboardWrites: string[] }).clipboardWrites)).toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { shareAttempts: number }).shareAttempts)).toBe(1);
    const error = page.getByText('Could not share the backup. Try Export backup instead.');
    if (failure === 'cancel') await expect(error).toHaveCount(0);
    else await expect(error).toBeVisible();
  });
}

test('unsupported file sharing downloads a backup without copying private text', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false });
  });
  await page.goto('/'); await waitForApp(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Share backup/ }).click();
  expect((await downloaded).suggestedFilename()).toMatch(/^olive-backup-.*\.json$/);
  expect(await page.evaluate(() => (window as unknown as { clipboardWrites: string[] }).clipboardWrites)).toEqual([]);
});

test('modal hides background controls, keeps Stop usable and restores the opener', async ({ page }) => {
  await page.goto('/'); await waitForApp(page);
  await page.getByRole('button', { name: /^Start/ }).click();
  const opener = page.getByRole('button', { name: 'Settings', exact: true });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
  await expect(page.getByRole('button', { name: 'Sessions', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Stop', exact: true })).toHaveCount(0);
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await expect(opener).toBeFocused();
  await expect(page.getByRole('button', { name: 'Sessions', exact: true })).toBeVisible();
  await page.reload(); await waitForApp(page);
  await expect(page.getByRole('list')).toContainText('Duration');
});

test('journey tool handoff restores access after changing modal sheets', async ({ page }) => {
  await page.goto('/'); await waitForApp(page);
  await page.getByRole('button', { name: 'Open birth journey', exact: true }).click();
  await page.getByRole('button', { name: /^Hospital bag/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(/Hospital bag/i);
  await expect(page.getByRole('button', { name: 'Sessions', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Birth journey', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close birth journey', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Start/ })).toBeVisible();
});
