import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeRecentContractions } from '../../src/lib/contractions.ts';
const now = Date.parse('2026-10-06T14:00:00Z');
const record = (minutesAgo, seconds = 60) => ({ id: String(minutesAgo), start: new Date(now - minutesAgo * 60000).toISOString(), end: new Date(now - minutesAgo * 60000 + seconds * 1000).toISOString() });
test('recent timing excludes old, active, future and invalid records and sorts remaining starts', () => {
  assert.deepEqual(summarizeRecentContractions([
    record(10, 80), record(61), record(20, 40), record(-1),
    { ...record(5), end: null }, { ...record(4), end: 'invalid' }, record(1, -5),
  ], now), { count: 2, averageDuration: 60, averageSpacing: 600 });
});
test('recent timing includes the hour boundary without borrowing spacing from outside it', () => {
  assert.deepEqual(summarizeRecentContractions([record(61), record(60)], now), { count: 1, averageDuration: 60, averageSpacing: null });
  assert.deepEqual(summarizeRecentContractions([], now), { count: 0, averageDuration: null, averageSpacing: null });
});
