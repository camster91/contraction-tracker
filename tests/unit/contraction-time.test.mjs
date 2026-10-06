import test from 'node:test';
import assert from 'node:assert/strict';
import { validateContractionTimes, withClockTime, withEndOffset } from '../../src/lib/contractionTime.ts';

const now = Date.parse('2026-09-01T12:00:00.000Z');

test('contraction time validation rejects reversed, future, and over-four-hour records', () => {
  assert.equal(validateContractionTimes({ start: '2026-09-01T11:59:00.000Z', end: '2026-09-01T12:00:00.000Z' }, now), true);
  assert.equal(validateContractionTimes({ start: '2026-09-01T12:00:00.000Z', end: '2026-09-01T11:59:00.000Z' }, now), false);
  assert.equal(validateContractionTimes({ start: '2026-09-01T12:02:00.000Z', end: null }, now), false);
  assert.equal(validateContractionTimes({ start: '2026-09-01T07:00:00.000Z', end: '2026-09-01T12:00:00.000Z' }, now), false);
});

test('clock and quick-offset edits fail closed before creating an impossible duration', () => {
  const value = { start: '2026-09-01T11:59:30.000Z', end: '2026-09-01T12:00:00.000Z' };
  assert.equal(withEndOffset(value, -30, now), null);
  assert.equal(withClockTime(value, 'start', '12:00:01', now), null);
  assert.equal(withEndOffset(value, -5, now)?.end, '2026-09-01T11:59:55.000Z');
});
