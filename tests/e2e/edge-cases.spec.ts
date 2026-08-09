import { expect, test, type Page } from '@playwright/test';
import { waitForApp } from './helpers';

const STORAGE_KEY = 'contraction-tracker:v1';

async function loadPattern(page: Page, durationSeconds: number, count = 11) {
  await page.goto('/');
  await waitForApp(page);
  await page.evaluate(({ key, duration, recordCount }) => {
    const now = Date.now();
    const contractions = Array.from({ length: recordCount }, (_, index) => {
      const minutesAgo = 55 - index * 5;
      const start = now - minutesAgo * 60_000;
      return {
        id: `edge-${index}`,
        sessionId: 'primary',
        start: new Date(start).toISOString(),
        end: new Date(start + duration * 1000).toISOString(),
      };
    });
    localStorage.setItem(key, JSON.stringify({ contractions }));
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
  }, { key: STORAGE_KEY, duration: durationSeconds, recordCount: count });
  await page.reload();
  await waitForApp(page);
}

test('edit: shortening enough records removes the sustained reminder', async ({ page }) => {
  await loadPattern(page, 60);
  await expect(page.getByText('Saved care-plan reminder')).toBeVisible();

  await page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{"contractions":[]}');
    for (const contraction of stored.contractions.slice(-3)) {
      contraction.end = new Date(new Date(contraction.start).getTime() + 5_000).toISOString();
    }
    localStorage.setItem(key, JSON.stringify(stored));
  }, STORAGE_KEY);
  await page.reload();
  await waitForApp(page);

  await expect(page.getByText('Saved care-plan reminder')).toHaveCount(0);
});

test('edit: lengthening a sustained pattern activates the saved reminder', async ({ page }) => {
  await loadPattern(page, 5);
  await expect(page.getByText('Saved care-plan reminder')).toHaveCount(0);

  await page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{"contractions":[]}');
    for (const contraction of stored.contractions) {
      contraction.end = new Date(new Date(contraction.start).getTime() + 80_000).toISOString();
    }
    localStorage.setItem(key, JSON.stringify(stored));
  }, STORAGE_KEY);
  await page.reload();
  await waitForApp(page);

  await expect(page.getByText('Saved care-plan reminder')).toBeVisible();
});

test('edit: deleting enough records removes the sustained reminder', async ({ page }) => {
  await loadPattern(page, 60);
  await expect(page.getByText('Saved care-plan reminder')).toBeVisible();

  await page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{"contractions":[]}');
    stored.contractions = stored.contractions.slice(0, -3);
    localStorage.setItem(key, JSON.stringify(stored));
  }, STORAGE_KEY);
  await page.reload();
  await waitForApp(page);

  await expect(page.getByText('Saved care-plan reminder')).toHaveCount(0);
});

test('edit: records outside the saved window do not trigger a reminder', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  await page.evaluate((key) => {
    const now = Date.now();
    const contractions = Array.from({ length: 11 }, (_, index) => {
      const start = now - (120 - index * 5) * 60_000;
      return {
        id: `old-${index}`,
        sessionId: 'primary',
        start: new Date(start).toISOString(),
        end: new Date(start + 60_000).toISOString(),
      };
    });
    localStorage.setItem(key, JSON.stringify({ contractions }));
  }, STORAGE_KEY);
  await page.reload();
  await waitForApp(page);

  await expect(page.getByText('Saved care-plan reminder')).toHaveCount(0);
});
