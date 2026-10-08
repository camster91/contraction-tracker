// Backup — export all app data to a JSON file, import and merge from one.
// No new npm deps. Uses native FileReader + Blob + URL.createObjectURL.

import {
  createDefaultJourney,
  normalizeJourney,
  type JourneyDocument,
} from './journey.ts';
import { exportTextFile } from './exportFile.ts';

export type BackupDataV1 = {
  version: 1;
  app: 'olive-contraction-tracker';
  savedAt: string;
  contractions: unknown[];
  current: unknown;
  sessions: unknown[];
  people: unknown[];
  exams: Record<string, unknown[]>;
  checklists: Record<string, unknown[]>;
};

export type BackupData = Omit<BackupDataV1, 'version'> & {
  version: 2;
  journey: JourneyDocument;
};

export type CompatibleBackupData = BackupDataV1 | BackupData;

export type ImportResult = {
  contractions: number;
  sessions: number;
  people: number;
  exams: number;
  checklist: number;
};

/** Build the full backup payload from current app state. */
export function buildBackup(payload: {
  contractions: unknown[];
  current: unknown;
  sessions: unknown[];
  people: unknown[];
  exams: Record<string, unknown[]>;
  checklists: Record<string, unknown[]>;
  journey: JourneyDocument;
}): BackupData {
  return {
    version: 2,
    app: 'olive-contraction-tracker',
    savedAt: new Date().toISOString(),
    ...payload,
  };
}

/** Validate that an object looks like an Olive backup. */
export function validateBackup(raw: unknown): raw is CompatibleBackupData {
  if (!raw || typeof raw !== 'object') return false;
  const b = raw as Record<string, unknown>;
  return (
    (b.version === 1 || b.version === 2) &&
    b.app === 'olive-contraction-tracker' &&
    Array.isArray(b.contractions)
  );
}

/** Upgrade a valid legacy/current backup into the normalized v2 schema. */
export function migrateBackup(
  raw: unknown,
  now = new Date().toISOString(),
  fallbackJourneyId?: string,
): BackupData {
  if (!validateBackup(raw)) throw new Error('This file is not a valid Olive backup.');
  const source = raw as CompatibleBackupData;
  const fallback = fallbackJourneyId ?? createDefaultJourney(now).profile.id;
  return {
    version: 2,
    app: 'olive-contraction-tracker',
    savedAt: typeof source.savedAt === 'string' ? source.savedAt : now,
    contractions: source.contractions,
    current: source.current ?? null,
    sessions: Array.isArray(source.sessions) ? source.sessions : [],
    people: Array.isArray(source.people) ? source.people : [],
    exams: source.exams && typeof source.exams === 'object' ? source.exams : {},
    checklists: source.checklists && typeof source.checklists === 'object' ? source.checklists : {},
    journey: normalizeJourney(source.version === 2 ? source.journey : undefined, now, fallback),
  };
}

/** Trigger a browser download of the backup JSON file. */
export async function downloadBackup(data: BackupData): Promise<boolean> {
  const date = new Date().toISOString().split('T')[0];
  return exportTextFile(JSON.stringify(data, null, 2), `olive-backup-${date}.json`, 'application/json', 'Olive backup');
}

/** Read and parse a backup file selected by the user. */
export function readBackupFile(file: File): Promise<CompatibleBackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        resolve(parsed);
      } catch {
        reject(new Error('Could not parse the file as JSON.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsText(file);
  });
}

/**
 * Merge imported backup into existing data.
 * - Contractions: skip duplicates by id
 * - Sessions: skip duplicates by id (keep existing)
 * - People: skip duplicates by id
 * - Exams: skip duplicates by id per session
 * - Checklists: skip duplicates by id per session
 *
 * Backups exported by older versions may still carry a `shares` key
 * (partner sharing was removed in v1.3.0); it is ignored here.
 */
export function mergeBackup(
  imported: CompatibleBackupData,
  existing: {
    contractions: Map<string, unknown>;
    sessions: Map<string, unknown>;
    people: Map<string, unknown>;
    exams: Map<string, Map<string, unknown>>;
    checklists: Map<string, Map<string, unknown>>;
  },
): ImportResult {
  let contractions = 0;
  let sessions = 0;
  let people = 0;
  let exams = 0;
  let checklist = 0;

  // Contractions
  for (const c of imported.contractions as Array<{ id: string }>) {
    if (c?.id && !existing.contractions.has(c.id)) {
      existing.contractions.set(c.id, c);
      contractions++;
    }
  }

  // Sessions
  for (const s of imported.sessions as Array<{ id: string }>) {
    if (s?.id && !existing.sessions.has(s.id)) {
      existing.sessions.set(s.id, s);
      sessions++;
    }
  }

  // People
  for (const p of imported.people as Array<{ id: string }>) {
    if (p?.id && !existing.people.has(p.id)) {
      existing.people.set(p.id, p);
      people++;
    }
  }

  // Cervical exams per session
  for (const [sessionId, examList] of Object.entries(imported.exams as Record<string, Array<{ id: string }>>)) {
    if (!existing.exams.has(sessionId)) existing.exams.set(sessionId, new Map());
    const sessionMap = existing.exams.get(sessionId)!;
    for (const exam of examList) {
      if (exam?.id && !sessionMap.has(exam.id)) {
        sessionMap.set(exam.id, exam);
        exams++;
      }
    }
  }

  // Checklists per session
  for (const [sessionId, items] of Object.entries(imported.checklists as Record<string, Array<{ id: string }>>)) {
    if (!existing.checklists.has(sessionId)) existing.checklists.set(sessionId, new Map());
    const sessionMap = existing.checklists.get(sessionId)!;
    for (const item of items) {
      if (item?.id && !sessionMap.has(item.id)) {
        sessionMap.set(item.id, item);
        checklist++;
      }
    }
  }

  return { contractions, sessions, people, exams, checklist };
}

// ---- Backup rotation (localStorage) ----

const BACKUP_KEYS = [
  'contraction-tracker:backup:1',
  'contraction-tracker:backup:2',
  'contraction-tracker:backup:3',
] as const;

/** Rotate and persist a new backup snapshot. Keeps last 3. */
export function rotateBackup(data: BackupData): void {
  // Shift 1→2, 2→3, 3 dropped, then write to slot 1
  try {
    // Read existing backups
    const existing = BACKUP_KEYS.map((k) => {
      try { return localStorage.getItem(k); } catch { return null; }
    });
    // Rotate
    try { localStorage.setItem(BACKUP_KEYS[2], existing[1] ?? ''); } catch { /* ignore */ }
    try { localStorage.setItem(BACKUP_KEYS[1], existing[0] ?? ''); } catch { /* ignore */ }
    try { localStorage.setItem(BACKUP_KEYS[0], JSON.stringify(data)); } catch { /* ignore */ }
  } catch { /* quota */ }
}

/** Load the most recent rotated backup from localStorage. */
export function loadLatestBackup(): BackupData | null {
  for (const key of BACKUP_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (validateBackup(parsed)) return migrateBackup(parsed);
      }
    } catch { /* ignore */ }
  }
  return null;
}
