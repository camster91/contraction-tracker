import { test, expect, type Page } from '@playwright/test';
import { waitForApp } from './helpers';

async function editNote(page: Page, note: string) {
  await page.getByRole('button', { name: 'Edit' }).first().click();
  await page.getByText('Optional details').click();
  await page.getByRole('textbox', { name: 'Note (optional)' }).fill(note);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
}

test('cross-tab sync propagates notes and allows an intentional reversion', async ({ page }) => {
  const context = page.context();
  await context.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: [{
      id: 'sync-note-fixture',
      sessionId: 'primary',
      source: 'manual',
      start: '2026-10-07T14:00:00Z',
      end: '2026-10-07T14:01:00Z',
      note: 'initial fabricated note',
    }] }));
  });
  const secondTab = await context.newPage();

  await page.goto('/');
  await secondTab.goto('/');
  await Promise.all([waitForApp(page), waitForApp(secondTab)]);

  await editNote(page, 'first fabricated note');
  await expect(secondTab.getByText(/— first fabricated note/)).toBeVisible();

  await editNote(page, 'second fabricated note');
  await expect(secondTab.getByText(/— second fabricated note/)).toBeVisible();

  // Returning to the first value is a real edit, not a duplicate echo. The
  // receiver must accept it even though that hash was seen earlier.
  await editNote(page, 'first fabricated note');
  await expect(secondTab.getByText(/— first fabricated note/)).toBeVisible();
  await expect(secondTab.getByText(/— second fabricated note/)).toHaveCount(0);

  await secondTab.close();
});
