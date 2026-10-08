import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createShare,
  getAllBirthStats,
  getShares,
} from '../../src/lib/sessions.ts';

function installStorage(entries = []) {
  const values = new Map(entries);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  } });
  return values;
}

test('legacy shares migrate fail-closed and private birth records stop using bearer codes', () => {
  const code = 'secretlink234';
  const values = installStorage([
    ['contraction-tracker:shares', JSON.stringify([{
      id: code,
      sessionId: 'primary',
      mode: 'full',
      state: 'labor',
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      revoked: false,
      createdAt: new Date().toISOString(),
      journeyPermissions: ['responsibilities:read', 'responsibilities:complete'],
    }])],
    [`olive:journal:${code}`, JSON.stringify({ name: 'Olive', recordedAt: '2026-08-08T20:00:00.000Z' })],
  ]);

  const [share] = getShares();
  assert.deepEqual(share.responsibilityIds, []);
  assert.notEqual(share.birthRecordId, code);
  assert.equal(values.has(`olive:journal:${code}`), false);
  assert.equal(values.has(`olive:journal:${share.birthRecordId}`), true);
  assert.deepEqual(getAllBirthStats().map((stats) => stats.name), ['Olive']);
});

test('new shares persist only the responsibility ids reviewed for that invite', () => {
  installStorage();
  const result = createShare({
    id: 'inviteabc234',
    sessionId: 'primary',
    journeyPermissions: ['responsibilities:read', 'responsibilities:complete'],
    responsibilityIds: ['task-a', 'task-a', 'task-c'],
  });
  assert.equal(result.kind, 'created');
  assert.deepEqual(result.share.responsibilityIds, ['task-a', 'task-c']);
  assert.match(result.share.birthRecordId, /^birth-/);
  assert.notEqual(result.share.birthRecordId, result.share.id);
});
