// Backup — export portable Olive records to a JSON file, import and merge from one.
// Device preferences (locale, theme, sound and quiet hours) intentionally stay
// local to this installation and are not included in the portable record file.
// No new npm deps. Uses native FileReader + Blob + URL.createObjectURL.

import {
  createDefaultJourney,
  normalizeJourney,
  validateJourney,
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

type PlainRecord = Record<string, unknown>;

function isRecord(value: unknown): value is PlainRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown, maxLength = 512): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 80 && Number.isFinite(Date.parse(value));
}

function isNullableDate(value: unknown): value is string | null {
  return value === null || isDateString(value);
}

function isStringArray(value: unknown, maxItems = 64, maxLength = 256): value is string[] {
  return Array.isArray(value) && value.length <= maxItems && value.every((item) => isNonEmptyString(item, maxLength));
}

function hasUniqueIds(items: unknown[]): boolean {
  const ids = items.map((item) => isRecord(item) ? item.id : undefined);
  return ids.every((item) => isNonEmptyString(item)) && new Set(ids).size === ids.length;
}

const LEGACY_INTENSITIES = new Set(['mild', 'medium', 'strong']);

function isContractionRecord(value: unknown, legacy = false): boolean {
  if (!isRecord(value) || !isNonEmptyString(value.id)) return false;
  if (!isDateString(value.start) || !Object.prototype.hasOwnProperty.call(value, 'end')) return false;
  if (!isNullableDate(value.end)) return false;
  if (typeof value.end === 'string' && Date.parse(value.end) < Date.parse(value.start)) return false;
  if (value.source !== undefined && value.source !== 'timer' && value.source !== 'manual') return false;
  if (value.intensity !== undefined && value.intensity !== null &&
      !((typeof value.intensity === 'number' && Number.isFinite(value.intensity) && value.intensity >= 1 && value.intensity <= 10) ||
        (legacy && typeof value.intensity === 'string' && LEGACY_INTENSITIES.has(value.intensity)))) return false;
  if (value.note !== undefined && typeof value.note !== 'string') return false;
  if (value.tags !== undefined && !isStringArray(value.tags)) return false;
  if (value.sessionId !== undefined && !isNonEmptyString(value.sessionId)) return false;
  if (value.painLocations !== undefined && !isStringArray(value.painLocations)) return false;
  if (value.voiceMemo !== undefined && typeof value.voiceMemo !== 'string') return false;
  if (value.photo !== undefined && typeof value.photo !== 'string') return false;
  return true;
}

function isSessionRecord(value: unknown, legacy = false): boolean {
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.name)) return false;
  const startedAt = value.startedAt ?? (legacy ? value.createdAt : undefined);
  if (!isDateString(startedAt)) return false;
  const endedAt = value.endedAt ?? null;
  if (!isNullableDate(endedAt)) return false;
  if (typeof endedAt === 'string' && Date.parse(endedAt) < Date.parse(startedAt)) return false;
  return value.notes === undefined || typeof value.notes === 'string';
}

function isPersonRecord(value: unknown, legacy = false): boolean {
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.name) ||
      !(isNonEmptyString(value.relationship) || (legacy && isNonEmptyString(value.role)))) return false;
  if (!isDateString(value.createdAt)) return false;
  return (value.phone === undefined || typeof value.phone === 'string') &&
    (value.email === undefined || typeof value.email === 'string');
}

function isExamRecord(value: unknown, sessionId: string, legacy = false): boolean {
  if (!isRecord(value) || !isNonEmptyString(value.id) || (value.sessionId !== sessionId && !(legacy && value.sessionId === undefined))) return false;
  const time = value.time ?? (legacy ? value.date : undefined);
  if (!isDateString(time)) return false;
  const measurement = (candidate: unknown, min: number, max: number) => candidate === null ||
    (typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= min && candidate <= max);
  const dilation = value.dilationCm !== undefined ? value.dilationCm : (legacy ? value.dilation : null);
  const effacement = value.effacementPct !== undefined ? value.effacementPct : (legacy ? value.effacement : null);
  const station = value.station !== undefined ? value.station : null;
  if (!measurement(dilation, 0, 10) || !measurement(effacement, 0, 100) || !measurement(station, -3, 3)) return false;
  return value.notes === undefined || typeof value.notes === 'string';
}

function isChecklistRecord(value: unknown, _sessionId?: string, legacy = false): boolean {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.text, 2000) &&
    (typeof value.packed === 'boolean' || (legacy && typeof value.done === 'boolean'));
}

function isSessionMap(value: unknown, validate: (item: unknown, key: string) => boolean): value is Record<string, unknown[]> {
  return isRecord(value) && Object.entries(value).every(([key, items]) =>
    isNonEmptyString(key) && Array.isArray(items) && hasUniqueIds(items) && items.every((item) => validate(item, key)));
}

/** Validate one contraction record without changing it. Used by crash recovery as well as imports. */
export function validateContractionRecord(value: unknown): value is PlainRecord {
  return isContractionRecord(value, true);
}

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

function migrateContraction(value: unknown): unknown {
  if (!isRecord(value)) return value;
  if (typeof value.intensity !== 'string') return value;
  const legacyValue = { mild: 3, medium: 6, strong: 9 }[value.intensity as 'mild' | 'medium' | 'strong'];
  return legacyValue === undefined ? value : { ...value, intensity: legacyValue };
}

function migrateSession(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return {
    ...value,
    startedAt: value.startedAt ?? value.createdAt,
    endedAt: value.endedAt ?? null,
  };
}

function migratePerson(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return { ...value, relationship: value.relationship ?? value.role };
}

function migrateExam(value: unknown, sessionId: string): unknown {
  if (!isRecord(value)) return value;
  return {
    ...value,
    sessionId: value.sessionId ?? sessionId,
    time: value.time ?? value.date,
    dilationCm: value.dilationCm ?? value.dilation ?? null,
    effacementPct: value.effacementPct ?? value.effacement ?? null,
    station: value.station ?? null,
  };
}

function migrateChecklist(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return { ...value, packed: value.packed ?? value.done ?? false };
}

/** Validate that an object looks like an Olive backup. */
export function validateBackup(raw: unknown): raw is CompatibleBackupData {
  if (!isRecord(raw) || (raw.version !== 1 && raw.version !== 2) || raw.app !== 'olive-contraction-tracker') return false;
  const legacy = raw.version === 1;
  if (raw.savedAt !== undefined && !isDateString(raw.savedAt)) return false;
  if (!Array.isArray(raw.contractions) || !hasUniqueIds(raw.contractions) || !raw.contractions.every((item) => isContractionRecord(item, legacy))) return false;
  if (raw.current !== undefined && raw.current !== null && !isContractionRecord(raw.current, legacy) &&
      !(legacy && isRecord(raw.current) && isNonEmptyString(raw.current.id) &&
        (raw.current.sessionId === undefined || isNonEmptyString(raw.current.sessionId)))) return false;
  if (raw.sessions !== undefined && (!Array.isArray(raw.sessions) || !hasUniqueIds(raw.sessions) || !raw.sessions.every((item) => isSessionRecord(item, legacy)))) return false;
  if (raw.people !== undefined && (!Array.isArray(raw.people) || !hasUniqueIds(raw.people) || !raw.people.every((item) => isPersonRecord(item, legacy)))) return false;
  if (raw.exams !== undefined && !isSessionMap(raw.exams, (item, key) => isExamRecord(item, key, legacy))) return false;
  if (raw.checklists !== undefined && !isSessionMap(raw.checklists, (item, key) => isChecklistRecord(item, key, legacy))) return false;
  if (raw.version === 2 && raw.journey !== undefined && !validateJourney(raw.journey)) return false;
  return true;
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
  const legacy = source.version === 1;
  const current = source.current && isRecord(source.current) && !isDateString(source.current.start)
    ? null
    : source.current ?? null;
  const exams = source.exams && typeof source.exams === 'object'
    ? Object.fromEntries(Object.entries(source.exams).map(([sessionId, rows]) => [
      sessionId,
      Array.isArray(rows) ? rows.map((row) => legacy ? migrateExam(row, sessionId) : row) : [],
    ]))
    : {};
  const checklists = source.checklists && typeof source.checklists === 'object'
    ? Object.fromEntries(Object.entries(source.checklists).map(([sessionId, rows]) => [
      sessionId,
      Array.isArray(rows) ? rows.map((row) => legacy ? migrateChecklist(row) : row) : [],
    ]))
    : {};
  return {
    version: 2,
    app: 'olive-contraction-tracker',
    savedAt: typeof source.savedAt === 'string' ? source.savedAt : now,
    contractions: source.contractions.map((item) => legacy ? migrateContraction(item) : item),
    current,
    sessions: Array.isArray(source.sessions) ? source.sessions.map((item) => legacy ? migrateSession(item) : item) : [],
    people: Array.isArray(source.people) ? source.people.map((item) => legacy ? migratePerson(item) : item) : [],
    exams,
    checklists,
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
  if (!validateBackup(imported)) throw new Error('This file is not a valid Olive backup.');
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
