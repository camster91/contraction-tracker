import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildBackup,
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

test('migrateBackup rejects unknown backup versions', () => {
  assert.throws(
    () => migrateBackup({ version: 99, app: 'olive-contraction-tracker', contractions: [] }),
    /valid Olive backup/i,
  );
});
