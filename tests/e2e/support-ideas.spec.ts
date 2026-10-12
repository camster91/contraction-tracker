import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('support-ideas-fixture')) return;
    sessionStorage.setItem('support-ideas-fixture', '1');
    localStorage.clear();
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
  });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: 'Open birth journey' }).click();
  await page.getByRole('button', { name: /^Responsibilities/ }).click();
});

test('a support idea is an editable draft, not an automatically saved or assigned task', async ({ page }) => {
  await page.getByText('Ideas for practical help', { exact: true }).click();
  await page.getByRole('button', { name: 'Prepare a meal or snacks', exact: true }).click();
  const title = page.getByLabel('Responsibility', { exact: true });
  await expect(title).toBeFocused();
  await expect(title).toHaveValue('Prepare a meal or snacks');
  await expect(page.getByLabel('Assign to')).toHaveValue('');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('olive:journey:v1')!).responsibilities)).toEqual([]);
  await expect(page.getByRole('button', { name: 'Help with laundry or dishes' })).toBeDisabled();
  await title.fill('Bring a ready-to-eat dinner on Tuesday');
  await page.getByRole('button', { name: 'Add responsibility', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Bring a ready-to-eat dinner on Tuesday' })).toBeVisible();
  await page.reload();
  await waitForApp(page);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('olive:journey:v1')!));
  expect(stored.responsibilities).toHaveLength(1);
  expect(stored.responsibilities[0].title).toBe('Bring a ready-to-eat dinner on Tuesday');
  expect(stored.responsibilities[0].private).toBe(true);
  expect(stored.responsibilities[0].assigneePersonId).toBeUndefined();
  await expect(page.getByRole('button', { name: 'Prepare a meal or snacks' })).toHaveCount(0);
});

test('existing drafts and failed writes stay intact; ideas work offline on a narrow phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const title = page.getByLabel('Responsibility', { exact: true });
  await title.fill('My own task');
  await page.getByText('Ideas for practical help', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Prepare a meal or snacks' })).toBeDisabled();
  await expect(title).toHaveValue('My own task');
  await title.fill('');
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Help with pets or older children' }).click();
  await expect(title).toHaveValue('Help with pets or older children');
  expect(await page.getByRole('dialog', { name: 'Birth journey' }).evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.getByText('Ideas for practical help', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/support-ideas-320.png' });
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'olive:journey:v1') throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Add responsibility', exact: true }).click();
  await expect(title).toHaveValue('Help with pets or older children');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('olive:journey:v1')!).responsibilities)).toEqual([]);
});
