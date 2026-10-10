import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

const person = {
  id: 'care-contact-fixture',
  name: 'Fabricated Support Person',
  relationship: 'partner',
  email: 'support@example.invalid',
  createdAt: '2026-10-07T13:00:00.000Z',
};

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-08T16:00:00Z') });
  await page.addInitScript((fixture) => {
    localStorage.clear();
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: [{
      id: 'share-contact-fixture',
      sessionId: 'primary',
      source: 'manual',
      start: '2026-10-07T14:00:00Z',
      end: '2026-10-07T14:01:00Z',
      note: 'Fabricated sharing note',
    }] }));
    localStorage.setItem('contraction-tracker:people', JSON.stringify([fixture]));
    const state = window as unknown as { shares: number; clipboardWrites: string[] };
    state.shares = 0;
    state.clipboardWrites = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => { state.clipboardWrites.push(text); } },
    });
  }, person);
});

test('cancelling a care-contact share does not copy the private update', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => {
        (window as unknown as { shares: number }).shares += 1;
        throw new DOMException('User canceled', 'AbortError');
      },
    });
  });

  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: 'Care contacts' }).click();
  await page.getByRole('button', { name: `Share update for ${person.name}` }).click();
  await page.waitForTimeout(150);

  await expect.poll(() => page.evaluate(() => ({
    shares: (window as unknown as { shares: number }).shares,
    copies: (window as unknown as { clipboardWrites: string[] }).clipboardWrites.length,
  }))).toEqual({ shares: 1, copies: 0 });
  await expect(page.getByText(/copied to clipboard/)).toHaveCount(0);
});

test('without Web Share, a successful clipboard copy is reported', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  });

  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: 'Care contacts' }).click();
  await page.getByRole('button', { name: `Share update for ${person.name}` }).click();

  await expect(page.getByText(`Update for ${person.name} copied to clipboard`)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { clipboardWrites: string[] }).clipboardWrites[0])).toContain('1 contraction so far');
});
