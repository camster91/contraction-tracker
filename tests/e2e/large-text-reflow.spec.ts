import { expect, test, type Locator, type Page } from '@playwright/test';
import { waitForApp } from './helpers';

async function openCleanApp(page: Page) {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
  });
  await page.goto('/');
  await waitForApp(page);
}

async function expectNoHorizontalPageOverflow(page: Page) {
  expect(await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))).toEqual(expect.objectContaining({
    clientWidth: await page.evaluate(() => document.documentElement.scrollWidth),
  }));
}

async function expectMinimumTarget(locator: Locator, size = 44) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(size);
  expect(box!.height).toBeGreaterThanOrEqual(size);
}

test('critical labor controls reflow at a 320 CSS-pixel viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await openCleanApp(page);

  await expectNoHorizontalPageOverflow(page);
  for (const name of ['Sessions', 'Settings']) {
    await expectMinimumTarget(page.getByRole('button', { name }));
  }

  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await expect(settings).toBeVisible();
  await expectNoHorizontalPageOverflow(page);
  const closeSettings = page.getByRole('button', { name: 'Close settings' });
  await expectMinimumTarget(closeSettings);
  await closeSettings.click();
  await expect(settings).toBeHidden();
});

test('200 percent text keeps settings and manual entry operable', async ({ page }) => {
  await openCleanApp(page);
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  await expectNoHorizontalPageOverflow(page);

  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await expect(settings).toBeVisible();
  await expectNoHorizontalPageOverflow(page);
  await page.getByRole('button', { name: 'Close settings' }).click();

  const addMissed = page.getByRole('button', { name: 'Add missed contraction' });
  await addMissed.scrollIntoViewIfNeeded();
  await addMissed.click();
  const manual = page.getByRole('dialog', { name: 'Add missed contraction' });
  await expect(manual).toBeVisible();
  await expectNoHorizontalPageOverflow(page);
  const save = page.getByRole('button', { name: 'Save manual entry' });
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport();
  await page.getByRole('button', { name: 'Close manual entry' }).click();
  await expect(manual).toBeHidden();
});
