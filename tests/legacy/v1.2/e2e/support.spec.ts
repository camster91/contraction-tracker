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

test('privacy page matches current sharing, attachment, support, and safety boundaries', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}privacy/`, { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Olive Privacy Policy' })).toBeVisible();
  await expect(page.getByText(/Effective September 1, 2026/)).toBeVisible();
  await expect(page.getByText(/legacy photo or voice-memo attachments/).first()).toBeVisible();
  await expect(page.getByText(/preview before sending/)).toBeVisible();
  await expect(page.getByRole('link', { name: /contractions\.ashbi\.ca\/support/ })).toHaveAttribute('href', '/support');
  await expect(page.getByText(/not a medical device/)).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('Canadian French support preserves contact, privacy, and urgent-care boundaries', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}fr-ca/support/`, { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr-CA');
  await expect(page.getByRole('heading', { name: 'Soutien Olive' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Écrire au soutien Olive' })).toHaveAttribute('href', 'mailto:cameron@ashbi.ca?subject=Soutien%20Olive');
  await expect(page.getByText(/n’est ni un service d’urgence ni un service clinique/)).toBeVisible();
  await expect(page.getByText(/communiquez avec votre équipe de soins ou les services d’urgence locaux/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Politique de confidentialité' })).toHaveAttribute('href', '/fr-ca/privacy/');
  await expect(page.getByRole('link', { name: 'English' })).toHaveAttribute('href', '/support/');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('Canadian French privacy preserves effective date, sharing disclosures, and safety boundaries', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}fr-ca/privacy/`, { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr-CA');
  await expect(page.getByRole('heading', { name: 'Olive Politique de confidentialité' })).toBeVisible();
  await expect(page.getByText(/En vigueur 1er septembre 2026/)).toBeVisible();
  await expect(page.getByText(/pièces jointes héritées sous forme de photo ou de mémo vocal/)).toBeVisible();
  await expect(page.getByText(/un aperçu avant l’envoi/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'cameron@ashbi.ca' })).toHaveAttribute('href', 'mailto:cameron@ashbi.ca');
  await expect(page.getByText(/Olive ne diagnostique pas le travail/)).toBeVisible();
  await expect(page.getByText(/services d’urgence locaux si vous avez besoin d’une aide urgente/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'English' })).toHaveAttribute('href', '/privacy/');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
