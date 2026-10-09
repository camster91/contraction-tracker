import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverCrashBackup } from '../../src/lib/crashRecovery.ts';

let mirrored;
const db = { transaction: () => ({ objectStore: () => ({ get: key => {
  const request = { result: key === 'latest' ? mirrored : undefined };
  queueMicrotask(() => request.onsuccess?.());
  return request;
} }) }) };
Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: { open: () => {
  const request = { result: db };
  queueMicrotask(() => request.onsuccess?.());
  return request;
} } });
const record = { id: 'same-record', start: '2026-10-05T12:00:00.000Z', end: '2026-10-05T12:01:00.000Z' };
function localHistory(savedAt) {
  const history = JSON.stringify({ savedAt, contractions: [{ ...record, note: 'local note' }, { ...record, id: 'local-only' }] });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => key === 'contraction-tracker:v1' ? history : null,
    setItem: () => { throw new Error('Recovery must not write'); },
  } });
}

test('newer IDB recovery preserves updated annotations and local-only records', async () => {
  localHistory('2026-10-05T12:02:00Z');
  mirrored = { savedAt: '2026-10-05T12:03:00Z', current: null, contractions: [{ ...record, note: 'newer mirrored note' }] };
  const backup = await recoverCrashBackup();
  assert.equal(backup.contractions.find(c => c.id === record.id).note, 'newer mirrored note');
  assert.equal(backup.contractions.some(c => c.id === 'local-only'), true);
});

test('older IDB recovery cannot overwrite a newer local annotation', async () => {
  localHistory('2026-10-05T12:04:00Z');
  mirrored = { savedAt: '2026-10-05T12:03:00Z', current: null, contractions: [{ ...record, note: 'older mirrored note' }] };
  const backup = await recoverCrashBackup();
  assert.equal(backup.contractions.find(c => c.id === record.id).note, 'local note');
});
