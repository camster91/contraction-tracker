import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_CARE_PLAN, normalizeCarePlan } from '../../src/lib/carePlan.ts';

test('care-plan reminders default to disabled', () => {
  assert.equal(DEFAULT_CARE_PLAN.enabled, false);
  assert.equal(normalizeCarePlan(undefined).enabled, false);
});

test('legacy saved timing values do not silently opt into reminders', () => {
  const migrated = normalizeCarePlan({
    providerName: 'Example care team',
    providerPhone: '+1 555 0100',
    intervalMinutes: 4,
    durationSeconds: 50,
    windowMinutes: 45,
  });
  assert.equal(migrated.enabled, false);
  assert.equal(migrated.intervalMinutes, 4);
});

test('only an explicit boolean true enables a saved reminder', () => {
  assert.equal(normalizeCarePlan({ enabled: true }).enabled, true);
  assert.equal(normalizeCarePlan({ enabled: false }).enabled, false);
});
