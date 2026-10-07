import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test('brand assets are local; appearance persists without changing a running timer', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  await expect(page.getByRole('img', { name: 'Olive', exact: true })).toHaveCount(1);
  for (const file of ['wordmark.png', 'illustration-timing.webp', 'illustration-support.webp', 'illustration-care.webp', 'illustration-records.webp']) {
    const response = await page.request.get(`/branding/${file}`);
    expect(response.ok(), file).toBe(true);
  }
  const startButton = page.getByRole('button', { name: /Start Tap when it begins/i });
  const startBox = await startButton.boundingBox();
  await startButton.click();
  const stopBox = await page.getByRole('button', { name: 'Stop', exact: true }).boundingBox();
  expect(stopBox!.y).toBe(startBox!.y);
  expect(stopBox!.height).toBe(startBox!.height);
  const start = await page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:current')!).start);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Daylight', exact: true }).click();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'day');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'day');
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:current')!).start)).toBe(start);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:v1')!).contractions.length)).toBe(1);
});

test('Olive Day timer and settings pass automated accessibility and reflow', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('contraction-tracker:theme', 'cool');
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
  });
  await page.goto('/');
  await waitForApp(page);
  for (const settings of [false, true]) {
    if (settings) await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await expect(page.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', 'https://olive.ashbi.ca/privacy/');
  await expect(page.getByRole('link', { name: 'Help & support' })).toHaveAttribute('href', 'https://olive.ashbi.ca/support/');
});
