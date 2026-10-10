import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteSession, endSession, getActiveSessionId, getSessions, setActiveSessionId } from '../../src/lib/sessions.ts';

for (const action of [endSession, deleteSession]) {
  test(`${action.name} rolls back session data if the active-context write fails`, () => {
    const previous = globalThis.localStorage;
    const original = JSON.stringify([
      { id: 'primary', name: 'Primary', startedAt: '2026-10-10T12:00:00Z', endedAt: null },
      { id: 'hospital', name: 'Hospital', startedAt: '2026-10-10T13:00:00Z', endedAt: null },
    ]);
    const values = new Map([
      ['contraction-tracker:sessions', original],
      ['contraction-tracker:sessions::shadow', original],
      ['contraction-tracker:active-session', 'hospital'],
    ]);
    let fail = true;
    globalThis.localStorage = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => {
        if (fail && key === 'contraction-tracker:active-session' && value === 'primary') {
          throw new DOMException('Quota exceeded', 'QuotaExceededError');
        }
        values.set(key, value);
      },
      removeItem: key => values.delete(key),
    };
    try {
      assert.equal(action('hospital'), false);
      assert.equal(values.get('contraction-tracker:sessions'), original);
      assert.equal(values.get('contraction-tracker:sessions::shadow'), original);
      assert.equal(getActiveSessionId(), 'hospital');
      fail = false;
      assert.equal(action('hospital'), true);
      assert.equal(getActiveSessionId(), 'primary');
      const target = getSessions().find(session => session.id === 'hospital');
      if (action === endSession) assert.ok(target.endedAt);
      else assert.equal(target, undefined);
    } finally {
      if (previous === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = previous;
    }
  });
}

test('switching sessions reports a rejected write without throwing or changing context', () => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); },
  };
  try { assert.equal(setActiveSessionId('hospital'), false); }
  finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});
