import { buildBackup, type BackupData } from './backup.ts';
import { createDefaultJourney, normalizeJourney } from './journey.ts';
import { loadAutoBackup, loadCurrentBackup } from './idb.ts';

function read(key: string): unknown {
  for (const candidate of [key, `${key}::shadow`]) {
    try {
      const value = localStorage.getItem(candidate);
      if (value !== null) return JSON.parse(value);
    } catch { /* try the recovery mirror */ }
  }
  return null;
}

const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

/** Reads persisted data without relying on the failed app or changing storage. */
export async function recoverCrashBackup(): Promise<BackupData | null> {
  const history = read('contraction-tracker:v1') as { contractions?: unknown[] } | null;
  let contractions = array(history?.contractions);
  let current = read('contraction-tracker:current');
  if (!history) {
    const mirror = await loadAutoBackup();
    if (mirror) { contractions = array(mirror.contractions); current ??= mirror.current; }
  }
  if (!current) current = (await loadCurrentBackup())?.current ?? null;
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
