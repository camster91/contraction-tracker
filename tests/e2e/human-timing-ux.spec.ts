import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('human-timing-fixture')) return;
    sessionStorage.setItem('human-timing-fixture', '1');
    localStorage.clear();
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:muted', '1');
  });
});

test('legacy default session has a human name without changing its stored identity', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  await page.evaluate(() => localStorage.setItem('contraction-tracker:sessions', JSON.stringify([
    { id: 'primary', name: 'Primary', startedAt: new Date().toISOString(), endedAt: null },
  ])));
  await page.reload();
  await waitForApp(page);
  await expect(page.getByText('Session: This birth', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
  await expect(page.getByText('Current session: This birth', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:sessions')!)[0].name)).toBe('Primary');
});

test('active timing removes setup distractions and explains blocked session changes', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('navigation', { name: 'Care access' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
  await expect(page.getByText('Stop the active contraction before changing sessions. You can still view past sessions.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeInViewport({ ratio: 1 });
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New', exact: true })).toBeEnabled();
});

test('saving reserves room for Undo and hides invalid quick corrections', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-10T16:00:00Z') });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.clock.fastForward(7_000);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.getByText('Since last ended', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '−10s', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '−30s', exact: true })).toHaveCount(0);
  const main = (await page.getByRole('main').boundingBox())!;
  const feedback = (await page.getByRole('status', { name: 'Recent action' }).boundingBox())!;
  expect(main.y + main.height).toBeLessThanOrEqual(feedback.y + 1);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Start/ })).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:v1')!).contractions)).toHaveLength(0);
});

test('phone-width controls and helper text remain readable in both appearances', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await waitForApp(page);
  const opener = page.getByRole('button', { name: 'Open birth journey' });
  await expect(opener).toHaveText('Birth journey');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Daylight' }).click();
  await page.getByRole('switch', { name: 'Big text' }).click();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect(page.getByRole('button', { name: /^Start/ })).toBeInViewport({ ratio: 1 });
  await opener.click();
  const sheet = page.getByRole('dialog', { name: 'Birth journey', exact: true });
  const phase = sheet.getByRole('button', { name: 'Preparing', exact: true });
  await expect(phase).toBeInViewport({ ratio: 1 });
  const width = await sheet.evaluate(el => el.scrollWidth <= el.clientWidth);
  expect(width).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('daylight-large-text-journey.png') });
});

test('care tools remain reachable without scrolling a long contraction history', async ({ page }, testInfo) => {
  await page.goto('/');
  await waitForApp(page);
  await page.evaluate(() => {
    const now = Date.now();
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: Array.from({ length: 60 }, (_, index) => ({
      id: `review-${index}`, sessionId: 'primary', intensity: null,
      start: new Date(now - (61 - index) * 300_000).toISOString(),
      end: new Date(now - (61 - index) * 300_000 + 45_000).toISOString(),
    })) }));
  });
  await page.reload();
  await waitForApp(page);
  const opener = page.getByRole('button', { name: 'Open birth journey' });
  await expect(opener).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: testInfo.outputPath('timing-history.png') });
  await opener.click();
  await expect(page.getByRole('dialog', { name: 'Birth journey' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('journey-grouped.png') });
  await page.getByRole('button', { name: 'Close birth journey' }).click();
  await expect(opener).toBeFocused();
  await expect(opener).toBeInViewport({ ratio: 1 });
});
