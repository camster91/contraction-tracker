// Backup / restore — JSON file the user can save anywhere (Downloads, iCloud, Drive, email).
// This is the durable layer: localStorage is the live working copy, the backup file is the
// long-term archive. If the device dies or browser data is cleared, the backup restores it.

import type { Contraction } from './contractions';

export const BACKUP_VERSION = 1;

export type Backup = {
  version: number;
  exportedAt: string; // ISO
  app: 'luna-contraction-tracker';
  contractions: Contraction[];
  current: Contraction | null; // in-progress timer, if any
};

export function buildBackup(contractions: Contraction[], current: Contraction | null): Backup {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'luna-contraction-tracker',
    contractions,
    current,
  };
}

export function isValidBackup(data: unknown): data is Backup {
  if (!data || typeof data !== 'object') return false;
  const b = data as Partial<Backup>;
  return (
    b.version === BACKUP_VERSION &&
    b.app === 'luna-contraction-tracker' &&
    Array.isArray(b.contractions) &&
    (b.current === null || typeof b.current === 'object')
  );
}

export function mergeContractions(existing: Contraction[], incoming: Contraction[]): Contraction[] {
  // De-dupe by id; preserve existing entries (they have user edits)
  const map = new Map<string, Contraction>();
  for (const c of existing) map.set(c.id, c);
  for (const c of incoming) if (!map.has(c.id)) map.set(c.id, c);
  return [...map.values()].sort((a, b) => a.start.localeCompare(b.start));
}

export function downloadBackup(contractions: Contraction[], current: Contraction | null) {
  const backup = buildBackup(contractions, current);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `luna-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readBackupFile(file: File): Promise<Backup> {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!isValidBackup(data)) {
    throw new Error('Not a valid Luna backup file');
  }
  return data;
}
