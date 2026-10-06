import test from 'node:test';
import assert from 'node:assert/strict';
import { addPerson, createSession } from '../../src/lib/sessions.ts';
import { addExam } from '../../src/lib/hospital.ts';
import { saveLaborEvents } from '../../src/lib/laborEvents.ts';
import { createDefaultJourney, saveJourney } from '../../src/lib/journey.ts';

function rejectingStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); },
    removeItem: (key) => values.delete(key),
  };
}

test('user-authored domains report primary storage failure instead of claiming success', () => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = rejectingStorage();
  try {
    assert.equal(createSession('Hospital'), null);
    assert.equal(addPerson({ name: 'Pat', relationship: 'partner' }), null);
    assert.equal(addExam('primary', {
      time: '2026-09-01T12:00:00.000Z', dilationCm: 3, effacementPct: 50, station: 0,
    }), null);
    assert.equal(saveLaborEvents([]), false);
    assert.equal(saveJourney(createDefaultJourney('2026-09-01T12:00:00.000Z', 'quota')), false);
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});
