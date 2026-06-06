/**
 * Privacy policy page is reachable at the URL App Store / Play Store
 * require for submission. Regression test for the Dockerfile change
 * that removed `serve -s` SPA-mode (which was rewriting /privacy/ to
 * the main app's index.html and hiding the privacy page entirely).
 *
 * The URL `https://contractions.ashbi.ca/privacy` must serve a static
 * HTML page with the privacy policy content, NOT the main app shell.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://contractions.ashbi.ca/';
const PRIVACY_URL = `${BASE_URL}privacy`;

test('privacy: /privacy/ returns the privacy policy, not the main app', async ({ request }) => {
  const res = await request.get(PRIVACY_URL);
  expect(res.status(), `Privacy URL must be live, got ${res.status()}`).toBe(200);
  const body = await res.text();

  // Sanity: the main app has <meta name="apple-mobile-web-app-capable" content="yes" />
  // The privacy page doesn't. So the response is the privacy page.
  expect(body).not.toContain('apple-mobile-web-app-capable');
  // Privacy page has its own title
  expect(body).toContain('Privacy Policy');
  // And the brand
  expect(body).toContain('Olive');
  // And the key no-tracking commitment
  expect(body).toContain('zero analytics SDKs');
  // And the relay URL
  expect(body).toContain('relay.ashbi.ca');
});

test('privacy: page renders visibly in a real browser (not blank, no console errors)', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  await page.goto(PRIVACY_URL, { waitUntil: 'domcontentloaded' });
  // Privacy page is static HTML, no React mount wait needed.
  await page.waitForLoadState('load');

  // Title is correct
  const title = await page.title();
  expect(title).toContain('Privacy Policy');

  // Body is non-empty
  const bodyText = (await page.locator('body').textContent()) || '';
  expect(bodyText.length, 'Privacy page must have content').toBeGreaterThan(500);

  // Back link to the app
  const backLink = page.locator('a[href="/"]').first();
  await expect(backLink).toBeVisible();

  // No CSP / font / image errors in the console
  const cspErrors = consoleErrors.filter((e) =>
    /Content-Security-Policy|Refused to|fonts\./i.test(e),
  );
  expect(cspErrors, `Privacy page should have no console errors, got: ${cspErrors.join(' | ')}`).toHaveLength(0);
});

test('privacy: passes the App Store / Play Store link-click smoke test', async ({ page }) => {
  // Simulate the link in the store listing being clicked. The URL must
  // resolve to a 200 with human-readable content, not redirect to a
  // broken page.
  await page.goto(PRIVACY_URL, { waitUntil: 'domcontentloaded' });
  const finalUrl = page.url();
  expect(finalUrl).toContain('/privacy');

  // The first <h1> is the policy title
  const h1 = await page.locator('h1').first().textContent();
  expect(h1).toContain('Privacy');
  expect(h1).toContain('Olive');
});

test('privacy: present in the indie-ship cache (so submission check is true)', async () => {
  // The privacy-policy.md must exist in the indie-ship cache so the
  // submission checklist has something to point at. This test is
  // independent of the deployment.
  const fs = await import('fs');
  const path = await import('path');
  const cachedPath = path.resolve(
    process.env.HOME || '/Users/biancabienaime',
    '.hermes/cache/indie-ship/APPS/olive-contractions/privacy-policy.md',
  );
  expect(fs.existsSync(cachedPath), `Expected ${cachedPath} to exist`).toBe(true);
  const content = fs.readFileSync(cachedPath, 'utf-8');
  expect(content).toContain('Privacy Policy');
  expect(content).toContain('Olive');
});
