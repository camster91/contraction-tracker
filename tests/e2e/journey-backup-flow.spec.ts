import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
  });
});

test('backup export includes normalized v2 journey data', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('olive:journey:v1', JSON.stringify({
      schemaVersion: 1,
      profile: {
        id: 'backup-journey',
        phase: 'preparing',
        preferredName: 'Bianca',
        updatedAt: '2026-08-08T20:00:00.000Z',
      },
      responsibilities: [],
      questions: [],
      entries: [],
    }));
  });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: 'More tools' }).click();
  await page.getByRole('button', { name: /Backup: Export & restore/i }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const backup = JSON.parse(await readFile(path!, 'utf8'));

  expect(backup.version).toBe(2);
  expect(backup.journey.profile.preferredName).toBe('Bianca');
  expect(backup.journey.profile.phase).toBe('preparing');
});

test('v2 import merges journey records without overwriting healthy profile fields', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('olive:journey:v1', JSON.stringify({
      schemaVersion: 1,
      profile: {
        id: 'existing-journey',
        phase: 'preparing',
        preferredName: 'Existing name',
        updatedAt: '2026-08-08T20:00:00.000Z',
      },
      responsibilities: [],
      questions: [],
      entries: [],
    }));
  });
  await page.goto('/');
  await waitForApp(page);

  const imported = {
    version: 2,
    app: 'olive-contraction-tracker',
    savedAt: '2026-08-08T21:00:00.000Z',
    contractions: [],
    current: null,
    sessions: [],
    people: [],
    shares: [],
    exams: {},
    checklists: {},
    journey: {
      schemaVersion: 1,
      profile: {
        id: 'imported-journey',
        phase: 'postpartum',
        preferredName: 'Imported name',
        birthLocation: 'North Star Birth Centre',
        updatedAt: '2026-08-08T21:00:00.000Z',
      },
      responsibilities: [],
      questions: [{
        id: 'imported-question',
        journeyId: 'imported-journey',
        text: 'Imported provider question',
        category: 'other',
        private: true,
        pinned: false,
        notesAreProviderInstructions: false,
        createdAt: '2026-08-08T21:00:00.000Z',
        updatedAt: '2026-08-08T21:00:00.000Z',
      }],
      entries: [],
    },
  };

  await page.locator('input[type="file"]').setInputFiles({
    name: 'olive-v2.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(imported)),
  });
  await expect(page.getByText(/Imported 0 contractions/)).toBeVisible();

  const journey = await page.evaluate(() => JSON.parse(localStorage.getItem('olive:journey:v1') ?? 'null'));
  expect(journey.profile.id).toBe('existing-journey');
  expect(journey.profile.preferredName).toBe('Existing name');
  expect(journey.profile.birthLocation).toBe('North Star Birth Centre');
  expect(journey.profile.phase).toBe('preparing');
  expect(journey.questions[0].id).toBe('imported-question');
  expect(journey.questions[0].journeyId).toBe('existing-journey');
});
