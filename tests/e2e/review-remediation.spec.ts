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
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  const opener = page.getByRole('button', { name: 'Sessions', exact: true });
  await expect(opener).toContainText('Sessions');
  await opener.click();
  const sheet = page.getByRole('dialog', { name: 'Sessions', exact: true });
  await expect(sheet).toBeInViewport();
  await expect(sheet.getByRole('button', { name: 'New', exact: true })).toBeInViewport();
  await expect(sheet.getByRole('button', { name: 'Close Sessions' })).toBeInViewport();
  await expect(sheet.getByText('Current session:')).toContainText('This birth');
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
  // The background is intentionally unavailable while a modal is open.
  await page.keyboard.press('Escape');
  await expect(opener).toContainText('Sessions');
});

test('Big Text increases the active duration without reducing the Stop target', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
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
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    const original = await page.evaluate(age => {
      const record = { id: 'review-record', start: new Date(Date.now() - age * 1000).toISOString(), end: new Date(Date.now() - (age - 30) * 1000).toISOString(), intensity: null, sessionId: 'primary', source: 'timer' };
      localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: [record] }));
      return record;
    }, ageSeconds);
    await page.reload({ waitUntil: 'domcontentloaded' });
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
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    expect(await readRecords()).toEqual([original]);
    await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('button', { name: '-5s', exact: true }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(async () => (await readRecords())[0].end).toBe(new Date(Date.parse(original.end) - 5000).toISOString());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    expect((await readRecords())[0].end).toBe(new Date(Date.parse(original.end) - 5000).toISOString());
  });
}

test('one Stop remains reachable while editing history and inside an open sheet', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.evaluate(() => {
    const now = Date.now();
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: [{ id: 'previous', start: new Date(now - 600000).toISOString(), end: new Date(now - 570000).toISOString(), intensity: null, sessionId: 'primary', source: 'timer' }] }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.getByRole('button', { name: /^Start/ }).first().click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const stop = page.getByRole('button', { name: 'Stop', exact: true });
  await expect(stop).toHaveCount(1);
  await expect(stop).toHaveClass(/active-timer-dock/);
  await expect(stop).toBeInViewport({ ratio: 1 });
  const engine = testInfo.project.name.includes('webkit') ? 'webkit' : 'chromium';
  await page.screenshot({ path: `test-results/round2-${engine}-history-stop.png` });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await expect(settings.getByRole('button', { name: 'Stop', exact: true })).toHaveCount(1);
  await expect(stop).toBeInViewport({ ratio: 1 });
  const box = (await stop.boundingBox())!;
  const sheetBox = (await settings.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(sheetBox.y);
  expect(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('[data-active-timer-stop]'), { x: box.x + box.width / 2, y: box.y + box.height / 2 })).toBe(true);
  await page.screenshot({ path: `test-results/round2-${engine}-sheet-stop.png` });
  await stop.focus();
  await page.keyboard.press('Tab');
  expect(await settings.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await stop.click();
  await expect(stop).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:v1')!).contractions.length)).toBe(2);
  await expect(settings).toBeVisible();
  expect(await settings.evaluate(el => el.contains(document.activeElement))).toBe(true);
});

test('Stop and sheet Close remain separate reachable targets in landscape', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.getByRole('button', { name: /^Start/ }).first().click();
  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Sessions', exact: true });
  const stop = sheet.getByRole('button', { name: 'Stop', exact: true });
  const close = sheet.getByRole('button', { name: 'Close Sessions' });
  await expect(stop).toBeInViewport({ ratio: 1 });
  await expect(close).toBeInViewport({ ratio: 1 });
  const stopBox = (await stop.boundingBox())!;
  const closeBox = (await close.boundingBox())!;
  expect(stopBox.y + stopBox.height).toBeLessThanOrEqual(closeBox.y);
  await close.click();
  await expect(sheet).toBeHidden();
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeInViewport({ ratio: 1 });
});

test('exam measurements start blank, preserve unknowns and reset for each new exam', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.getByRole('button', { name: 'Open birth journey' }).click();
  await page.getByRole('button', { name: /Exams/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Exams' });
  await sheet.getByRole('button', { name: 'Log exam' }).click();
  await expect(sheet.getByLabel('Dilation (cm)')).toHaveValue('');
  await expect(sheet.getByLabel('Effacement (%)')).toHaveValue('');
  await expect(sheet.getByRole('combobox', { name: 'Station', exact: true })).toHaveValue('');
  const save = sheet.getByRole('button', { name: 'Save exam' });
  await expect(save).toBeDisabled();
  const engine = testInfo.project.name.includes('webkit') ? 'webkit' : 'chromium';
  await page.screenshot({ path: `test-results/round2-${engine}-blank-exam.png` });
  await sheet.getByLabel('Dilation (cm)').fill('0');
  await expect(save).toBeEnabled();
  await save.click();
  const records = () => page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:cervical-exams:primary')!));
  await expect.poll(async () => (await records()).length).toBe(1);
  expect((await records())[0]).toMatchObject({ dilationCm: 0, effacementPct: null, station: null });
  await sheet.getByRole('button', { name: 'Log exam' }).click();
  await expect(sheet.getByLabel('Dilation (cm)')).toHaveValue('');
  await expect(save).toBeDisabled();
  await sheet.getByLabel('Effacement (%)').fill('101');
  await expect(save).toBeDisabled();
  await sheet.getByLabel('Effacement (%)').fill('50');
  await sheet.getByRole('combobox', { name: 'Station', exact: true }).selectOption('0');
  await save.click();
  await expect.poll(async () => (await records()).length).toBe(2);
  expect((await records())[1]).toMatchObject({ dilationCm: null, effacementPct: 50, station: 0 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  expect((await records())[0]).toMatchObject({ dilationCm: 0, effacementPct: null, station: null });
});
