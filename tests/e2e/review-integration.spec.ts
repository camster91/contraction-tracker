import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:muted', '1');
  });
});

test('backup import preserves a live session created on this device', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);

  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Sessions', exact: true });
  await sheet.getByRole('button', { name: 'New', exact: true }).click();
  await sheet.getByLabel('Session name').fill('Live session');
  await sheet.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(sheet).toBeHidden();

  const backup = {
    version: 1,
    app: 'olive-contraction-tracker',
    savedAt: new Date().toISOString(),
    contractions: [{
      id: 'imported-contraction',
      sessionId: 'imported-session',
      start: '2026-10-08T12:00:00.000Z',
      end: '2026-10-08T12:01:00.000Z',
      source: 'manual',
      intensity: 5,
      note: 'Imported fixture',
    }],
    current: null,
    sessions: [{ id: 'imported-session', name: 'Imported session', createdAt: '2026-10-08T11:00:00.000Z' }],
    people: [],
    exams: {},
    checklists: {},
  };
  await page.locator('input[type="file"]').setInputFiles({
    name: 'olive-import.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });

  await expect(page.getByText(/Imported 1 contractions, 1 session/)).toBeVisible();
  const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:sessions') || '[]'));
  expect(sessions.map((session: { id: string }) => session.id)).toEqual(expect.arrayContaining(['primary', 'imported-session']));
  expect(sessions.map((session: { name: string }) => session.name)).toContain('Live session');
});

test('a valid newer Journey mirror restores before the default is persisted', async ({ page }) => {
  await page.goto('/privacy/');
  await page.evaluate(async () => {
    localStorage.removeItem('olive:journey:v1');
    localStorage.removeItem('olive:journey:v1::shadow');
    const journey = {
      schemaVersion: 1,
      profile: {
        id: 'mirror-journey',
        phase: 'postpartum',
        preferredName: 'Mirror recovery',
        updatedAt: new Date(Date.now() + 60_000).toISOString(),
      },
      responsibilities: [],
      questions: [],
      entries: [],
    };
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('olive-backup', 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('history')) request.result.createObjectStore('history');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('history', 'readwrite');
      tx.objectStore('history').put({ version: 1, savedAt: new Date().toISOString(), journey }, 'journey');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });

  await page.goto('/');
  await waitForApp(page);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('olive:journey:v1') || '{}').profile?.preferredName)).toBe('Mirror recovery');
  await page.getByRole('button', { name: 'Open birth journey' }).click();
  await expect(page.getByRole('dialog', { name: 'Birth journey' })).toContainText('Take today gently');
});
