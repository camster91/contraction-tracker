import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://contractions.ashbi.ca/';
const SUPPORT_URL = `${BASE_URL}support/`;

test('support page is reachable and exposes contact, privacy, and urgent-care boundaries', async ({ page }) => {
  const response = await page.goto(SUPPORT_URL, { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Olive support' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Email Olive support' })).toHaveAttribute('href', /^mailto:cameron@ashbi\.ca/);
  await expect(page.getByRole('heading', { name: 'Urgent health concerns' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Common troubleshooting' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('privacy page reflects local-only records and intentional file exports', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}privacy/`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /Privacy Policy/ })).toBeVisible();
  await expect(page.getByText(/no sync server or share links/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Olive support' })).toHaveAttribute('href', '/support/');
  await expect(page.getByRole('link', { name: 'cameron@ashbi.ca' })).toHaveAttribute('href', 'mailto:cameron@ashbi.ca');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
