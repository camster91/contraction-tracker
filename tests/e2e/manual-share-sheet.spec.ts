import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

const person = {
  id: 'manual-share-contact-fixture',
  name: 'Fabricated Support Person',
  relationship: 'partner',
  createdAt: '2026-10-07T13:00:00.000Z',
};

test('a failed contact share opens an explicit selectable copy sheet', async ({ page }) => {
  await page.addInitScript((fixture) => {
    localStorage.clear();
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: [{
      id: 'manual-share-fixture',
      sessionId: 'primary',
      source: 'manual',
      start: '2026-10-07T14:00:00Z',
      end: '2026-10-07T14:01:00Z',
    }] }));
    localStorage.setItem('contraction-tracker:people', JSON.stringify([fixture]));
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => { throw new Error('Share surface unavailable'); },
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => { throw new Error('Clipboard unavailable'); } },
    });
  }, person);

  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: 'Care contacts' }).click();
  await page.getByRole('button', { name: `Share update for ${person.name}` }).click();

  await expect(page.getByRole('dialog', { name: /Share update for Fabricated Support Person/ })).toBeVisible();
  const shareText = page.getByRole('textbox', { name: /update for Fabricated Support Person text/i });
  await expect(shareText).toHaveValue(/1 contraction so far/);
  await page.getByRole('button', { name: 'Select all' }).click();
  await expect(page.getByRole('status')).toContainText('Text selected');
  await page.getByRole('button', { name: 'Close share text' }).click();
  await expect(page.getByRole('dialog', { name: 'Care contacts' })).toBeVisible();
});
