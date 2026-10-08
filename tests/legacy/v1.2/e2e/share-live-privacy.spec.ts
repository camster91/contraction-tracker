import { expect, test } from '@playwright/test';

const relayUrl = process.env.RELAY_URL;
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'https://contractions.ashbi.ca/';

for (const mode of ['full', 'stats'] as const) {
  test(`an open ${mode} partner view clears private data immediately when the host revokes it`, async ({ page, request }) => {
    test.skip(!relayUrl, 'This privacy regression requires the release relay fixture.');
    const create = await request.post(`${relayUrl}/api/shares`, {
      data: { sessionId: `live-revoke-${mode}`, mode, ttlHours: 1, state: 'prenatal' },
    });
    expect(create.ok()).toBeTruthy();
    const share = await create.json() as { code: string; hostToken: string };

    const now = Date.now();
    const push = await request.post(`${relayUrl}/api/shares/${share.code}/contractions`, {
      headers: { Authorization: `Bearer ${share.hostToken}` },
      data: {
        contractions: [{
          id: `private-${mode}`,
          sessionId: `live-revoke-${mode}`,
          start: new Date(now - 120_000).toISOString(),
          end: new Date(now - 60_000).toISOString(),
          durationMs: 60_000,
          intensity: 5,
          note: 'private viewer fixture',
          tags: [],
          painLocations: [],
        }],
        current: null,
      },
    });
    expect(push.ok()).toBeTruthy();

    const streamRequested = page.waitForRequest((request) =>
      request.url().includes(`/api/shares/${share.code}/stream`),
    );
    await page.goto(`${baseUrl}?share=${share.code}`);
    if (mode === 'full') await expect(page.getByRole('button', { name: 'Start contraction' })).toBeVisible();
    else await expect(page.getByText('Progress', { exact: true })).toBeVisible();
    await streamRequested;
    await page.waitForTimeout(250);

    const revoke = await request.patch(`${relayUrl}/api/shares/${share.code}`, {
      headers: { Authorization: `Bearer ${share.hostToken}` },
      data: { action: 'revoke', reason: 'live privacy regression' },
    });
    expect(revoke.ok()).toBeTruthy();

    await expect(page.getByRole('alert')).toContainText('This share link was revoked', { timeout: 8_000 });
    await expect(page.getByRole('button', { name: 'Start contraction' })).toHaveCount(0);
    await expect(page.getByText('private viewer fixture')).toHaveCount(0);
    await expect(page.getByText('Progress', { exact: true })).toHaveCount(0);
  });
}

for (const mode of ['full', 'stats'] as const) {
  test(`an open ${mode} partner view follows host-selected states without reload`, async ({ page, request }) => {
    test.skip(!relayUrl, 'This live-state regression requires the release relay fixture.');
    const create = await request.post(`${relayUrl}/api/shares`, {
      data: { sessionId: `live-state-${mode}`, mode, ttlHours: 1, state: 'prenatal' },
    });
    expect(create.ok()).toBeTruthy();
    const share = await create.json() as { code: string; hostToken: string };
    try {
      const streamRequested = page.waitForRequest((request) =>
        request.url().includes(`/api/shares/${share.code}/stream`),
      );
      await page.goto(`${baseUrl}?share=${share.code}`);
      await expect(page.getByText('Shared status: Preparing', { exact: true })).toBeVisible();
      await streamRequested;
      await page.waitForTimeout(250);

      for (const [state, title] of [
        ['labor', 'Shared status: Labor'],
        ['postpartum', 'Shared status: Postpartum'],
        ['archived', 'Shared status: Archived'],
      ] as const) {
        const update = await request.patch(`${relayUrl}/api/shares/${share.code}`, {
          headers: { Authorization: `Bearer ${share.hostToken}` },
          data: { action: 'set-state', state },
        });
        expect(update.ok()).toBeTruthy();
        await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 5_000 });
      }
      await expect(page.getByRole('button', { name: /contraction/i })).toHaveCount(0);
      await expect(page.getByText(/all quiet|safe to stay home|things are starting/i)).toHaveCount(0);
    } finally {
      await request.patch(`${relayUrl}/api/shares/${share.code}`, {
        headers: { Authorization: `Bearer ${share.hostToken}` },
        data: { action: 'revoke', reason: 'live state regression cleanup' },
      });
    }
  });
}

test('an open local partner view clears private data when its expiry deadline passes', async ({ page }) => {
  const fixedNow = new Date('2026-09-01T12:00:00.000Z');
  await page.clock.install({ time: fixedNow });
  await page.route(`${relayUrl || 'http://127.0.0.1:8791'}/**`, (route) => route.abort());
  await page.addInitScript(({ now }) => {
    const code = 'expiry';
    localStorage.setItem('contraction-tracker:shares', JSON.stringify([{
      id: code,
      sessionId: 'expiry-session',
      mode: 'full',
      state: 'prenatal',
      expiresAt: new Date(now + 60_000).toISOString(),
      createdAt: new Date(now).toISOString(),
      revoked: false,
    }]));
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({
      contractions: [{
        id: 'expiry-private',
        sessionId: 'expiry-session',
        start: new Date(now - 120_000).toISOString(),
        end: new Date(now - 60_000).toISOString(),
        durationMs: 60_000,
        intensity: 5,
        note: 'expiring private fixture',
        tags: [],
        painLocations: [],
      }],
    }));
  }, { now: fixedNow.getTime() });

  await page.goto(`${baseUrl}?share=expiry`);
  await expect(page.getByRole('button', { name: 'Start contraction' })).toBeVisible();
  await page.clock.fastForward(60_001);

  await expect(page.getByRole('alert')).toContainText('This share link has expired');
  await expect(page.getByRole('button', { name: 'Start contraction' })).toHaveCount(0);
  await expect(page.getByText('expiring private fixture')).toHaveCount(0);
});
