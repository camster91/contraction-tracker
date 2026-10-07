import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('review-fixture')) return;
    sessionStorage.setItem('review-fixture', '1');
    localStorage.clear();
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:muted', '1');
  });
});

test('Sessions opens in the viewport, restores focus, and switches context', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  const opener = page.getByRole('button', { name: 'Sessions', exact: true });
  await expect(opener).toContainText('Sessions');
  await opener.click();
  const sheet = page.getByRole('dialog', { name: 'Sessions', exact: true });
  await expect(sheet).toBeInViewport();
  await expect(sheet.getByRole('button', { name: 'New', exact: true })).toBeInViewport();
  await expect(sheet.getByRole('button', { name: 'Close Sessions' })).toBeInViewport();
  await expect(sheet.getByText('Current session:')).toContainText('Primary');
  await page.screenshot({ path: 'test-results/review-sessions.png' });
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await sheet.getByRole('button', { name: 'New', exact: true }).click();
  await sheet.getByLabel('Session name').fill('Example second session');
  await sheet.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(sheet).toBeHidden();
  await opener.click();
  await expect(sheet.getByText('Current session:')).toContainText('Example second session');
  await expect(opener).toContainText('Sessions');
});

test('Big Text increases the active duration without reducing the Stop target', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: /^Start/ }).first().click();
  const stop = page.getByRole('button', { name: 'Stop', exact: true });
  const duration = stop.locator('.text-6xl');
  const before = await duration.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Big text' }).click();
  await page.getByRole('button', { name: 'Close settings' }).click();
  const after = await duration.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  expect(after).toBeGreaterThan(before);
  await expect(stop).toBeInViewport();
  expect((await stop.boundingBox())!.height).toBeGreaterThanOrEqual(200);
  await page.screenshot({ path: 'test-results/review-big-text.png' });
});

for (const ageSeconds of [90, 600]) {
  test(`Cancel preserves a ${ageSeconds}s-old record and its active timer`, async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    const original = await page.evaluate(age => {
      const record = { id: 'review-record', start: new Date(Date.now() - age * 1000).toISOString(), end: new Date(Date.now() - (age - 30) * 1000).toISOString(), intensity: null, sessionId: 'primary', source: 'timer' };
      localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: [record] }));
      return record;
    }, ageSeconds);
    await page.reload();
    await waitForApp(page);
    await page.getByRole('button', { name: /^Start/ }).first().click();
    const readRecords = () => page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:v1')!).contractions);
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const initialEnd = await page.getByLabel('Edit end time').inputValue();
    await page.getByRole('button', { name: '-5s', exact: true }).click();
    await expect(page.getByLabel('Edit end time')).not.toHaveValue(initialEnd);
    expect(await readRecords()).toEqual([original]);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(await readRecords()).toEqual([original]);
    await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
    await page.reload();
    await waitForApp(page);
    expect(await readRecords()).toEqual([original]);
    await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('button', { name: '-5s', exact: true }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(async () => (await readRecords())[0].end).toBe(new Date(Date.parse(original.end) - 5000).toISOString());
    await page.reload();
    await waitForApp(page);
    expect((await readRecords())[0].end).toBe(new Date(Date.parse(original.end) - 5000).toISOString());
  });
}
