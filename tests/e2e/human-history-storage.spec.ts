import { expect, test, type Page } from '@playwright/test';
import { waitForApp } from './helpers';

const HISTORY_KEY = 'contraction-tracker:v1';

function seedHistory(page: Page, includeRecord = true) {
  return page.addInitScript((withRecord: boolean) => {
    localStorage.clear();
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:muted', '1');
    const now = Date.now();
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({
      contractions: withRecord ? [{
          id: 'history-storage-record',
          start: new Date(now - 120_000).toISOString(),
          end: new Date(now - 60_000).toISOString(),
          intensity: null,
          sessionId: 'primary',
          source: 'timer',
        }] : [],
    }));
  }, includeRecord);
}

async function readHistory(page: Page) {
  return page.evaluate((key: string) => localStorage.getItem(key), HISTORY_KEY);
}

async function readCurrent(page: Page) {
  return page.evaluate(() => localStorage.getItem('contraction-tracker:current'));
}

async function failHistoryWrites(page: Page, initiallyFailing = true) {
  await page.evaluate((fail: boolean) => {
    const state = window as unknown as { __oliveFailHistoryWrites?: boolean };
    state.__oliveFailHistoryWrites = fail;
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === 'contraction-tracker:v1' && (window as unknown as { __oliveFailHistoryWrites?: boolean }).__oliveFailHistoryWrites) {
        throw new DOMException('Storage is full', 'QuotaExceededError');
      }
      originalSetItem.call(this, key, value);
    };
  }, initiallyFailing);
}

test('failed history edit keeps the draft open and the original record persisted', async ({ page }) => {
  await seedHistory(page);
  await page.goto('/');
  await waitForApp(page);

  const before = await readHistory(page);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByText('Optional details', { exact: true }).click();
  await page.getByLabel('Note (optional)').fill('Draft must stay visible after quota failure');
  await failHistoryWrites(page);

  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  await expect(page.getByLabel('Note (optional)')).toHaveValue('Draft must stay visible after quota failure');
  await expect.poll(() => readHistory(page)).toBe(before);
});

test('failed history delete leaves the record and does not create undo state', async ({ page }) => {
  await seedHistory(page);
  await page.goto('/');
  await waitForApp(page);

  const before = await readHistory(page);
  await failHistoryWrites(page);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toHaveCount(0);
  await expect.poll(() => readHistory(page)).toBe(before);
});

test('failed history undo leaves the deletion and undo action available', async ({ page }) => {
  await seedHistory(page);
  await page.goto('/');
  await waitForApp(page);

  await failHistoryWrites(page, false);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
  const deletedHistory = await readHistory(page);

  await page.evaluate(() => {
    (window as unknown as { __oliveFailHistoryWrites?: boolean }).__oliveFailHistoryWrites = true;
  });
  await page.getByRole('button', { name: 'Undo', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
  await expect.poll(() => readHistory(page)).toBe(deletedHistory);
});

test('failed timer start leaves history and active-session storage unchanged', async ({ page }) => {
  await seedHistory(page, false);
  await page.goto('/');
  await waitForApp(page);

  const beforeHistory = await readHistory(page);
  const beforeCurrent = await readCurrent(page);
  await failHistoryWrites(page);
  await page.getByRole('button', { name: /^Start/ }).click();

  await expect(page.getByRole('button', { name: /^Start/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toHaveCount(0);
  expect(await readHistory(page)).toBe(beforeHistory);
  expect(await readCurrent(page)).toBe(beforeCurrent);
});

test('starting the next contraction dismisses the previous stop undo', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-10T16:00:00Z') });
  await seedHistory(page, false);
  await page.goto('/');
  await waitForApp(page);

  await page.getByRole('button', { name: /^Start/ }).click();
  await page.clock.fastForward(7_000);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible();

  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toHaveCount(0);
  expect(JSON.parse((await readCurrent(page))!)).toMatchObject({ end: null });
});

test('stop undo remains available beyond five seconds until explicitly used', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-10T16:00:00Z') });
  await seedHistory(page, false);
  await page.goto('/');
  await waitForApp(page);

  await page.getByRole('button', { name: /^Start/ }).click();
  await page.clock.fastForward(7_000);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible();

  await page.clock.fastForward(6_000);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Start/ })).toBeVisible();
  expect(JSON.parse((await readHistory(page))!).contractions).toHaveLength(0);
});
