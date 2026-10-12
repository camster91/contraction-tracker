import { test, expect, type Page } from '@playwright/test';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('pregnancy-planner-fixture')) return;
    sessionStorage.setItem('pregnancy-planner-fixture', '1');
    localStorage.clear();
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
  });
});

async function openPlanner(page: Page) {
  await page.getByRole('button', { name: 'Open birth journey' }).click();
  await page.getByRole('button', { name: /^Pregnancy planner/ }).click();
  await expect(page.getByRole('heading', { name: 'Pregnancy planner' })).toBeVisible();
}

test('early pregnancy needs no due date and chosen questions persist only once', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  await openPlanner(page);
  await expect(page.getByText('A due date and a complete plan are optional.', { exact: false })).toBeVisible();
  await page.getByText('Ideas for your first conversation', { exact: true }).click();
  const question = 'Who should I contact if I am worried between appointments?';
  await page.getByRole('button', { name: `Save question: ${question}`, exact: true }).click();
  await expect(page.getByRole('button', { name: `Saved: ${question}`, exact: true })).toBeDisabled();
  await page.reload();
  await waitForApp(page);
  await openPlanner(page);
  await page.getByText('Ideas for your first conversation', { exact: true }).click();
  await expect(page.getByRole('button', { name: `Saved: ${question}`, exact: true })).toBeDisabled();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('olive:journey:v1')!));
  expect(stored.questions.filter((item: {text: string}) => item.text === question)).toHaveLength(1);
  expect(stored.profile.phase).toBe('preparing');
  expect(stored.profile.estimatedDueDate).toBeUndefined();
});

test('appointments save through the planner, survive reload, and appear as the next visit', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-11T16:00:00Z') });
  await page.goto('/');
  await waitForApp(page);
  await openPlanner(page);
  await page.getByRole('button', { name: /^Appointments & notes/ }).click();
  await page.getByLabel('Timeline entry', { exact: true }).fill('First prenatal conversation');
  await page.getByLabel('Date and time', { exact: true }).fill('2026-10-20T10:30');
  await page.getByRole('button', { name: 'Add to timeline', exact: true }).click();
  await page.reload();
  await waitForApp(page);
  await openPlanner(page);
  await expect(page.getByRole('button', { name: /^Appointments & notes/ })).toContainText('First prenatal conversation');
});

test('rejected question save keeps the prompt available and does not claim success', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  await openPlanner(page);
  await page.getByText('Ideas for your first conversation', { exact: true }).click();
  const before = await page.evaluate(() => localStorage.getItem('olive:journey:v1'));
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'olive:journey:v1') throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  const save = page.getByRole('button', { name: /^Save question: Who should/ });
  await save.click();
  await expect(page.getByRole('status').filter({ hasText: 'Could not save this question.' })).toBeVisible();
  await expect(save).toBeEnabled();
  expect(await page.evaluate(() => localStorage.getItem('olive:journey:v1'))).toBe(before);
});

test('planner is readable on a narrow phone and offline, with real paths to care details', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await waitForApp(page);
  await page.context().setOffline(true);
  await openPlanner(page);
  const dialog = page.getByRole('dialog', { name: 'Birth journey' });
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/pregnancy-planner-320.png' });
  await page.getByText('Ideas for your first conversation', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/pregnancy-planner-prompts-320.png' });
  await page.getByRole('button', { name: 'Your pregnancy details', exact: false }).click();
  await expect(page.getByLabel('Estimated due date')).toBeVisible();
  await page.getByRole('button', { name: 'Back to birth journey' }).click();
  await page.getByRole('button', { name: /^Pregnancy planner/ }).click();
  await page.getByRole('button', { name: 'Save care-team contact', exact: true }).click();
  await expect(page.getByLabel('Care provider or team')).toBeVisible();
  await expect(page.getByLabel('Contractions every (minutes)', { exact: false })).toHaveCount(0);
  await page.getByLabel('Care provider or team').fill('Example prenatal team');
  // The shipped app uses packaged assets. This HTTP harness proves offline
  // interaction/write behavior, then reopens online to check persistence.
  await page.context().setOffline(false);
  await page.reload();
  await waitForApp(page);
  await openPlanner(page);
  await page.getByRole('button', { name: 'Save care-team contact', exact: true }).click();
  await expect(page.getByLabel('Care provider or team')).toHaveValue('Example prenatal team');
});

test('Lull handoff is explicit, postpartum-only, and sends no record data in its link', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: 'Open birth journey' }).click();
  const link = page.getByRole('link', { name: 'Open Lull website', exact: true });
  await expect(link).toHaveCount(0);
  await page.getByRole('button', { name: 'Postpartum', exact: true }).click();
  await expect(link).toHaveAttribute('href', 'https://lull.ashbi.ca');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.getByText('Opening Lull does not transfer your Olive records. You choose what to enter there.')).toBeVisible();
  await page.getByText('Opening Lull does not transfer your Olive records. You choose what to enter there.').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/olive-lull-handoff.png' });
});
