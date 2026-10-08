import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCareSummary } from '../../src/lib/contractions.ts';
import { DEFAULT_CARE_PLAN } from '../../src/lib/carePlan.ts';
import { isShareCancellation } from '../../src/lib/shareCancellation.ts';
const now = Date.parse('2026-10-08T16:00:00Z');
const record = (minutesAgo, extra = {}) => ({ id: String(minutesAgo), start: new Date(now - minutesAgo * 60000).toISOString(), end: new Date(now - minutesAgo * 60000 + 60000).toISOString(), ...extra });
test('old-only history has no recent averages and no implied default care instructions', () => {
  const text = buildCareSummary([record(1440), record(1435)], DEFAULT_CARE_PLAN, now);
  assert.match(text, /Completed contractions: 0/);
  assert.match(text, /Average duration: not available/);
  assert.match(text, /Average start-to-start interval: not available/);
  assert.match(text, /Timing reminders: off/);
  assert.doesNotMatch(text, /Saved reminder|every 5 min|lasting at least 60s/);
  assert.match(text, /may include earlier records/);
});
test('handoff statistics use only valid completed records and preserve dated manual context', () => {
  const text = buildCareSummary([record(65), record(10, { source: 'manual', note: 'Example note', painLocations: ['lower back'] }), record(5), record(1, { end: null }), record(-5), record(2, { end: 'invalid' })], DEFAULT_CARE_PLAN, now);
  assert.match(text, /Completed contractions: 2/);
  assert.match(text, /Average duration: 1m 0s/);
  assert.match(text, /Average start-to-start interval: 5m 0s/);
  assert.match(text, /2026/);
  assert.match(text, /added manually.*Example note.*lower back/);
  assert.doesNotMatch(text, /Invalid Date/);
  assert.match(text, /does not diagnose labor/);
});
test('enabled user reminder is distinct from disabled or empty history', () => {
  const plan = { ...DEFAULT_CARE_PLAN, enabled: true, providerName: 'Example care team', providerPhone: '+15550100', intervalMinutes: 4, durationSeconds: 45 };
  const text = buildCareSummary([], plan, now);
  assert.match(text, /No completed contractions/);
  assert.match(text, /Care team: Example care team/);
  assert.match(text, /Your saved timing reminder: every 4 min, lasting at least 45s/);
  assert.doesNotMatch(text, /15550100/);
  assert.match(text, /does not diagnose labor/);
});
test('OS and browser cancellation are neutral without swallowing genuine failures', () => {
  assert.equal(isShareCancellation({ name: 'AbortError' }), true);
  assert.equal(isShareCancellation(new Error('Share canceled')), true);
  assert.equal(isShareCancellation(new Error('Share cancelled')), true);
  assert.equal(isShareCancellation(new Error('Permission denied')), false);
  assert.equal(isShareCancellation(new Error('Error sharing item')), false);
});
