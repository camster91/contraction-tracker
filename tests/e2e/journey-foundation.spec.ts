import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
  });
});

test('journey foundation creates a private preparing record', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('olive:journey:v1') ?? 'null'));
  expect(stored.schemaVersion).toBe(1);
  expect(stored.profile.phase).toBe('preparing');
  expect(stored.responsibilities).toEqual([]);
  expect(stored.questions).toEqual([]);
  expect(stored.entries).toEqual([]);

  await expect.poll(async () => page.evaluate(() => new Promise<string | null>((resolve) => {
    const request = indexedDB.open('olive-backup', 1);
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const get = request.result.transaction('history', 'readonly').objectStore('history').get('journey');
      get.onerror = () => resolve(null);
      get.onsuccess = () => resolve(get.result?.journey?.profile?.phase ?? null);
    };
  }))).toBe('preparing');
});

test('Today panel exposes one calm next action without displacing the timer', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);

  const start = page.getByRole('button', { name: /tap when it begins/i });
  const journey = page.getByRole('button', { name: /open birth journey/i });
  await expect(start).toBeVisible();
  await expect(journey).toBeVisible();
  await expect(page.getByText('Prepare for what’s next')).toBeVisible();

  const startBox = await start.boundingBox();
  const journeyBox = await journey.boundingBox();
  expect(startBox).not.toBeNull();
  expect(journeyBox).not.toBeNull();
  expect(startBox!.y).toBeLessThan(journeyBox!.y);
});

test('journey phase changes only after an explicit selection and survives reload', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);

  await page.getByRole('button', { name: /open birth journey/i }).click();
  const dialog = page.getByRole('dialog', { name: 'Birth journey' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Postpartum' }).click();
  await expect(dialog.getByText('First 12 weeks', { exact: true }).first()).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('olive:journey:v1') ?? 'null'));
  expect(stored.profile.phase).toBe('postpartum');
  await expect(page.getByText('Take today gently')).toBeVisible();
});

test('malformed journey storage recovers without changing contraction data', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('olive:journey:v1', JSON.stringify({
      profile: { phase: 'diagnosed-labor' },
      responsibilities: 'bad',
    }));
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({
      contractions: [{
        id: 'safe-contraction',
        sessionId: 'primary',
        start: '2026-08-08T20:00:00.000Z',
        end: '2026-08-08T20:01:00.000Z',
      }],
    }));
  });

  await page.goto('/');
  await waitForApp(page);

  const state = await page.evaluate(() => ({
    journey: JSON.parse(localStorage.getItem('olive:journey:v1') ?? 'null'),
    contractions: JSON.parse(localStorage.getItem('contraction-tracker:v1') ?? 'null'),
  }));
  expect(state.journey.profile.phase).toBe('preparing');
  expect(state.journey.responsibilities).toEqual([]);
  expect(state.contractions.contractions[0].id).toBe('safe-contraction');
});

test('journey storage restores the valid shadow when the primary JSON is corrupted', async ({ page }) => {
  await page.addInitScript(() => {
    const validShadow = {
      schemaVersion: 1,
      profile: {
        id: 'shadow-journey',
        phase: 'postpartum',
        preferredName: 'Bianca',
        updatedAt: '2026-08-08T20:00:00.000Z',
      },
      responsibilities: [],
      questions: [],
      entries: [],
    };
    localStorage.setItem('olive:journey:v1', '{broken-json');
    localStorage.setItem('olive:journey:v1::shadow', JSON.stringify(validShadow));
  });

  await page.goto('/');
  await waitForApp(page);

  const journey = await page.evaluate(() => JSON.parse(localStorage.getItem('olive:journey:v1') ?? 'null'));
  expect(journey.profile.id).toBe('shadow-journey');
  expect(journey.profile.phase).toBe('postpartum');
  expect(journey.profile.preferredName).toBe('Bianca');
});
