import assert from 'node:assert/strict';
import test from 'node:test';
import { formatLocalizedDateTime, formatLocalizedUnit, getDisplayLocale, getLocale, getMessageCatalog, getTextDirection, pluralCategory, pseudoLocalize, setLocale, setPreferredLocale, t } from '../../src/lib/i18n.ts';
import { buildCareSummary, buildSummary, isHour12Preferred, setHour12Preferred } from '../../src/lib/contractions.ts';
import { buildLaborEventsCsv } from '../../src/lib/laborEvents.ts';
import { getVoiceCommands, normalizeVoiceWord } from '../../src/lib/voice.ts';

test('Canadian French is a production locale and unsupported locales fall back to English', () => {
  assert.equal(setLocale('fr-CA'), 'fr-CA');
  assert.equal(getLocale(), 'fr-CA');
  assert.equal(t('timer.start'), 'Démarrer');
  assert.equal(setLocale('de-DE'), 'en');
  assert.equal(t('timer.start'), 'Start');
});

test('Canadian French has exact message-key and placeholder parity with English', () => {
  const english = getMessageCatalog('en');
  const french = getMessageCatalog('fr-CA');
  assert.deepEqual(Object.keys(french).sort(), Object.keys(english).sort());
  const placeholders = (value) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const key of Object.keys(english)) {
    assert.deepEqual(placeholders(french[key]), placeholders(english[key]), `placeholder mismatch: ${key}`);
    assert.ok(french[key].trim().length > 0, `blank French message: ${key}`);
  }
});

test('the preferred interface locale persists without translating user values', () => {
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  } });
  assert.equal(setPreferredLocale('fr-CA'), 'fr-CA');
  assert.equal(values.get('olive:message-locale'), 'fr-CA');
  const rawName = 'Alex {nom} 🌿';
  assert.ok(t('people.addedStatus', { name: rawName }).includes(rawName));
  setLocale('en');
});

test('Canadian French voice commands use the French recognizer and accent-safe keywords', () => {
  setLocale('fr-CA');
  const commands = getVoiceCommands();
  assert.ok(commands.start.includes(normalizeVoiceWord('démarrer')));
  assert.ok(commands.stop.includes(normalizeVoiceWord('arrêter')));
  assert.ok(commands.stop.includes(normalizeVoiceWord('terminé')));
  setLocale('en');
});

test('numbers, units, and plural rules go through the active locale', () => {
  setLocale('en');
  assert.equal(pluralCategory(1), 'one');
  assert.equal(pluralCategory(2), 'other');
  assert.match(formatLocalizedUnit(5, 'minute'), /5/);
});

test('display locale is independent from the English message catalog', () => {
  setLocale('en');
  assert.match(getDisplayLocale(['fr-CA']), /^fr/i);
  assert.equal(t('timer.start'), 'Start');
  const value = formatLocalizedDateTime(
    '2026-08-28T14:30:00.000Z',
    { timeZone: 'UTC', dateStyle: 'medium' },
    'fr-CA',
  );
  assert.match(value, /2026/);
  assert.match(value, /août/i);
});

test('explicit hour cycle produces consistent 12-hour and 24-hour output', () => {
  const value = '2026-08-28T14:30:00.000Z';
  const twelve = formatLocalizedDateTime(value, { timeZone: 'UTC', hour: 'numeric', minute: '2-digit', hour12: true }, 'en-US');
  const twentyFour = formatLocalizedDateTime(value, { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false }, 'en-US');
  assert.match(twelve, /PM/i);
  assert.doesNotMatch(twentyFour, /AM|PM/i);
});

test('fresh installs follow the device hour cycle and explicit choices override it', () => {
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  } });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
    languages: ['en-US'], language: 'en-US',
  } });
  assert.equal(isHour12Preferred(), true);
  setHour12Preferred(false);
  assert.equal(values.get('contraction-tracker:hour12'), '0');
  assert.equal(isHour12Preferred(), false);
  setHour12Preferred(true);
  assert.equal(isHour12Preferred(), true);
});

test('pseudo locales expand catalog copy and expose RTL direction without becoming production locales', () => {
  const root = { lang: '', dir: '' };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { documentElement: root } });
  assert.equal(setLocale('en-XA'), 'en-XA');
  assert.ok(t('timer.start').length > 'Start'.length);
  assert.match(t('timer.start'), /^［/);
  assert.equal(root.dir, 'ltr');
  assert.equal(setLocale('ar-XB'), 'ar-XB');
  assert.equal(root.dir, 'rtl');
  assert.equal(getTextDirection('fa-IR'), 'rtl');
  assert.equal(getTextDirection('fr-CA'), 'ltr');
  assert.ok(pseudoLocalize('Settings').length > 'Settings'.length);
  setLocale('en');
});

test('catalog interpolation survives English and pseudo-localization', () => {
  setLocale('en');
  assert.equal(t('onboarding.goToStep', { step: 3 }), 'Go to step 3');
  setLocale('en-XA');
  const pseudo = t('onboarding.goToStep', { step: 3 });
  assert.match(pseudo, /3/);
  assert.notEqual(pseudo, 'Go to step 3');
  setLocale('en');
});

test('pseudo-localization never transforms interpolated user text', () => {
  setLocale('ar-XB');
  const rawName = 'ليان {name} Alex 🌿';
  const output = t('people.addedStatus', { name: rawName });
  assert.ok(output.includes(rawName));
  assert.equal(output.includes('{ñàɱë}'), false);
  setLocale('en');
});

test('care-summary export localizes authored copy without transforming provider or note text', () => {
  setLocale('ar-XB');
  const rawProvider = 'القابلة Alex {team}';
  const rawNote = 'اتصل عند البوابة {note}';
  const now = Date.parse('2026-08-28T14:30:00.000Z');
  const output = buildCareSummary([
    {
      id: 'localized-export',
      start: '2026-08-28T14:28:00.000Z',
      end: '2026-08-28T14:29:00.000Z',
      intensity: 6,
      note: rawNote,
    },
  ], {
    enabled: false,
    intervalMinutes: 5,
    durationSeconds: 60,
    windowMinutes: 60,
    providerName: rawProvider,
    providerPhone: '+1 416 555 0102',
  }, now);
  assert.match(output, /^［Ôľïṽë çàřë šüɱɱàřÿ/);
  assert.ok(output.includes(rawProvider));
  assert.ok(output.includes(rawNote));
  assert.ok(output.includes('+1 416 555 0102'));
  assert.equal(output.includes('{ŧëàɱ}'), false);
  setLocale('en');
});

test('plain timing summary and labor-event CSV localize authored labels without transforming notes', () => {
  setLocale('en-XA');
  const rawNote = 'Call Alex {note}';
  const summary = buildSummary([{
    id: 'localized-summary',
    start: '2026-08-28T14:28:00.000Z',
    end: '2026-08-28T14:29:00.000Z',
    intensity: 6,
    note: rawNote,
  }], Date.parse('2026-08-28T14:30:00.000Z'));
  assert.match(summary, /^［Çôñŧřàçŧïôñ ľôğ/);
  assert.ok(summary.includes(rawNote));

  const csv = buildLaborEventsCsv([{
    id: 'localized-event',
    sessionId: 'primary',
    kind: 'care-team',
    occurredAt: '2026-08-28T14:29:00.000Z',
    createdAt: '2026-08-28T14:29:00.000Z',
    note: rawNote,
  }]);
  assert.match(csv, /^［Ôççüřřë/);
  assert.ok(csv.includes(rawNote));
  setLocale('en');
});
