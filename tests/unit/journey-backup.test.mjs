import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildBackup,
  mergeBackup,
  migrateBackup,
  validateBackup,
} from '../../src/lib/backup.ts';
import { createDefaultJourney } from '../../src/lib/journey.ts';

const basePayload = {
  contractions: [],
  current: null,
  sessions: [],
  people: [],
  shares: [],
  exams: {},
  checklists: {},
};

test('buildBackup writes schema version 2 with journey data', () => {
  const journey = createDefaultJourney('2026-08-08T20:00:00.000Z', 'journey-backup');
  const backup = buildBackup({ ...basePayload, journey });

  assert.equal(backup.version, 2);
  assert.deepEqual(backup.journey, journey);
  assert.equal(validateBackup(backup), true);
});

test('migrateBackup accepts a valid v1.1 backup and adds an empty journey', () => {
  const legacy = {
    version: 1,
    app: 'olive-contraction-tracker',
    savedAt: '2026-08-07T20:00:00.000Z',
    ...basePayload,
  };

  assert.equal(validateBackup(legacy), true);
  const migrated = migrateBackup(legacy, '2026-08-08T20:00:00.000Z', 'migrated-journey');
  assert.equal(migrated.version, 2);
  assert.equal(migrated.journey.profile.id, 'migrated-journey');
  assert.equal(migrated.journey.profile.phase, 'preparing');
});

test('migrateBackup keeps the legacy v1 record families usable', () => {
  const legacy = {
    version: 1,
    app: 'olive-contraction-tracker',
    savedAt: '2026-08-07T20:00:00.000Z',
    contractions: [{ id: 'c-1', start: '2026-08-07T20:00:00.000Z', end: '2026-08-07T20:01:00.000Z', intensity: 'medium' }],
    current: { id: 'legacy-current', sessionId: 'primary' },
    sessions: [{ id: 'primary', name: 'Primary', createdAt: '2026-08-07T19:00:00.000Z' }],
    people: [{ id: 'p-1', name: 'Partner', role: 'partner', createdAt: '2026-08-07T19:00:00.000Z' }],
    exams: { primary: [{ id: 'exam-1', date: '2026-08-07T20:00:00.000Z', dilation: 4, effacement: 50, station: -2 }] },
    checklists: { primary: [{ id: 'phone', text: 'Phone', done: true }] },
  };

  assert.equal(validateBackup(legacy), true);
  const migrated = migrateBackup(legacy, '2026-08-08T20:00:00.000Z', 'legacy-journey');
  assert.equal(migrated.contractions[0].intensity, 6);
  assert.equal(migrated.sessions[0].startedAt, '2026-08-07T19:00:00.000Z');
  assert.equal(migrated.sessions[0].endedAt, null);
  assert.equal(migrated.people[0].relationship, 'partner');
  assert.equal(migrated.exams.primary[0].sessionId, 'primary');
  assert.equal(migrated.exams.primary[0].dilationCm, 4);
  assert.equal(migrated.checklists.primary[0].packed, true);
  assert.equal(migrated.current, null);
});

test('migrateBackup rejects unknown backup versions', () => {
  assert.throws(
    () => migrateBackup({ version: 99, app: 'olive-contraction-tracker', contractions: [] }),
    /valid Olive backup/i,
  );
});

test('validateBackup checks every nested record before import', () => {
  const valid = {
    version: 2,
    app: 'olive-contraction-tracker',
    savedAt: '2026-08-08T20:00:00.000Z',
    contractions: [{ id: 'c1', start: '2026-08-08T20:00:00.000Z', end: '2026-08-08T20:01:00.000Z', sessionId: 'primary' }],
    current: { id: 'active', start: '2026-08-08T20:02:00.000Z', end: null, sessionId: 'primary' },
    sessions: [{ id: 'primary', name: 'Primary', startedAt: '2026-08-08T19:00:00.000Z', endedAt: null }],
    people: [{ id: 'person-1', name: 'Support person', relationship: 'partner', createdAt: '2026-08-08T19:00:00.000Z' }],
    exams: { primary: [{ id: 'exam-1', sessionId: 'primary', time: '2026-08-08T20:00:00.000Z', dilationCm: null, effacementPct: null, station: null }] },
    checklists: { primary: [{ id: 'phone', text: 'Phone', packed: false }] },
    journey: createDefaultJourney('2026-08-08T20:00:00.000Z', 'journey-backup'),
  };

  assert.equal(validateBackup(valid), true);
  assert.equal(validateBackup({ ...valid, contractions: [{ ...valid.contractions[0], end: 42 }] }), false);
  assert.equal(validateBackup({ ...valid, exams: { primary: [{ ...valid.exams.primary[0], dilationCm: 11 }] } }), false);
  assert.equal(validateBackup({ ...valid, checklists: { primary: [{ id: 'phone', text: 'Phone', packed: 'no' }] } }), false);
  assert.equal(validateBackup({ ...valid, journey: { ...valid.journey, profile: { ...valid.journey.profile, phase: 'diagnosed-labor' } } }), false);
});

test('mergeBackup rejects malformed nested data without mutating existing maps', () => {
  const existing = {
    contractions: new Map([['existing', { id: 'existing' }]]),
    sessions: new Map(),
    people: new Map(),
    exams: new Map(),
    checklists: new Map(),
  };
  assert.throws(() => mergeBackup({
    version: 1,
    app: 'olive-contraction-tracker',
    savedAt: '2026-08-08T20:00:00.000Z',
    contractions: [{ id: 'bad', start: 'not-a-date', end: null }],
    current: null,
    sessions: [],
    people: [],
    exams: {},
    checklists: {},
  }, existing), /valid Olive backup/i);
  assert.deepEqual([...existing.contractions.keys()], ['existing']);
});
