import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
  });
  await page.goto('/');
  await waitForApp(page);
});

test('RTL direction keeps critical timer and Settings controls operable without page overflow', async ({ page }) => {
  await page.evaluate(() => {
    document.documentElement.lang = 'ar-XB';
    document.documentElement.dir = 'rtl';
  });
  const start = page.getByRole('button', { name: /Start Tap when it begins/i });
  await expect(start).toBeVisible();
  await start.focus();
  await start.press('Enter');
  await expect(page.getByRole('button', { name: 'Stop' })).toBeFocused();
  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await expect(settings).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close settings' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('pseudo-translation expansion does not hide Settings, backup, privacy, or destructive controls', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (node.data.trim() && !node.parentElement?.closest('script, style, option')) nodes.push(node);
    }
    for (const node of nodes) node.data = `［${node.data}${' ·'.repeat(Math.max(2, Math.ceil(node.data.length * 0.18)))}］`;
  });
  const labels = ['Export backup', 'Privacy and data use', 'Delete all Olive data'];
  for (const label of labels) {
    await expect(page.getByText(new RegExp(label, 'i')).first()).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('real pseudo-RTL catalog renders and preserves the primary timer interaction', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('olive:internal-message-locale', 'ar-XB');
  });
  await page.reload();
  await waitForApp(page);

  await expect(page.locator('html')).toHaveAttribute('lang', 'ar-XB');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  const start = page.getByRole('button', { name: /［Šŧàřŧ/ });
  await expect(start).toBeVisible();
  await start.focus();
  await start.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: /［Ïñ þřôğřëšš/ })).toBeVisible();
  const stop = page.getByRole('button', { name: /［Šŧôþ/ });
  await expect(stop).toBeFocused();
  await stop.press('Enter');
  await expect(page.getByText(/［Ïñŧëñšïŧÿ/)).toBeVisible();
  await expect(page.getByPlaceholder(/［Ñôŧë \(ôþŧïôñàľ\)/)).toBeVisible();
  await expect(page.getByRole('button', { name: /［Šàṽë/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /［Đïšçàřđ/ })).toBeVisible();
  await expect(page.getByText(/［Šïñçë ľàšŧ/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('real pseudo-RTL dashboard localizes statistics, charts, tools, and truthful backup guidance', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('olive:internal-message-locale', 'ar-XB');
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        (window as Window & { __oliveSharedCare?: ShareData }).__oliveSharedCare = data;
      },
    });
    const now = Date.now();
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({
      contractions: [3, 2, 1].map((minutesAgo, index) => ({
        id: `dashboard-${index}`,
        sessionId: 'primary',
        start: new Date(now - minutesAgo * 5 * 60_000).toISOString(),
        end: new Date(now - minutesAgo * 5 * 60_000 + 60_000).toISOString(),
        tags: index === 0 ? ['custom {tag}'] : [],
        note: index === 0 ? 'raw note {value}' : '',
        painLocations: [],
      })),
    }));
  });
  await page.reload();
  await waitForApp(page);
  await expect(page.getByText(/［Àṽëřàğë/).first()).toBeVisible();
  await expect(page.getByText(/［Þàŧŧëřñ/)).toBeVisible();
  await expect(page.getByText(/［Ƒřëɋüëñçÿ/)).toBeVisible();
  await expect(page.getByText(/［Ħïšŧôřÿ/)).toBeVisible();
  await expect(page.getByRole('img', { name: /Çôñŧřàçŧïôñ đüřàŧïôñ ŧïɱëľïñë.*3 çôñŧřàçŧïôñš/ })).toBeVisible();
  await expect(page.getByRole('img', { name: /Çôñŧřàçŧïôñ ïñŧëřṽàľ çħàřŧ/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /custom \{tag\}/ })).toBeVisible();
  const dashboardA11y = await new AxeBuilder({ page })
    .include('main')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(dashboardA11y.violations, JSON.stringify(dashboardA11y.violations, null, 2)).toEqual([]);
  await page.getByRole('button', { name: /［Šħàřë çàřë šüɱɱàřÿ/ }).click();
  const sharedCare = await page.evaluate(() => {
    const data = (window as Window & { __oliveSharedCare?: ShareData }).__oliveSharedCare;
    return { title: data?.title, text: data?.text };
  });
  expect(sharedCare.title).toMatch(/^［Ôľïṽë çàřë šüɱɱàřÿ/);
  expect(sharedCare.text).toMatch(/［Ŧħïš ïš àñ ôƀšëřṽëđ ŧïɱïñğ šüɱɱàřÿ/);
  expect(sharedCare.text).toContain('raw note {value}');

  await page.getByRole('button', { name: /［Ṁôřë ŧôôľš/ }).click();
  const backup = page.getByRole('button', { name: /［Ɓàçķüþ.*［Ëẋþôřŧ & řëšŧôřë/ });
  await backup.click();
  await expect(page.getByText(/［Šàṽëđ ôñ ŧħïš đëṽïçë/)).toBeVisible();
  await expect(page.getByText(/šŧôřàğë ïš àṽàïľàƀľë/)).toBeVisible();
  await page.locator('div.fixed.inset-0.z-30').click({ position: { x: 5, y: 5 } });
  await page.getByRole('button', { name: /［Šëššïôñš.*［Šŧàřŧ ôř řëṽïëŵ/ }).click();
  await expect(page.getByRole('dialog', { name: /［Šëššïôñš/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('real pseudo-RTL Settings keeps safety, privacy, and data controls operable', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('olive:internal-message-locale', 'ar-XB');
  });
  await page.reload();
  await waitForApp(page);

  await page.getByRole('button', { name: /［Šëŧŧïñğš/ }).click();
  const settings = page.getByRole('dialog', { name: /［Šëŧŧïñğš/ });
  await expect(settings).toBeVisible();
  await expect(settings.getByText(/［Çàřë-þľàñ řëɱïñđëř/)).toBeVisible();
  await expect(settings.getByText(/đôëš ñôŧ đïàğñôšë ľàƀôř/)).toBeVisible();
  await expect(settings.getByRole('switch', { name: /［Ɓïğ ŧëẋŧ/ })).toBeVisible();
  await expect(settings.getByText(/［Ëẋþôřŧ ƀàçķüþ/)).toBeVisible();
  await expect(settings.getByText(/［Þřïṽàçÿ àñđ đàŧà üšë/)).toBeVisible();
  await expect(settings.getByRole('button', { name: /［Đëľëŧë àľľ Ôľïṽë đàŧà/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('real pseudo-RTL birth journey and care card preserve privacy, focus, user text, and layout', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('olive:internal-message-locale', 'ar-XB');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => { (window as unknown as { __copiedText: string }).__copiedText = text; } },
    });
  });
  await page.reload();
  await waitForApp(page);

  const opener = page.getByRole('button', { name: /［Ôþëñ ƀïřŧħ ĵôüřñëÿ/ });
  await expect(opener).toContainText(/［Ɓïřŧħ ĵôüřñëÿ/);
  await opener.click();
  const journey = page.getByRole('dialog', { name: /［Ɓïřŧħ ĵôüřñëÿ/ });
  await expect(journey.getByText(/Ñôŧħïñğ ħëřë ïš šħàřëđ àüŧôɱàŧïçàľľÿ/)).toHaveCount(0);
  const care = journey.getByRole('button', { name: /［Çàřë çàřđ/ });
  await care.click();
  const back = journey.getByRole('button', { name: /［Ɓàçķ ŧô ƀïřŧħ ĵôüřñëÿ/ });
  await expect(back).toBeFocused();
  await expect(journey.getByText(/Ñôŧħïñğ ħëřë ïš šħàřëđ àüŧôɱàŧïçàľľÿ/)).toBeVisible();
  await expect(journey.getByText(/ñôŧ ṽëřïƒïëđ ɱëđïçàľ ïñšŧřüçŧïôñš/)).toBeVisible();

  const preferredName = journey.getByLabel(/［Þřëƒëřřëđ ñàɱë/);
  await preferredName.fill('ليان {name} 🌿');
  await journey.getByRole('button', { name: /［Çôþÿ çàřë çàřđ/ }).click();
  await expect(journey.getByRole('status')).toContainText(/［Çàřë çàřđ çôþïëđ/);
  const copied = await page.evaluate(() => (window as unknown as { __copiedText: string }).__copiedText);
  expect(copied).toContain('ليان {name} 🌿');
  expect(copied).toContain('［Ñàɱë');

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);

  await back.press('Enter');
  await expect(care).toBeFocused();
});

test('real pseudo-RTL postpartum timeline preserves user text, private status, layout, and accessibility', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('olive:internal-message-locale', 'ar-XB');
  });
  await page.reload();
  await waitForApp(page);

  await page.getByRole('button', { name: /［Ôþëñ ƀïřŧħ ĵôüřñëÿ/ }).click();
  const journey = page.getByRole('dialog', { name: /［Ɓïřŧħ ĵôüřñëÿ/ });
  await journey.getByRole('button', { name: /［Þôšŧþàřŧüɱ/ }).click();
  await journey.getByRole('button', { name: /12 ŵëëķš/ }).click();
  const rawTitle = 'موعد القابلة {name} 🌿';
  await journey.getByLabel(/［Ŧïɱëľïñë ëñŧřÿ/).fill(rawTitle);
  await journey.getByLabel(/［Ëñŧřÿ ŧÿþë/).selectOption('appointment');
  await journey.getByLabel(/［Đàŧë àñđ ŧïɱë/).fill('2026-09-08T14:30');
  await journey.getByRole('button', { name: /［Àđđ ŧô ŧïɱëľïñë/ }).click();

  const entry = journey.getByRole('article', { name: rawTitle });
  await expect(entry).toContainText(rawTitle);
  await expect(entry.getByText(/［Þřïṽàŧë/)).toBeVisible();
  await expect(journey.getByText(/đôëš ñôŧ šçôřë řëçôṽëřÿ/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('real pseudo-RTL hospital log preserves reported notes and exposes non-diagnostic, accessible controls', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('olive:internal-message-locale', 'ar-XB');
  });
  await page.reload();
  await waitForApp(page);

  await page.getByRole('button', { name: /［Ṁôřë ŧôôľš/ }).click();
  await page.getByRole('button', { name: /［Ëẋàɱš.*［Ľôğ ëẋàɱ/ }).click();
  const hospital = page.getByRole('dialog', { name: /［Ħôšþïŧàľ ëẋàɱš/ });
  await hospital.getByRole('button', { name: /［Ľôğ ëẋàɱ/ }).click();
  await expect(hospital.getByText(/đôëš ñôŧ ïñŧëřþřëŧ þřôğřëšš/)).toBeVisible();
  const dilation = hospital.getByRole('button', { name: /3 çëñŧïɱëŧëřš đïľàŧïôñ/ });
  await dilation.click();
  await expect(dilation).toHaveAttribute('aria-pressed', 'true');
  const rawNote = 'قالت القابلة: OA {position}';
  await hospital.getByRole('textbox').fill(rawNote);
  await hospital.getByRole('button', { name: /［Šàṽë ëẋàɱ/ }).click();
  await expect(hospital).toContainText(rawNote);
  await expect(hospital.getByRole('status')).toContainText(/［Ëẋàɱ šàṽëđ ôñ ŧħïš đëṽïçë/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('real pseudo-RTL sharing preserves disclosure scope and bearer-link warnings', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('olive:internal-message-locale', 'ar-XB');
  });
  await page.reload();
  await waitForApp(page);

  await page.getByRole('button', { name: /［Šħàřë ŵïŧħ þàřŧñëř/ }).click();
  const sharing = page.getByRole('dialog', { name: /［Šħàřë ŵïŧħ þàřŧñëř/ });
  await expect(sharing.getByText(/［Ŵħàŧ ŧħïš ľïñķ šħôŵš/)).toBeVisible();
  await expect(sharing.getByText(/［Šüɱɱàřÿ ôñľÿ — řëçôɱɱëñđëđ/)).toBeVisible();
  await expect(sharing.getByText(/Àñÿôñë ŵħô řëçëïṽëš ôř ïš ƒôřŵàřđëđ/)).toBeVisible();
  await expect(sharing.getByRole('button', { name: /［Çřëàŧë šüɱɱàřÿ ľïñķ/ })).toBeVisible();
  await sharing.getByRole('button', { name: /［Àđṽàñçëđ/ }).click();
  await expect(sharing.getByRole('button', { name: /［1 ŵëëķ/ })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('real pseudo-RTL public partner view preserves safety copy, layout, and accessibility', async ({ page }) => {
  const code = 'abc234xyz789';
  await page.route('**/api/shares/**', async (route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not found"}' });
  });
  await page.addInitScript(({ code }) => {
    localStorage.setItem('olive:internal-message-locale', 'ar-XB');
    localStorage.setItem('contraction-tracker:shares', JSON.stringify([{
      id: code,
      sessionId: 'primary',
      mode: 'full',
      state: 'prenatal',
      expiresAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      revoked: false,
      createdAt: new Date().toISOString(),
      journeyPermissions: [],
    }]));
    const start = new Date(Date.now() - 150_000).toISOString();
    const end = new Date(Date.now() - 90_000).toISOString();
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: [{ id: 'rtl-public-1', sessionId: 'primary', start, end }] }));
  }, { code });

  await page.goto(`/?share=${code}`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar-XB');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByText(/［Ľàƀôř ŧřàçķëř/)).toBeVisible();
  await expect(page.getByText(/ïš ñôŧ à çľïñïçàľ àššëššɱëñŧ/)).toBeVisible();
  await expect(page.getByText(/［Ŧïɱë ŧħïš çôñŧřàçŧïôñ/)).toBeVisible();
  await expect(page.getByRole('button', { name: /［Šŧàřŧ çôñŧřàçŧïôñ/ })).toBeVisible();
  await expect(page.getByText(/［Šïñçë ľàšŧ/)).toBeVisible();
  await expect(page.getByText(/［Ħïšŧôřÿ/)).toBeVisible();
  await expect(page.getByText(/［Řëàđ-ôñľÿ ṽïëŵ/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('real pseudo-RTL manual entry and labor events preserve validation and safety boundaries', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('olive:internal-message-locale', 'ar-XB');
  });
  await page.reload();
  await waitForApp(page);

  await page.getByRole('button', { name: /［Àđđ ɱïššëđ çôñŧřàçŧïôñ/ }).click();
  const manual = page.getByRole('dialog', { name: /［Àđđ ɱïššëđ çôñŧřàçŧïôñ/ });
  await expect(manual.getByText(/ëñŧřÿ ŵïľľ ƀë çľëàřľÿ ɱàřķëđ àš ɱàñüàľ/)).toBeVisible();
  await manual.getByLabel(/［Šŧàřŧëđ/).fill('2026-08-28T12:05');
  await manual.getByLabel(/［Ëñđëđ/).fill('2026-08-28T12:04');
  await manual.getByRole('button', { name: /［Šàṽë ɱàñüàľ ëñŧřÿ/ }).click();
  await expect(manual.getByRole('alert')).toContainText(/ëñđ ŧïɱë ɱüšŧ ƀë àƒŧëř/);
  let results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  await manual.getByRole('button', { name: /［Çľôšë ɱàñüàľ ëñŧřÿ/ }).click();

  await page.getByRole('button', { name: /［Ṁôřë ŧôôľš/ }).click();
  await page.getByRole('button', { name: /［Ľàƀôř ëṽëñŧš/ }).click();
  const events = page.getByRole('dialog', { name: /［Ľàƀôř ëṽëñŧš/ });
  await expect(events.getByText(/đôëš ñôŧ ïñŧëřþřëŧ ŧħëšë ëṽëñŧš/)).toBeVisible();
  await events.getByRole('combobox', { name: /^［Ëṽëñŧ / }).selectOption('note');
  await events.getByRole('button', { name: /［Àđđ ëṽëñŧ/ }).click();
  await expect(events.getByRole('alert')).toContainText(/［Àđđ à šħôřŧ ƒàçŧüàľ ñôŧë/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('real pseudo-RTL activity composer preserves identity, unsent text, and accessible targets during relay failure', async ({ page }) => {
  const code = 'feed234xyz89';
  let postAttempts = 0;
  let imageAttempts = 0;
  const postedKinds: string[] = [];
  await page.route('**/api/shares/**', async (route) => {
    const request = route.request();
    if (request.method() === 'POST' && request.url().endsWith('/messages')) {
      postAttempts += 1;
      if (postAttempts === 1) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"unavailable"}' });
        return;
      }
      const posted = request.postDataJSON() as { kind: string; content: string; authorName: string; clientId?: string };
      if (posted.kind === 'image' && ++imageAttempts === 1) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"unavailable"}' });
        return;
      }
      postedKinds.push(posted.kind);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: {
          id: 'activity-retry-success', shareId: code, kind: posted.kind, content: posted.content,
          authorName: posted.authorName, clientId: posted.clientId ?? null, createdAt: new Date().toISOString(),
        } }),
      });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not found"}' });
  });
  await page.addInitScript(({ code }) => {
    localStorage.setItem('olive:internal-message-locale', 'ar-XB');
    localStorage.setItem('contraction-tracker:shares', JSON.stringify([{
      id: code,
      sessionId: 'primary',
      mode: 'full',
      state: 'prenatal',
      expiresAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      revoked: false,
      createdAt: new Date().toISOString(),
      journeyPermissions: [],
    }]));
  }, { code });

  await page.goto(`/?share=${code}`);
  await expect(page.getByText(/［Šïğñ ïñ/)).toBeVisible();
  const name = page.getByRole('textbox', { name: /［Ÿôüř ñàɱë/ });
  await name.fill('Alex');
  await expect(page.getByRole('button', { name: /［Ĵôïñ/ })).toBeVisible();
  await page.getByRole('button', { name: /［Ĵôïñ/ }).click();

  const message = page.getByRole('textbox', { name: /［Ṁëššàğë/ });
  await message.fill('We are on our way');
  const send = page.getByRole('button', { name: /［Šëñđ ɱëššàğë/ });
  await send.click();
  await expect(page.getByRole('alert')).toContainText(/ľïñķ ɱàÿ ƀë řëàđ-ôñľÿ ôř ëẋþïřëđ/);
  await expect(message).toHaveValue('We are on our way');
  await send.click();
  await expect(message).toHaveValue('');
  await expect(page.getByRole('log', { name: /［Šħàřëđ àçŧïṽïŧÿ ɱëššàğëš/ })).toContainText('We are on our way');

  const photoInput = page.locator('input[type="file"]');
  const photo = { name: 'share.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64') };
  await photoInput.setInputFiles(photo);
  const photoReview = page.getByRole('group', { name: /［Řëṽïëŵ šħàřëđ þħôŧô/ });
  await expect(photoReview).toContainText(/ŵïľľ ƀë šëñŧ ŧô ŧħë Ôľïṽë řëľàÿ/);
  expect(postAttempts).toBe(2);
  await photoReview.getByRole('button', { name: /［Çàñçëľ þħôŧô/ }).click();
  await expect(photoReview).toBeHidden();
  expect(postAttempts).toBe(2);
  await photoInput.setInputFiles(photo);
  await photoReview.getByRole('button', { name: /［Šëñđ þħôŧô/ }).click();
  await expect(photoReview).toBeVisible();
  await expect(page.getByRole('alert')).toContainText(/ľïñķ ɱàÿ ƀë řëàđ-ôñľÿ ôř ëẋþïřëđ/);
  expect(postAttempts).toBe(3);
  await photoReview.getByRole('button', { name: /［Šëñđ þħôŧô/ }).click();
  await expect(photoReview).toBeHidden();
  expect(postAttempts).toBe(4);
  expect(postedKinds).toEqual(['text', 'image']);

  for (const control of [
    send,
    page.getByRole('button', { name: /řëàçŧïôñ/ }).first(),
    page.locator('label').filter({ has: photoInput }),
  ]) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
