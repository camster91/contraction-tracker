import test from 'node:test';
import assert from 'node:assert/strict';

import { clearQuotaExceeded, commitLocalStorageBatch, isQuotaExceeded, save } from '../../src/lib/storage.ts';

test('a successful timer write cannot hide a failed history write', () => {
  const values = new Map();
  let failHistory = true;
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      if (failHistory && key === 'contraction-tracker:v1') throw new DOMException('Quota exceeded', 'QuotaExceededError');
      values.set(key, value);
    },
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: () => null,
    get length() { return values.size; },
  };
  clearQuotaExceeded();

  assert.equal(save('contraction-tracker:v1', { contractions: [{ id: 'c1' }] }), false);
  assert.equal(save('contraction-tracker:current', null), true);
  assert.equal(isQuotaExceeded(), true);

  failHistory = false;
  assert.equal(save('contraction-tracker:v1', { contractions: [{ id: 'c1' }] }), true);
  assert.equal(isQuotaExceeded(), false);
});

test('a failed multi-domain import batch rolls every touched key back', () => {
  const values = new Map([
    ['history', 'old-history'],
    ['history::shadow', 'old-history'],
    ['settings', 'old-settings'],
  ]);
  let writes = 0;
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      writes += 1;
      if (key === 'settings' && value === 'new-settings') throw new DOMException('full', 'QuotaExceededError');
      values.set(key, value);
    },
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: () => null,
    get length() { return values.size; },
  };

  assert.equal(commitLocalStorageBatch([
    { key: 'history', value: 'new-history', shadow: true },
    { key: 'settings', value: 'new-settings' },
  ]), false);
  assert.ok(writes > 1);
  assert.equal(values.get('history'), 'old-history');
  assert.equal(values.get('history::shadow'), 'old-history');
  assert.equal(values.get('settings'), 'old-settings');
});
