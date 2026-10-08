import assert from 'node:assert/strict';
import test from 'node:test';

import { buildBirthMeasurements } from '../../src/lib/birthRecord.ts';
import { getAllBirthStats, saveBirthStats } from '../../src/lib/sessions.ts';

function installStorage({ failKey = null } = {}) {
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      if (key === failKey) throw new DOMException('Full', 'QuotaExceededError');
      values.set(key, String(value));
    },
    removeItem: (key) => values.delete(key),
  } });
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { setItem() {} } });
  return values;
}

test('pounds and ounces are stored as consistent imperial and metric values', () => {
  const result = buildBirthMeasurements({ unitSystem: 'imperial', weight: '7', ounces: '8', length: '20' });
  assert.equal(result.ok, true);
  assert.deepEqual(result.measurements, {
    weightLbs: 7.5,
    weightKg: 3.4019,
    lengthIn: 20,
    lengthCm: 50.8,
  });
});

test('measurement validation rejects missing pounds and broad typo values', () => {
  assert.deepEqual(buildBirthMeasurements({ unitSystem: 'imperial', weight: '', ounces: '8', length: '' }), { ok: false, field: 'weight' });
  assert.deepEqual(buildBirthMeasurements({ unitSystem: 'imperial', weight: '7', ounces: '16', length: '' }), { ok: false, field: 'ounces' });
  assert.deepEqual(buildBirthMeasurements({ unitSystem: 'metric', weight: '3.4', ounces: '', length: '101' }), { ok: false, field: 'length' });
});

test('birth record and journal index commit atomically', () => {
  const values = installStorage({ failKey: 'olive:journal:index' });
  const saved = saveBirthStats('birth-safe-id', {
    name: 'Rowan', weightLbs: 7.5, weightKg: 3.4019, lengthIn: 20,
    lengthCm: 50.8, birthTime: '2026-09-01T10:00:00.000Z', recordedAt: '2026-09-01T10:05:00.000Z',
  });
  assert.equal(saved, false);
  assert.equal(values.has('olive:journal:birth-safe-id'), false);
  assert.deepEqual(getAllBirthStats(), []);
});

test('valid birth record is discoverable through the private journal index', () => {
  installStorage();
  assert.equal(saveBirthStats('birth-safe-id', {
    name: 'Rowan', weightLbs: null, weightKg: null, lengthIn: null,
    lengthCm: null, birthTime: '2026-09-01T10:00:00.000Z', recordedAt: '2026-09-01T10:05:00.000Z',
  }), true);
  assert.deepEqual(getAllBirthStats().map((record) => record.name), ['Rowan']);
});
