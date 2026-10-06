import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers';

const STORAGE_KEY = 'contraction-tracker:v1';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('olive-top-class-test-ready')) return;
    localStorage.clear();
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    sessionStorage.setItem('olive-top-class-test-ready', '1');
  });
});

test('labor screen keeps preparation tools behind one clear disclosure', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);

  await expect(page.getByRole('button', { name: /More tools/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Hospital bag:/i })).toBeHidden();

  await page.getByRole('button', { name: /More tools/i }).click();

  await expect(page.getByRole('button', { name: /Hospital bag:/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Exams:/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /People:/i })).toBeVisible();
});

test('frequent contractions are described without diagnosing active labor', async ({ page }) => {
  const now = Date.now();
  const contractions = [8, 4, 1].map((minutesAgo, index) => ({
    id: `frequent-${index}`,
    sessionId: 'primary',
    start: new Date(now - minutesAgo * 60_000).toISOString(),
    end: new Date(now - minutesAgo * 60_000 + 50_000).toISOString(),
  }));
  await page.addInitScript(({ key, records }) => {
    localStorage.setItem(key, JSON.stringify({ contractions: records }));
  }, { key: STORAGE_KEY, records: contractions });

  await page.goto('/');
  await waitForApp(page);

  await expect(page.getByText('Frequent contractions')).toBeVisible();
  await expect(page.getByText(/Possible active labor/i)).toHaveCount(0);
  await expect(page.getByText(/Real labor contractions/i)).toHaveCount(0);
  await expect(page.getByText('Saved care-plan reminder')).toHaveCount(0);
});

test('a sustained saved pattern exposes the user-provided care-team action', async ({ page }) => {
  const now = Date.now();
  const contractions = Array.from({ length: 11 }, (_, index) => {
    const minutesAgo = 55 - index * 5;
    return {
      id: `sustained-${index}`,
      sessionId: 'primary',
      start: new Date(now - minutesAgo * 60_000).toISOString(),
      end: new Date(now - minutesAgo * 60_000 + 60_000).toISOString(),
    };
  });
  await page.addInitScript(({ key, records }) => {
    localStorage.setItem(key, JSON.stringify({ contractions: records }));
    localStorage.setItem('contraction-tracker:care-plan', JSON.stringify({
      enabled: true, providerName: 'North Star Midwives',
      providerPhone: '+1 416 555 0142',
      intervalMinutes: 5,
      durationSeconds: 60,
      windowMinutes: 60,
    }));
  }, { key: STORAGE_KEY, records: contractions });

  await page.goto('/');
  await waitForApp(page);

  await expect(page.getByText('Saved care-plan reminder')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Call North Star Midwives' })).toHaveAttribute('href', 'tel:+14165550142');
  await expect(page.getByText(/This is not a diagnosis/i)).toBeVisible();
});

test('settings save a provider-specific contraction reminder', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: 'Settings' }).click();

  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await dialog.getByLabel('Care provider or team').fill('North Star Midwives');
  await dialog.getByLabel('Care provider phone').fill('+1 416 555 0142');
  await dialog.getByLabel('Contractions every (minutes)').fill('4');
  await dialog.getByLabel('Lasting at least (seconds)').fill('60');
  await dialog.getByLabel('For at least (minutes)').fill('45');
  await page.keyboard.press('Escape');

  await page.reload();
  await waitForApp(page);
  await page.getByRole('button', { name: 'Settings' }).click();

  await expect(page.getByRole('dialog', { name: 'Settings' }).getByLabel('Care provider or team')).toHaveValue('North Star Midwives');
  await expect(page.getByRole('dialog', { name: 'Settings' }).getByLabel('Care provider phone')).toHaveValue('+1 416 555 0142');
  await expect(page.getByRole('dialog', { name: 'Settings' }).getByLabel('Contractions every (minutes)')).toHaveValue('4');
});

test('care summary shares an objective provider-ready handoff', async ({ page }) => {
  const now = Date.now();
  const contractions = [12, 7, 2].map((minutesAgo, index) => ({
    id: `summary-${index}`,
    sessionId: 'primary',
    start: new Date(now - minutesAgo * 60_000).toISOString(),
    end: new Date(now - minutesAgo * 60_000 + 60_000).toISOString(),
    intensity: 6 + index,
  }));
  await page.addInitScript(({ key, records }) => {
    localStorage.setItem(key, JSON.stringify({ contractions: records }));
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (payload: unknown) => {
        (window as unknown as { __oliveShared: unknown }).__oliveShared = payload;
      },
    });
  }, { key: STORAGE_KEY, records: contractions });

  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: /Share care summary/i }).click();

  const shared = await page.evaluate(() => (window as unknown as { __oliveShared: { text?: string } }).__oliveShared);
  expect(shared.text).toContain('Olive care summary');
  expect(shared.text).toContain('Recent pattern');
  expect(shared.text).toContain('does not diagnose labor');
});

test('care tools remain reachable after timing and Stop is a large target', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: /Start Tap when it begins/i }).click();
  const stop = page.getByRole('button', { name: 'Stop', exact: true });
  const bounds = await stop.boundingBox();
  expect(bounds?.height).toBeGreaterThanOrEqual(76);
  expect(bounds?.width).toBeGreaterThan(200);
  await stop.click();
  await page.getByRole('button', { name: 'Open birth journey' }).click();
  await expect(page.getByRole('dialog', { name: /Birth journey/i })).toBeVisible();
  await page.getByRole('button', { name: /Close birth journey/i }).click();
  await page.getByRole('button', { name: 'More tools', exact: true }).click();
  await expect(page.getByRole('button', { name: /Hospital bag:/i })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Recent timing' })).toContainText('1 completed');
});

test('tag-filtered history keeps actual spacing and honors clock preference', async ({ page }) => {
  const now = Date.now();
  const records = [20, 15, 10].map((minutesAgo, index) => ({
    id: `spacing-${index}`, start: new Date(now - minutesAgo * 60000).toISOString(),
    end: new Date(now - minutesAgo * 60000 + 60000).toISOString(),
    tags: index === 0 ? ['pressure'] : ['back labor'],
  }));
  await page.addInitScript(({ records }) => {
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: records }));
    localStorage.setItem('contraction-tracker:hour12', '1');
  }, { records });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: 'pressure (1)', exact: true }).click();
  await expect(page.getByText(/Spacing 5:00/)).toHaveCount(0);
  const history = page.locator('main ul').last();
  await expect(history).toContainText(/AM|PM/);
  await page.getByRole('button', { name: 'back labor (2)', exact: true }).click();
  await expect(page.getByText('Spacing 5:00 · start to start')).toHaveCount(2);
});
