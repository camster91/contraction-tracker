import test from 'node:test';
import assert from 'node:assert/strict';
import { clearAllIdbData } from '../../src/lib/idb.ts';

test('delete-all treats an unsupported IndexedDB API as already clear', async () => {
  assert.equal(typeof globalThis.indexedDB, 'undefined');
  assert.equal(await clearAllIdbData(), true);
});
