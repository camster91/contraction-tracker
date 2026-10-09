import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addJourneyEntry,
  addProviderQuestion,
  addResponsibility,
  buildCareCardSummary,
  createDefaultJourney,
  getJourney,
  deleteProviderQuestion,
  deleteResponsibility,
  mergeJourney,
  normalizeJourney,
  getJourneyAsync,
  validateJourney,
  updateJourneyProfile,
  updateJourneyEntry,
  updateProviderQuestion,
  updateResponsibility,
} from '../../src/lib/journey.ts';

const NOW = '2026-08-08T20:00:00.000Z';

test('createDefaultJourney returns a private preparing journey', () => {
  const journey = createDefaultJourney(NOW, 'journey-test');

  assert.deepEqual(journey, {
    schemaVersion: 1,
    profile: {
      id: 'journey-test',
      phase: 'preparing',
      updatedAt: NOW,
    },
    responsibilities: [],
    questions: [],
    entries: [],
  });
});

test('normalizeJourney preserves valid fields and removes invalid records', () => {
  const journey = normalizeJourney({
    schemaVersion: 99,
    profile: {
      id: ' journey-1 ',
      phase: 'postpartum',
      preferredName: '  Bianca  ',
      estimatedDueDate: '2026-09-01',
      birthDate: 'not-a-date',
      emergencyPersonId: ' person-1 ',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
    responsibilities: [
      {
        id: 'task-1',
        journeyId: 'journey-1',
        title: '  Bring hospital bag  ',
        private: true,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
      { id: '', title: 'invalid' },
    ],
    questions: 'not-an-array',
    entries: [{ id: 'entry-without-required-fields' }],
  }, NOW, 'fallback-id');

  assert.equal(journey.schemaVersion, 1);
  assert.equal(journey.profile.id, 'journey-1');
  assert.equal(journey.profile.phase, 'postpartum');
  assert.equal(journey.profile.preferredName, 'Bianca');
  assert.equal(journey.profile.estimatedDueDate, '2026-09-01');
  assert.equal(journey.profile.birthDate, undefined);
  assert.equal(journey.profile.emergencyPersonId, 'person-1');
  assert.equal(journey.responsibilities.length, 1);
  assert.equal(journey.responsibilities[0].title, 'Bring hospital bag');
  assert.deepEqual(journey.questions, []);
  assert.deepEqual(journey.entries, []);
});

test('normalizeJourney falls back safely for malformed input', () => {
  const journey = normalizeJourney({ profile: { phase: 'active-labor' } }, NOW, 'safe-id');

  assert.equal(journey.profile.id, 'safe-id');
  assert.equal(journey.profile.phase, 'preparing');
  assert.equal(journey.profile.updatedAt, NOW);
  assert.deepEqual(journey.responsibilities, []);
  assert.deepEqual(journey.questions, []);
  assert.deepEqual(journey.entries, []);
});

test('validateJourney rejects malformed nested records before backup import', () => {
  const valid = createDefaultJourney(NOW, 'validated');
  valid.questions.push({
    id: 'question-1',
    journeyId: 'validated',
    text: 'Ask about monitoring',
    category: 'birth',
    private: true,
    pinned: false,
    notesAreProviderInstructions: false,
    createdAt: NOW,
    updatedAt: NOW,
  });
  assert.equal(validateJourney(valid), true);
  assert.equal(validateJourney({ ...valid, questions: [{ ...valid.questions[0], private: 'yes' }] }), false);
  assert.equal(validateJourney({ ...valid, profile: { ...valid.profile, updatedAt: 'bad-date' } }), false);
});

test('getJourneyAsync preserves a valid local journey when IndexedDB is unavailable', async () => {
  const values = new Map([[
    'olive:journey:v1',
    JSON.stringify({
      ...createDefaultJourney(NOW, 'local-journey'),
      profile: { ...createDefaultJourney(NOW, 'local-journey').profile, preferredName: 'Bianca' },
    }),
  ]]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  } });
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: undefined });

  const journey = await getJourneyAsync(NOW);
  assert.equal(journey.profile.id, 'local-journey');
  assert.equal(journey.profile.preferredName, 'Bianca');
});

test('getJourney chooses a valid shadow and does not persist a default over a missing local copy', () => {
  const shadow = createDefaultJourney(NOW, 'shadow-journey');
  shadow.profile.preferredName = 'Recovered';
  const values = new Map([
    ['olive:journey:v1', '{broken-json'],
    ['olive:journey:v1::shadow', JSON.stringify(shadow)],
  ]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  } });
  const recovered = getJourney();
  assert.equal(recovered.profile.id, 'shadow-journey');
  assert.equal(recovered.profile.preferredName, 'Recovered');

  values.clear();
  const fresh = getJourney();
  assert.equal(fresh.profile.phase, 'preparing');
  assert.equal(values.size, 0);
});

test('mergeJourney preserves existing profile fields and adds new records by id', () => {
  const existing = createDefaultJourney(NOW, 'existing');
  existing.profile.preferredName = 'Bianca';
  existing.questions.push({
    id: 'question-existing',
    journeyId: 'existing',
    text: 'Existing question',
    category: 'birth',
    private: true,
    pinned: false,
    notesAreProviderInstructions: false,
    createdAt: NOW,
    updatedAt: NOW,
  });
  const imported = createDefaultJourney(NOW, 'imported');
  imported.profile.preferredName = 'Imported name';
  imported.questions.push({
    id: 'question-imported',
    journeyId: 'imported',
    text: 'Imported question',
    category: 'other',
    private: true,
    pinned: false,
    notesAreProviderInstructions: false,
    createdAt: NOW,
    updatedAt: NOW,
  });

  const merged = mergeJourney(existing, imported, NOW);
  assert.equal(merged.profile.preferredName, 'Bianca');
  assert.deepEqual(merged.questions.map((item) => item.id), ['question-existing', 'question-imported']);
  assert.equal(merged.questions[1].journeyId, 'existing');
});

test('updateJourneyProfile normalizes care-card fields without changing phase', () => {
  const journey = createDefaultJourney(NOW, 'care-card');
  const updated = updateJourneyProfile(journey, {
    preferredName: '  Bianca  ',
    pronouns: ' she/her ',
    estimatedDueDate: '2026-09-01',
    birthLocation: '  North Star Birth Centre ',
    importantNotes: '  Allergic to latex  ',
  }, NOW);

  assert.equal(updated.profile.phase, 'preparing');
  assert.equal(updated.profile.preferredName, 'Bianca');
  assert.equal(updated.profile.pronouns, 'she/her');
  assert.equal(updated.profile.birthLocation, 'North Star Birth Centre');
  assert.equal(updated.profile.importantNotes, 'Allergic to latex');
});

test('provider questions are private by default and support update and delete', () => {
  const journey = createDefaultJourney(NOW, 'questions');
  const added = addProviderQuestion(journey, {
    text: '  What should I bring?  ',
    category: 'birth',
  }, NOW, 'question-1');

  assert.equal(added.questions.length, 1);
  assert.equal(added.questions[0].text, 'What should I bring?');
  assert.equal(added.questions[0].private, true);
  assert.equal(added.questions[0].askedAt, undefined);

  const asked = updateProviderQuestion(added, 'question-1', { askedAt: NOW, notes: ' Bring records ' }, NOW);
  assert.equal(asked.questions[0].askedAt, NOW);
  assert.equal(asked.questions[0].notes, 'Bring records');

  const deleted = deleteProviderQuestion(asked, 'question-1', NOW);
  assert.deepEqual(deleted.questions, []);
});

test('provider questions reject empty text', () => {
  const journey = createDefaultJourney(NOW, 'questions');
  assert.throws(
    () => addProviderQuestion(journey, { text: '   ', category: 'other' }, NOW, 'question-empty'),
    /question text/i,
  );
});

test('care-card summary includes entered facts and a safety boundary', () => {
  const journey = updateJourneyProfile(createDefaultJourney(NOW, 'summary'), {
    preferredName: 'Bianca',
    birthLocation: 'North Star Birth Centre',
    importantNotes: 'Allergic to latex',
  }, NOW);
  const summary = buildCareCardSummary(journey);

  assert.match(summary, /Bianca/);
  assert.match(summary, /North Star Birth Centre/);
  assert.match(summary, /Allergic to latex/);
  assert.match(summary, /does not diagnose labor/i);
});

test('responsibilities support assignment and idempotent completion', () => {
  const journey = createDefaultJourney(NOW, 'responsibilities');
  const added = addResponsibility(journey, {
    title: ' Bring the hospital bag ',
    assigneePersonId: 'person-1',
    phase: 'labor',
  }, NOW, 'task-1');
  assert.equal(added.responsibilities[0].title, 'Bring the hospital bag');
  assert.equal(added.responsibilities[0].assigneePersonId, 'person-1');
  assert.equal(added.responsibilities[0].private, true);

  const completed = updateResponsibility(added, 'task-1', { completedAt: NOW }, NOW);
  const completedAgain = updateResponsibility(completed, 'task-1', { completedAt: NOW }, NOW);
  assert.equal(completedAgain.responsibilities[0].completedAt, NOW);
  assert.deepEqual(deleteResponsibility(completedAgain, 'task-1', NOW).responsibilities, []);
});

test('journey entries normalize dates and remain private by default', () => {
  const journey = createDefaultJourney(NOW, 'timeline');
  const added = addJourneyEntry(journey, {
    kind: 'appointment',
    title: ' Midwife follow-up ',
    occursAt: '2026-08-20T14:30:00.000Z',
  }, NOW, 'entry-1');
  assert.equal(added.entries[0].title, 'Midwife follow-up');
  assert.equal(added.entries[0].private, true);

  const completed = updateJourneyEntry(added, 'entry-1', { completedAt: NOW }, NOW);
  assert.equal(completed.entries[0].completedAt, NOW);
});
