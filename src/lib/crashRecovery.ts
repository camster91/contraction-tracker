import { buildBackup, validateContractionRecord, type BackupData } from './backup.ts';
import { createDefaultJourney, normalizeJourney } from './journey.ts';
import { loadAutoBackup, loadCurrentBackup } from './idb.ts';

function readCandidates(key: string): unknown[] {
  const values: unknown[] = [];
  for (const candidate of [key, `${key}::shadow`]) {
    try {
      const value = localStorage.getItem(candidate);
      if (value !== null) values.push(JSON.parse(value));
    } catch { /* try the recovery mirror */ }
  }
  return values;
}

function read(key: string): unknown {
  return readCandidates(key)[0] ?? null;
}

const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

function validContractions(value: unknown): Record<string, unknown>[] {
  return array(value).filter(validateContractionRecord) as Record<string, unknown>[];
}

function mergeContractions(local: unknown[], mirrored: unknown[], preferMirror: boolean): unknown[] {
  const merged = new Map<string, Record<string, unknown>>();
  for (const item of preferMirror ? [...mirrored, ...local] : [...local, ...mirrored]) {
    if (validateContractionRecord(item) && typeof item.id === 'string' && !merged.has(item.id)) {
      merged.set(item.id, item as Record<string, unknown>);
    }
  }
  return [...merged.values()];
}

function validCurrent(value: unknown): boolean {
  return value === null || validateContractionRecord(value);
}

/**
 * Reads persisted data without relying on the failed app or changing storage.
 * The IndexedDB mirror only covers the contraction history, active timer and
 * journey today. Sessions, contacts, exams and checklists are read from their
 * localStorage copies; a future mirror expansion must preserve this fallback.
 */

export async function recoverCrashBackup(): Promise<BackupData | null> {
  const history = readCandidates('contraction-tracker:v1')
    .filter((candidate): candidate is { contractions?: unknown[]; savedAt?: string } =>
      !!candidate && typeof candidate === 'object' && !Array.isArray(candidate))
    .sort((left, right) => validContractions(right.contractions).length - validContractions(left.contractions).length)[0] ?? null;
  const localContractions = validContractions(history?.contractions);
  const mirror = await loadAutoBackup<unknown>();
  const mirroredContractions = validContractions(mirror?.contractions);
  // Merge by id instead of replacing the local copy. This preserves a record
  // written after the last IndexedDB tick while recovering records missing
  // from localStorage after a wipe or quota failure.
  const localSavedAt = Date.parse(history?.savedAt ?? '');
  const mirrorSavedAt = Date.parse(mirror?.savedAt ?? '');
  const preferMirror = Number.isFinite(mirrorSavedAt) && (!Number.isFinite(localSavedAt) || mirrorSavedAt > localSavedAt);
  const contractions = mergeContractions(localContractions, mirroredContractions, preferMirror);

  const localCurrent = read('contraction-tracker:current');
  const timerMirror = await loadCurrentBackup<unknown>();
  const mirroredCurrent = timerMirror?.current ?? mirror?.current ?? null;
  let current = validCurrent(localCurrent) ? localCurrent : null;
  if (!current && validCurrent(mirroredCurrent)) current = mirroredCurrent;
  if (current && validCurrent(mirroredCurrent)) {
    const localSavedAt = Date.parse(history?.savedAt ?? '');
    const mirrorSavedAt = Date.parse(timerMirror?.savedAt ?? mirror?.savedAt ?? '');
    if (Number.isFinite(mirrorSavedAt) && (!Number.isFinite(localSavedAt) || mirrorSavedAt > localSavedAt)) {
      current = mirroredCurrent;
    }
  }
  const sessions = array(read('contraction-tracker:sessions'));
  const people = array(read('contraction-tracker:people'));
  const rawJourney = read('olive:journey:v1');
  if (!contractions.length && !current && !sessions.length && !people.length && !rawJourney) return null;
  const exams: Record<string, unknown[]> = {};
  const checklists: Record<string, unknown[]> = {};
  for (const session of [{ id: 'primary' }, ...sessions]) {
    if (!session || typeof session !== 'object' || !('id' in session) || typeof session.id !== 'string') continue;
    exams[session.id] = array(read(`contraction-tracker:cervical-exams:${session.id}`));
    checklists[session.id] = array(read(`contraction-tracker:checklist:${session.id}`));
  }
  return buildBackup({ contractions, current, sessions, people, exams, checklists,
    journey: rawJourney ? normalizeJourney(rawJourney) : createDefaultJourney() });
}
