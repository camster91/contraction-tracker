import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverCrashBackup } from '../../src/lib/crashRecovery.ts';

function storage(entries = []) {
  const values = new Map(entries);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => values.get(key) ?? null,
    setItem() { throw new Error('Recovery must not write to storage'); },
  } });
  return values;
}

test('crash recovery reads a damaged primary from its mirror without changing saved data', async () => {
  const history = { contractions: [{ id: 'c1', start: '2026-10-05T12:00:00.000Z', end: '2026-10-05T12:01:00.000Z' }] };
  const values = storage([
    ['contraction-tracker:v1', 'broken'],
    ['contraction-tracker:v1::shadow', JSON.stringify(history)],
    ['contraction-tracker:current', JSON.stringify({ id: 'active', start: '2026-10-05T12:05:00.000Z', end: null })],
  ]);
  const backup = await recoverCrashBackup();
  assert.equal(backup.version, 2);
  assert.deepEqual(backup.contractions, history.contractions);
  assert.equal(backup.current.id, 'active');
  assert.equal(values.get('contraction-tracker:v1'), 'broken');
});

test('unreadable storage never creates a false assurance that saved data exists', async () => {
  storage();
  assert.equal(await recoverCrashBackup(), null);
});
