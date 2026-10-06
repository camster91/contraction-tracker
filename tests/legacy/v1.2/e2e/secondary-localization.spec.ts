import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
  });
});

test('sessions never delete metadata while contraction records still belong to it', async ({ page }) => {
  await page.addInitScript(() => {
    const now = new Date().toISOString();
    localStorage.setItem('contraction-tracker:sessions', JSON.stringify([
      { id: 'primary', name: 'Primary', startedAt: now, endedAt: null },
      { id: 'session-with-data', name: 'Night shift', startedAt: now, endedAt: now },
    ]));
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({
      contractions: [{ id: 'kept-record', sessionId: 'session-with-data', start: now, end: now }],
    }));
  });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: 'Sessions' }).click();
  const sessions = page.getByRole('dialog', { name: 'Sessions' });
  const protectedDelete = sessions.getByRole('button', { name: 'Delete its contractions before deleting this session' });
  await expect(protectedDelete).toBeDisabled();
  const stored = await page.evaluate(() => ({
    sessions: JSON.parse(localStorage.getItem('contraction-tracker:sessions') ?? '[]'),
    contractions: JSON.parse(localStorage.getItem('contraction-tracker:v1') ?? '{"contractions":[]}').contractions,
  }));
  expect(stored.sessions.some((item: { id: string }) => item.id === 'session-with-data')).toBe(true);
  expect(stored.contractions.some((item: { id: string }) => item.id === 'kept-record')).toBe(true);
});

test('pseudo-RTL people flow preserves contact text and exposes accessible actions', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('olive:internal-message-locale', 'ar-XB');
  });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: /［Ṁôřë ŧôôľš/ }).click();
  await page.getByRole('button', { name: /［Þëôþľë.*［Àđđ çôñŧàçŧš/ }).click();
  const people = page.getByRole('dialog', { name: /［Þëôþľë/ });
  await people.getByRole('button', { name: /［Àđđ þëřšôñ/ }).click();
  const rawName = 'ليان {name} 🌿';
  await people.getByLabel(/［Þëřšôñ ñàɱë/).fill(rawName);
  await people.getByLabel(/［Řëľàŧïôñšħïþ/).selectOption('midwife');
  await people.getByLabel(/［Þħôñë ñüɱƀëř/).fill('+1 416 555 0102');
  await people.getByRole('button', { name: /［Àđđ þëřšôñ/ }).click();
  await expect(people).toContainText(rawName);
  const call = people.locator('a[href^="tel:"]');
  await expect(call).toHaveAttribute('href', 'tel:+1 416 555 0102');
  await expect(call).toHaveAttribute('aria-label', new RegExp('ليان'));
  await expect(people.getByRole('status')).toContainText(rawName);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('pseudo-RTL sessions preserve user names and require two taps before deleting an empty session', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('olive:internal-message-locale', 'ar-XB');
  });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: /［Šëššïôñš/ }).click();
  let sessions = page.getByRole('dialog', { name: /［Šëššïôñš/ });
  await sessions.getByRole('button', { name: /［Ñëŵ šëššïôñ/ }).click();
  const rawName = 'ليلة {2} Alex';
  await sessions.getByLabel(/［Šëššïôñ ñàɱë/).fill(rawName);
  await sessions.getByRole('button', { name: /［Çřëàŧë šëššïôñ/ }).click();

  await page.getByRole('button', { name: /［Šëššïôñš/ }).click();
  sessions = page.getByRole('dialog', { name: /［Šëššïôñš/ });
  await expect(sessions).toContainText(rawName);
  const firstDelete = sessions.getByRole('button', { name: /Đëľëŧë ëɱþŧÿ šëššïôñ ليلة/ });
  await firstDelete.click();
  const confirmation = sessions.getByRole('button', { name: /Ŧàþ àğàïñ ŧô đëľëŧë ëɱþŧÿ šëššïôñ/ });
  await expect(confirmation).toHaveAttribute('aria-label', new RegExp('ليلة'));
  await confirmation.click();
  const names = await page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:sessions') ?? '[]').map((item: { name: string }) => item.name));
  expect(names).not.toContain(rawName);
});

test('pseudo-RTL ended-session history preserves names and exposes labeled export actions', async ({ page }) => {
  const rawName = 'ولادة Alex {session}';
  await page.addInitScript(({ rawName }) => {
    localStorage.setItem('olive:internal-message-locale', 'ar-XB');
    const start = new Date(Date.now() - 180_000).toISOString();
    const end = new Date(Date.now() - 120_000).toISOString();
    localStorage.setItem('contraction-tracker:sessions', JSON.stringify([
      { id: 'primary', name: 'Primary', startedAt: start, endedAt: null },
      { id: 'ended-rtl', name: rawName, startedAt: start, endedAt: end },
    ]));
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({
      contractions: [{ id: 'ended-record', sessionId: 'ended-rtl', start, end }],
    }));
  }, { rawName });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: /［Šëššïôñš/ }).click();
  const sessions = page.getByRole('dialog', { name: /［Šëššïôñš/ });
  await sessions.getByRole('button', { name: new RegExp(`Ṽïëŵ ${rawName}`) }).click();
  const details = page.getByRole('dialog', { name: new RegExp(rawName) });
  await expect(details).toContainText(rawName);
  await expect(details).toContainText(/1 çôñŧřàçŧïôñ/);
  await expect(details.getByRole('button', { name: /Çľôšë šëššïôñ đëŧàïľš/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('pseudo-RTL hospital bag preserves custom text, supports keyboard reordering, and offers deletion undo', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('olive:internal-message-locale', 'ar-XB');
    localStorage.setItem('contraction-tracker:checklist:primary', JSON.stringify([
      { id: 'custom-a', text: 'شاحن Alex {bag}', packed: false },
      { id: 'custom-b', text: 'بطاقة المستشفى', packed: false },
    ]));
  });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: /［Ṁôřë ŧôôľš/ }).click();
  await page.getByRole('button', { name: /［Ħôšþïŧàľ ƀàğ.*0\/2/ }).click();
  const bag = page.getByRole('dialog', { name: /［Ħôšþïŧàľ ƀàğ/ });
  const first = 'شاحن Alex {bag}';
  await expect(bag).toContainText(first);
  await bag.getByRole('button', { name: /Ṁàřķ شاحن .* àš þàçķëđ/ }).click();
  await expect(bag.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await bag.getByRole('button', { name: /Ṁôṽë شاحن Alex .* đôŵñ/ }).click();
  const storedOrder = await page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:checklist:primary') ?? '[]').map((item: { id: string }) => item.id));
  expect(storedOrder).toEqual(['custom-b', 'custom-a']);

  await bag.getByRole('button', { name: /Đëľëŧë شاحن Alex/ }).click();
  await expect(bag.getByRole('button', { name: /Đëľëŧë شاحن Alex/ })).toHaveCount(0);
  await bag.getByRole('button', { name: /［Üñđô/ }).click();
  const restoredDelete = bag.getByRole('button', { name: /Đëľëŧë شاحن Alex/ });
  await expect(restoredDelete).toBeFocused();
  await expect(bag).toContainText(first);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('hospital bag keeps its previous visible state when device storage rejects a change', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('contraction-tracker:checklist:primary', JSON.stringify([
      { id: 'only-item', text: 'Phone charger', packed: false },
    ]));
  });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: 'More tools' }).click();
  await page.getByRole('button', { name: 'Hospital bag: 0/1 packed' }).click();
  const bag = page.getByRole('dialog', { name: 'Hospital bag' });
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key.startsWith('contraction-tracker:checklist:')) throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await bag.getByRole('button', { name: 'Mark Phone charger as packed' }).click();
  await expect(bag.getByRole('alert')).toContainText('previous list was kept');
  await expect(bag.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await expect(bag.getByRole('button', { name: 'Mark Phone charger as packed' })).toBeVisible();
});

test('pseudo-RTL pain regions use keyboard-sized controls and enforce the three-region limit', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('olive:internal-message-locale', 'ar-XB');
    const start = new Date(Date.now() - 120_000).toISOString();
    const end = new Date(Date.now() - 60_000).toISOString();
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({
      contractions: [{ id: 'pain-edit', sessionId: 'primary', start, end, painLocations: [] }],
    }));
  });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: /［Ëđïŧ/ }).click();
  const back = page.getByRole('button', { name: /［Ɓàçķ/ });
  await back.click();
  await expect(back).toHaveAttribute('aria-pressed', 'true');
  const regionButtons = page.getByRole('group', { name: /［Šëľëçŧ üþ ŧô 3 řëğïôñš/ }).getByRole('button');
  await expect(regionButtons).toHaveCount(5);
  for (let index = 0; index < 3; index += 1) {
    const box = await regionButtons.nth(index).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await regionButtons.nth(index).click();
    await expect(regionButtons.nth(index)).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(page.getByRole('status').filter({ hasText: /Ṁàẋïɱüɱ ôƒ 3 řëğïôñš/ })).toBeVisible();
  await expect(regionButtons.nth(3)).toBeDisabled();
  await regionButtons.nth(0).click();
  await expect(regionButtons.nth(3)).toBeEnabled();
  await regionButtons.nth(3).click();
  await page.getByRole('button', { name: /［Šàṽë/ }).click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:v1') ?? '{"contractions":[]}').contractions[0].painLocations);
  expect(stored).toHaveLength(3);
  expect(stored).toContain('hips');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
