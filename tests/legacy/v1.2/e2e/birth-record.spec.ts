import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { waitForApp } from './helpers';

const code = 'birthflow234';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ code }) => {
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
    localStorage.setItem('contraction-tracker:shares', JSON.stringify([{
      id: code, sessionId: 'primary', mode: 'full', state: 'labor',
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      createdAt: new Date().toISOString(), revoked: false,
      journeyPermissions: [], responsibilityIds: [], birthRecordId: 'birth-private-flow',
    }]));
    localStorage.setItem(`olive:share-host-token:${code}`, 'host-token-long-enough-for-test');
  }, { code });
});

test('birth record is private, unit-consistent, accessible, and retry-safe', async ({ page }) => {
  let postCount = 0;
  let phaseCount = 0;
  let postedContent = '';
  await page.route(`**/api/shares/${code}/messages`, async (route) => {
    if (route.request().method() === 'POST') {
      postCount += 1;
      const body = route.request().postDataJSON();
      postedContent = body.content;
      await route.fulfill({ json: { message: { id: 'message-1', shareId: code, ...body, createdAt: new Date().toISOString() } } });
      return;
    }
    await route.fulfill({ json: { messages: [] } });
  });
  await page.route(`**/api/shares/${code}`, async (route) => {
    if (route.request().method() === 'PATCH' && route.request().postDataJSON()?.action === 'set-state') {
      phaseCount += 1;
      await route.fulfill(phaseCount === 1 ? { status: 503, json: { error: 'offline' } } : { json: { ok: true } });
      return;
    }
    await route.fulfill({ json: { ok: true } });
  });
  await page.route(`**/api/shares/${code}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith(`/api/shares/${code}/messages`)) {
      await route.fallback();
      return;
    }
    if (!route.request().isNavigationRequest()) await route.fulfill({ json: { responsibilities: [], messages: [] } });
    else await route.continue();
  });

  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: /Baby is here/i }).click();
  const dialog = page.getByRole('dialog', { name: 'Record the birth and share the news' });
  await dialog.getByLabel("Baby's name").fill('ليان {name}');
  await dialog.getByRole('spinbutton', { name: 'Pounds' }).fill('7');
  await dialog.getByRole('spinbutton', { name: 'Ounces' }).fill('8');
  await dialog.getByRole('spinbutton', { name: /Length/ }).fill('20');

  const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);

  await dialog.getByRole('button', { name: 'Save and share with circle' }).click();
  await expect(dialog.getByRole('alert')).toContainText('celebration was shared');
  await expect(dialog.getByRole('button', { name: 'Finish update' })).toBeVisible();
  expect(postCount).toBe(1);
  expect(postedContent).toBe('ليان {name} is here! 🎉');
  expect(postedContent).not.toMatch(/7|8|20/);

  const record = await page.evaluate(() => JSON.parse(localStorage.getItem('olive:journal:birth-private-flow') ?? 'null'));
  expect(record).toMatchObject({ name: 'ليان {name}', weightLbs: 7.5, weightKg: 3.4019, lengthIn: 20, lengthCm: 50.8 });
  await dialog.getByRole('button', { name: 'Finish update' }).click();
  await expect(dialog).toBeHidden();
  expect(postCount).toBe(1);
  expect(phaseCount).toBe(2);
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:shares') ?? '[]')[0].state);
  expect(state).toBe('postpartum');
});

test('storage failure blocks every public birth action', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/shares/**', async (route) => {
    requests += 1;
    await route.fulfill({ json: { messages: [], responsibilities: [] } });
  });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: /Baby is here/i }).click();
  const dialog = page.getByRole('dialog', { name: 'Record the birth and share the news' });
  await dialog.getByLabel("Baby's name").fill('Rowan');
  const baseline = requests;
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('olive:journal:')) throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await dialog.getByRole('button', { name: 'Save and share with circle' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Nothing was shared');
  expect(requests).toBe(baseline);
  await expect(dialog).toBeVisible();
});
