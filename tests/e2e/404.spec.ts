/**
 * 404 page — confirms the static 404 page renders correctly.
 *
 * Apple App Store reviewers sometimes hit non-existent URLs in their
 * pre-submission testing (e.g., accidentally typing /privaxy instead of
 * /privacy). The 404 page is a small touch of polish that also helps
 * SEO by explicitly saying "this URL is wrong, here's the right one".
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://contractions.ashbi.ca/';

test('404 page: /404/ renders the friendly error', async ({ page }) => {
  const res = await page.goto(`${BASE_URL}404`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');

  // The 404 page exists, the response itself doesn't have to be 404 — `serve`
  // returns 200 for the static file. What matters is the content.
  expect(res, 'Response should exist').toBeTruthy();

  // Title
  const title = await page.title();
  expect(title).toContain('Page not found');

  // Body content
  const body = (await page.locator('body').textContent()) || '';
  expect(body).toContain('404');
  expect(body).toContain('That page doesn');
  expect(body).toContain('back to the timer'); // link to home

  // Links work
  const homeLink = page.locator('a[href="/"]').first();
  await expect(homeLink).toBeVisible();

  const privacyLink = page.locator('a[href="/privacy"]').first();
  await expect(privacyLink).toBeVisible();
});

test('404 page: also accessible at /404/ (with trailing slash)', async ({ page }) => {
  await page.goto(`${BASE_URL}404/`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');

  const body = (await page.locator('body').textContent()) || '';
  expect(body).toContain('404');
  expect(body).toContain('That page doesn');
});
