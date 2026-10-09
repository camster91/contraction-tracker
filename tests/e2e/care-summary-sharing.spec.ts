import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-08T16:00:00Z') });
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: [{
      id: 'share-fixture', sessionId: 'primary', source: 'manual',
      start: '2026-10-07T14:00:00Z', end: '2026-10-07T14:01:00Z', note: 'Fabricated sharing note',
    }] }));
    const state = window as unknown as { shares: ShareData[]; clipboardWrites: string[] };
    state.shares = []; state.clipboardWrites = [];
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (payload: ShareData) => { state.shares.push(payload); } });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { state.clipboardWrites.push(text); } } });
  });
});

test('Messages/Mail payload is readable text and matches the saved summary', async ({ page }, info) => {
  await page.goto('/'); await waitForApp(page);
  await page.getByRole('button', { name: 'Share care summary' }).click();
  const payload = await page.evaluate(() => (window as unknown as { shares: ShareData[] }).shares[0]);
  expect(payload.title).toBe('Olive care summary');
  expect(payload.files).toBeUndefined();
  expect(payload.text).toContain('Completed contractions: 0');
  expect(payload.text).toContain('Average duration: not available');
  expect(payload.text).toContain('added manually');
  expect(payload.text).toContain('Timing reminders: off');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save summary' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^olive-care-summary-.*\.txt$/);
  const path = info.outputPath('saved-care-summary.txt'); await download.saveAs(path);
  expect(readFileSync(path, 'utf8')).toBe(payload.text);
});

test('canceling share does not reopen the sheet, copy data or show an error', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (payload: ShareData) => {
      (window as unknown as { shares: ShareData[] }).shares.push(payload);
      throw new DOMException('User canceled', 'AbortError');
    } });
  });
  await page.goto('/'); await waitForApp(page);
  await page.getByRole('button', { name: 'Share care summary' }).click();
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => ({ shares: (window as unknown as { shares: ShareData[] }).shares.length, copies: (window as unknown as { clipboardWrites: string[] }).clipboardWrites.length }))).toEqual({ shares: 1, copies: 0 });
  await expect(page.getByText('Could not share the care summary. Try Save summary instead.')).toHaveCount(0);
});

test('genuine sharing failure offers explicit manual copy without copying privately', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new Error('Permission denied'); } });
  });
  await page.goto('/'); await waitForApp(page);
  await page.getByRole('button', { name: 'Share care summary' }).click();
  await expect(page.getByRole('dialog', { name: /Share care summary/ })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /care summary text/i })).toHaveValue(/Completed contractions: 0/);
  expect(await page.evaluate(() => (window as unknown as { clipboardWrites: string[] }).clipboardWrites.length)).toBe(0);
});
