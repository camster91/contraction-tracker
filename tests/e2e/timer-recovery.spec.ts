import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('olive-test-initialized') === '1') return;
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('olive-test-initialized', '1');
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
  });
});

test('a timed contraction keeps its active session through reload and stop', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('contraction-tracker:sessions', JSON.stringify([
      { id: 'primary', name: 'Primary', startedAt: new Date().toISOString(), endedAt: null },
      { id: 'hospital', name: 'Hospital', startedAt: new Date().toISOString(), endedAt: null },
    ]));
    localStorage.setItem('contraction-tracker:active-session', 'hospital');
  });
  await page.goto('/');
  await waitForApp(page);

  await page.getByRole('button', { name: /^Start/ }).first().click({ force: true });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:current') || 'null')?.sessionId)).toBe('hospital');
  await page.reload();
  await waitForApp(page);
  await page.getByRole('button', { name: /^Stop/ }).first().click();

  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:v1') || '{}').contractions?.[0] ?? null)).not.toBeNull();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:v1') || '{}').contractions[0]);
  expect(stored.sessionId).toBe('hospital');
  expect(stored.source).toBe('timer');
});

test('current timer recovery is offered even when local history exists', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  await page.evaluate(async () => {
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({
      contractions: [{ id: 'old', start: new Date(Date.now() - 120_000).toISOString(), end: new Date(Date.now() - 60_000).toISOString(), sessionId: 'primary' }],
    }));
    localStorage.removeItem('contraction-tracker:current');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('olive-backup', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('history');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('history', 'readwrite');
      tx.objectStore('history').put({
        version: 1,
        savedAt: new Date().toISOString(),
        contractions: [],
        current: { id: 'recover-me', start: new Date(Date.now() - 30_000).toISOString(), end: null, sessionId: 'primary', source: 'timer' },
      }, 'current');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await waitForApp(page);
  await expect(page.getByText('In-progress timer found')).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByText('In progress')).toBeVisible();
});

test('newer IndexedDB history repairs a stale nonempty local copy', async ({ page }) => {
  // Seed from the same origin without mounting the app first. A mounted app
  // legitimately mirrors its current state to IndexedDB and can race a test
  // that writes a synthetic recovery record behind its back, especially in
  // WebKit where the initial transaction may complete later than Chromium.
  await page.goto('/privacy/');
  await page.evaluate(async () => {
    const old = { id: 'old-local', start: '2026-08-28T10:00:00.000Z', end: '2026-08-28T10:01:00.000Z', sessionId: 'primary' };
    const recovered = { id: 'new-idb', start: '2026-08-28T10:05:00.000Z', end: '2026-08-28T10:06:00.000Z', sessionId: 'primary' };
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: [old], savedAt: '2026-08-28T10:02:00.000Z' }));
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('olive-backup', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('history');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('history', 'readwrite');
      tx.objectStore('history').put({
        version: 1,
        savedAt: '2026-08-28T10:07:00.000Z',
        contractions: [old, recovered],
        current: null,
      }, 'latest');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.goto('/');
  await waitForApp(page);
  await expect.poll(() => page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('contraction-tracker:v1') || '{}');
    return stored.contractions?.map((item: { id: string }) => item.id) ?? [];
  })).toEqual(['old-local', 'new-idb']);
  await expect(page.getByText('Data restored')).toBeVisible();
});

test('an old timer from a portable backup requires explicit resume consent', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  const startedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const backup = {
    version: 1,
    app: 'olive-contraction-tracker',
    savedAt: new Date().toISOString(),
    contractions: [],
    current: { id: 'old-imported-timer', start: startedAt, end: null, sessionId: 'primary', source: 'timer' },
    sessions: [], people: [], shares: [], exams: {}, checklists: {}, laborEvents: [],
    activeSessionId: 'primary', preferences: null, birthStats: {},
  };
  await page.locator('input[type="file"]').setInputFiles({
    name: 'olive-old-timer.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });

  await expect(page.getByText('In-progress timer found')).toBeVisible();
  await expect(page.getByText('In progress')).toHaveCount(0);
  await page.getByRole('button', { name: 'Dismiss' }).filter({ hasText: 'Dismiss' }).click();
  await expect(page.getByRole('button', { name: /^Start/ }).first()).toBeVisible();
});
