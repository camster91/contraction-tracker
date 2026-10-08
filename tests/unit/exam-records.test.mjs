import test from 'node:test';
import assert from 'node:assert/strict';
import { addExam, getExams } from '../../src/lib/hospital.ts';

test('exam persistence distinguishes unknown measurements from entered zeroes', () => {
  const previous = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  try {
    const input = { time: '2026-10-07T12:00:00.000Z', dilationCm: null, effacementPct: null, station: null };
    assert.equal(addExam('primary', input), null);
    assert.equal(addExam('primary', { ...input, effacementPct: 101 }), null);
    assert.equal(addExam('primary', { ...input, dilationCm: NaN }), null);
    assert.equal(getExams('primary').length, 0);
    assert.ok(addExam('primary', { ...input, dilationCm: 0, station: 0 }));
    assert.ok(addExam('primary', { ...input, notes: 'Example reported exam; measurements not provided' }));
    const records = getExams('primary');
    assert.equal(records[0].dilationCm, 0);
    assert.equal(records[0].station, 0);
    assert.equal(records[0].effacementPct, null);
    assert.equal(records[1].dilationCm, null);
    assert.equal(records[1].station, null);
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});
