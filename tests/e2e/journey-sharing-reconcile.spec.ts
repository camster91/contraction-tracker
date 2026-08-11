import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers';

const relayUrl = process.env.RELAY_URL;

test('host reloads a partner-completed reviewed responsibility without replacing it with stale local state', async ({ page, request }) => {
  test.skip(!relayUrl, 'This integration regression requires a local relay.');
  const createdAt = '2026-08-09T12:00:00.000Z';
  const completedAt = '2026-08-09T12:05:00.000Z';
  const create = await request.post(`${relayUrl}/api/shares`, {
    data: {
      sessionId: 'journey-reconcile-host',
      mode: 'full',
      journeyPermissions: ['responsibilities:read', 'responsibilities:complete'],
    },
  });
  expect(create.ok()).toBeTruthy();
  const share = await create.json() as { code: string; hostToken: string; expiresAt: string };

  try {
    const remoteWrite = await request.put(`${relayUrl}/api/shares/${share.code}/journey`, {
      headers: { Authorization: `Bearer ${share.hostToken}` },
      data: {
        responsibilities: [{
          id: 'shared-task',
          title: 'Pack the birth bag',
          phase: 'preparing',
          completedAt,
        }],
      },
    });
    expect(remoteWrite.ok()).toBeTruthy();

    await page.addInitScript(({ code, hostToken, expiresAt }) => {
      const now = '2026-08-09T12:00:00.000Z';
      localStorage.setItem('contraction-tracker:onboarding-seen', '1');
      localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
      localStorage.setItem('contraction-tracker:shares', JSON.stringify([{
        id: code,
        sessionId: 'primary',
        mode: 'partner',
        state: 'prenatal',
        expiresAt,
        createdAt: now,
        revoked: false,
        journeyPermissions: ['responsibilities:read', 'responsibilities:complete'],
      }]));
      localStorage.setItem(`olive:share-host-token:${code}`, hostToken);
      localStorage.setItem('olive:journey:v1', JSON.stringify({
        schemaVersion: 1,
        profile: { id: 'journey-host', phase: 'preparing', updatedAt: now },
        responsibilities: [
          { id: 'shared-task', journeyId: 'journey-host', title: 'Pack the birth bag', private: false, phase: 'preparing', createdAt: now, updatedAt: now },
          { id: 'private-task', journeyId: 'journey-host', title: 'Private note', private: true, phase: 'preparing', createdAt: now, updatedAt: now },
        ],
        questions: [],
        entries: [],
      }));
    }, { code: share.code, hostToken: share.hostToken, expiresAt: share.expiresAt });

    await page.goto('/');
    await waitForApp(page);
    await page.getByRole('button', { name: /open birth journey/i }).click();
    const journey = page.getByRole('dialog', { name: 'Birth journey' });
    await journey.getByRole('button', { name: 'Responsibilities' }).click();
    const sharedTask = page.getByRole('article', { name: 'Pack the birth bag' });
    await expect(sharedTask.getByRole('button', { name: 'Reopen responsibility' })).toBeVisible();
    const privateTask = page.getByRole('article', { name: 'Private note' });
    await expect(privateTask.getByRole('button', { name: 'Mark complete' })).toBeVisible();
  } finally {
    await request.patch(`${relayUrl}/api/shares/${share.code}`, {
      headers: { Authorization: `Bearer ${share.hostToken}` },
      data: { action: 'revoke', reason: 'journey reconciliation test cleanup' },
    });
  }
});

test('host sees a partner-completed reviewed responsibility while the app stays open', async ({ page, request }) => {
  test.skip(!relayUrl, 'This integration regression requires a local relay.');
  const createdAt = '2026-08-10T12:00:00.000Z';
  const create = await request.post(`${relayUrl}/api/shares`, {
    data: {
      sessionId: 'journey-realtime-host',
      mode: 'full',
      journeyPermissions: ['responsibilities:read', 'responsibilities:complete'],
    },
  });
  expect(create.ok()).toBeTruthy();
  const share = await create.json() as { code: string; hostToken: string; expiresAt: string };

  try {
    const remoteWrite = await request.put(`${relayUrl}/api/shares/${share.code}/journey`, {
      headers: { Authorization: `Bearer ${share.hostToken}` },
      data: { responsibilities: [{ id: 'shared-task', title: 'Pack the birth bag', phase: 'preparing', completedAt: null }] },
    });
    expect(remoteWrite.ok()).toBeTruthy();

    await page.addInitScript(({ code, hostToken, expiresAt, createdAt }) => {
      localStorage.setItem('contraction-tracker:onboarding-seen', '1');
      localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
      localStorage.setItem('contraction-tracker:shares', JSON.stringify([{
        id: code, sessionId: 'primary', mode: 'partner', state: 'prenatal', expiresAt, createdAt, revoked: false,
        journeyPermissions: ['responsibilities:read', 'responsibilities:complete'],
      }]));
      localStorage.setItem(`olive:share-host-token:${code}`, hostToken);
      localStorage.setItem('olive:journey:v1', JSON.stringify({
        schemaVersion: 1,
        profile: { id: 'journey-host', phase: 'preparing', updatedAt: createdAt },
        responsibilities: [{ id: 'shared-task', journeyId: 'journey-host', title: 'Pack the birth bag', private: false, phase: 'preparing', createdAt, updatedAt: createdAt }],
        questions: [], entries: [],
      }));
    }, { code: share.code, hostToken: share.hostToken, expiresAt: share.expiresAt, createdAt });

    await page.goto('/');
    await waitForApp(page);
    await page.getByRole('button', { name: /open birth journey/i }).click();
    const journey = page.getByRole('dialog', { name: 'Birth journey' });
    await journey.getByRole('button', { name: 'Responsibilities' }).click();
    const sharedTask = page.getByRole('article', { name: 'Pack the birth bag' });
    await expect(sharedTask.getByRole('button', { name: 'Mark complete' })).toBeVisible();

    const partnerUpdate = await request.patch(`${relayUrl}/api/shares/${share.code}/journey/responsibilities/shared-task`, {
      data: {
        completed: true,
        clientId: 'journeyrealtimepartner',
        clientSecret: 'journey-realtime-partner-proof-123456',
        authorName: 'Jordan',
      },
    });
    expect(partnerUpdate.ok()).toBeTruthy();
    await expect(sharedTask.getByRole('button', { name: 'Reopen responsibility' })).toBeVisible({ timeout: 8_000 });
  } finally {
    await request.patch(`${relayUrl}/api/shares/${share.code}`, {
      headers: { Authorization: `Bearer ${share.hostToken}` },
      data: { action: 'revoke', reason: 'journey realtime test cleanup' },
    });
  }
});
