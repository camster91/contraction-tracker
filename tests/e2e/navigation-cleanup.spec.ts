import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

const output = '/Users/Cameron/Documents/Codex/2026-10-05/let-s-work-on-the-olive/outputs/remediation-round-3';
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('navigation-fixture')) return;
    sessionStorage.setItem('navigation-fixture', '1');
    localStorage.clear();
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:muted', '1');
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
});

test('care setup opens directly and returns focus to the correct shortcut', async ({ page }, info) => {
  const shortcut = page.getByRole('button', { name: 'Set care-team contact' });
  await shortcut.click();
  const dialog = page.getByRole('dialog', { name: 'Birth journey' });
  await expect(dialog.getByLabel('Care provider or team')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close birth journey' })).toBeInViewport();
  await page.screenshot({ path: `${output}/${info.project.name.includes('webkit') ? 'webkit' : 'chromium'}-care-setup.png` });
  await page.keyboard.press('Escape');
  await expect(shortcut).toBeFocused();
  await page.getByRole('button', { name: 'Care contacts', exact: true }).click();
  const contacts = page.getByRole('dialog', { name: 'Care contacts' });
  await contacts.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(contacts.getByText('Phone number', { exact: true })).toBeVisible();
  await expect(contacts.getByText('Email address', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${output}/${info.project.name.includes('webkit') ? 'webkit' : 'chromium'}-contact-form.png` });
  await page.setViewportSize({ width: 390, height: 450 });
  await contacts.getByLabel('Email address').focus();
  await expect(contacts.getByRole('button', { name: 'Close care contacts' })).toBeInViewport();
  await contacts.getByRole('button', { name: 'Close care contacts' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Care provider or team')).toHaveCount(0);
});

test('preparation tools return to one journey and checklist order survives reload', async ({ page }, info) => {
  await page.getByRole('button', { name: 'Open birth journey' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.screenshot({ path: `${output}/${info.project.name.includes('webkit') ? 'webkit' : 'chromium'}-journey.png` });
  await page.getByRole('button', { name: /Hospital bag Packing checklist/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Hospital bag' });
  await expect(page.getByRole('dialog')).toHaveCount(1);
  const first = sheet.getByRole('button', { name: /^Mark .* as packed$/ }).first();
  const firstName = (await first.getAttribute('aria-label'))!.replace(/^Mark /, '').replace(/ as packed$/, '');
  await sheet.getByRole('button', { name: 'Reorder items' }).click();
  const down = sheet.getByRole('button', { name: `Move ${firstName} down`, exact: true });
  await down.focus();
  await page.keyboard.press('Space');
  await expect(sheet.getByRole('button', { name: /^Mark .* as packed$/ }).nth(1)).toHaveAttribute('aria-label', `Mark ${firstName} as packed`);
  await page.screenshot({ path: `${output}/${info.project.name.includes('webkit') ? 'webkit' : 'chromium'}-checklist-reorder.png` });
  await sheet.getByRole('button', { name: 'Close hospital bag' }).click();
  await expect(page.getByRole('dialog', { name: 'Birth journey' })).toBeVisible();
  await page.getByRole('button', { name: 'Close birth journey' }).click();
  await expect(page.getByRole('button', { name: 'Open birth journey' })).toBeFocused();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.getByRole('button', { name: 'Open birth journey' }).click();
  await page.getByRole('button', { name: /Hospital bag Packing checklist/ }).click();
  await expect(sheet.getByRole('button', { name: /^Mark .* as packed$/ }).nth(1)).toHaveAttribute('aria-label', `Mark ${firstName} as packed`);
});

test('optional annotations use keyboard buttons and persist only on Save', async ({ page }, info) => {
  await page.evaluate(() => localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: [{ id: 'detail-record', sessionId: 'primary', start: new Date(Date.now() - 120000).toISOString(), end: new Date(Date.now() - 110000).toISOString() }] })));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('button', { name: '-30s', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Intensity 6', exact: true })).toBeHidden();
  await page.getByText('Optional details', { exact: true }).click();
  const pain = page.getByRole('group', { name: 'Pain location (optional)' });
  await pain.getByRole('button', { name: 'Back', exact: true }).click();
  const lower = pain.getByRole('button', { name: 'Lower back', exact: true });
  await lower.focus();
  await page.keyboard.press('Space');
  await expect(lower).toHaveAttribute('aria-pressed', 'true');
  const bounds = await lower.boundingBox();
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('button', { name: 'Intensity 6', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Intensity 6', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Note (optional)').fill('Fabricated review note');
  await page.screenshot({ path: `${output}/${info.project.name.includes('webkit') ? 'webkit' : 'chromium'}-record-details.png` });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:v1')!).contractions[0].painLocations)).toEqual(['lower back (back)']);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await expect(page.getByText(/Fabricated review note/)).toBeVisible();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByText('Optional details', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Intensity 6', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Note (optional)')).toHaveValue('Fabricated review note');
});
