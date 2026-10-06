import assert from 'node:assert/strict';
import test from 'node:test';

import { getChecklist, saveChecklist, toggleChecklistItem } from '../../src/lib/checklist.ts';

function installStorage(entries = [], failWrites = false) {
  const values = new Map(entries);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      if (failWrites) throw new DOMException('Quota exceeded', 'QuotaExceededError');
      values.set(key, String(value));
    },
  } });
  return values;
}

test('an intentionally empty hospital bag stays empty instead of rematerializing defaults', () => {
  installStorage([['contraction-tracker:checklist:primary', '[]']]);
  assert.deepEqual(getChecklist('primary'), []);
});

test('hospital bag mutations report storage failure instead of claiming success', () => {
  installStorage([['contraction-tracker:checklist:primary', JSON.stringify([{ id: 'phone', text: 'Phone', packed: false }])]], true);
  assert.equal(saveChecklist('primary', []), false);
  assert.equal(toggleChecklistItem('primary', 'phone'), false);
  assert.equal(getChecklist('primary')[0].packed, false);
});

