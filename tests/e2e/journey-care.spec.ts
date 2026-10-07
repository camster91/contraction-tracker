import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
  });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: /open birth journey/i }).click();
});

test('care card saves optional parent-owned details across reload', async ({ page }) => {
  const journey = page.getByRole('dialog', { name: 'Birth journey' });
  await journey.getByRole('button', { name: 'Care card' }).click();

  await page.getByLabel('Preferred name').fill('Bianca');
  await page.getByLabel('Pronouns').fill('she/her');
  await page.getByLabel('Estimated due date').fill('2026-09-01');
  await page.getByLabel('Birth location').fill('North Star Birth Centre');
  await page.getByLabel('Important notes entered by you').fill('Allergic to latex');
  await page.getByRole('button', { name: 'Save care card' }).click();
  await expect(page.getByText('Care card saved on this device')).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.getByRole('button', { name: /open birth journey/i }).click();
  await page.getByRole('dialog', { name: 'Birth journey' }).getByRole('button', { name: 'Care card' }).click();
  await expect(page.locator('pre')).toContainText('Name: Bianca');
  await page.getByRole('button', { name: 'Edit care card' }).click();
  await expect(page.getByLabel('Preferred name')).toHaveValue('Bianca');
  await expect(page.getByLabel('Birth location')).toHaveValue('North Star Birth Centre');
  await expect(page.getByLabel('Important notes entered by you')).toHaveValue('Allergic to latex');
});

test('provider question remains private and can be marked asked', async ({ page }) => {
  const journey = page.getByRole('dialog', { name: 'Birth journey' });
  await journey.getByRole('button', { name: 'Provider questions' }).click();
  await page.getByLabel('Question for your provider').fill('What should I bring?');
  await page.getByLabel('Question category').selectOption('birth');
  await page.getByRole('button', { name: 'Add question' }).click();

  const question = page.getByRole('article', { name: 'What should I bring?' });
  await expect(question.getByText('Private')).toBeVisible();
  await question.getByRole('button', { name: 'Mark asked' }).click();
  await expect(question.getByRole('button', { name: 'Reopen question' })).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('olive:journey:v1') ?? 'null'));
  expect(stored.questions).toHaveLength(1);
  expect(stored.questions[0].private).toBe(true);
  expect(stored.questions[0].askedAt).toBeTruthy();
});

test('care-card copy contains facts and a non-diagnostic boundary', async ({ page }) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => { (window as unknown as { __copiedText: string }).__copiedText = text; } },
    });
  });
  const journey = page.getByRole('dialog', { name: 'Birth journey' });
  await journey.getByRole('button', { name: 'Care card' }).click();
  await page.getByLabel('Preferred name').fill('Bianca');
  await page.getByLabel('Birth location').fill('North Star Birth Centre');
  await page.getByRole('button', { name: 'Save care card' }).click();
  await page.getByRole('button', { name: 'Copy care card' }).click();

  const clipboard = await page.evaluate(() => (window as unknown as { __copiedText: string }).__copiedText);
  expect(clipboard).toContain('Bianca');
  expect(clipboard).toContain('North Star Birth Centre');
  expect(clipboard).toContain('does not diagnose labor');
});
