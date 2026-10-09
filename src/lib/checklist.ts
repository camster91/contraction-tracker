// Hospital bag checklist — per-session, persisted locally. Items can be
// toggled; progress is a simple packed/total ratio. Backward-compat: a
// session with no checklist entry just gets a fresh one on first open.

export type ChecklistItem = {
  id: string;
  text: string;
  packed: boolean;
};

export const DEFAULT_CHECKLIST: { id: string; text: string }[] = [
  { id: 'phone-charger', text: 'Phone charger' },
  { id: 'id', text: 'Photo ID' },
  { id: 'insurance', text: 'Insurance card' },
  { id: 'birth-plan', text: 'Birth plan (if you have one)' },
  { id: 'snacks', text: 'Snacks for the partner' },
  { id: 'water', text: 'Water bottle' },
  { id: 'change-of-clothes', text: 'Change of clothes' },
  { id: 'going-home-outfit', text: "Going-home outfit for baby" },
  { id: 'blanket', text: 'Blanket' },
  { id: 'toiletries', text: 'Toothbrush, toothpaste, basics' },
  { id: 'phone', text: 'Phone' },
  { id: 'camera', text: 'Camera (if you want photos)' },
];

const KEY = (sessionId: string) => `contraction-tracker:checklist:${sessionId}`;

function readRaw(sessionId: string): ChecklistItem[] | null {
  const read = (candidate: string): { raw: string; value: ChecklistItem[] } | null => {
    try {
      const raw = localStorage.getItem(candidate);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      if (!parsed.every((item) => item && typeof item === 'object'
        && typeof (item as ChecklistItem).id === 'string'
        && typeof (item as ChecklistItem).text === 'string'
        && typeof (item as ChecklistItem).packed === 'boolean')) return null;
      return { raw, value: parsed as ChecklistItem[] };
    } catch {
      return null;
    }
  };
  const primary = read(KEY(sessionId));
  if (primary) return primary.value;
  const shadow = read(`${KEY(sessionId)}::shadow`);
  if (shadow) {
    try { localStorage.setItem(KEY(sessionId), shadow.raw); } catch { /* best effort */ }
    return shadow.value;
  }
  return null;
}

function freshItems(): ChecklistItem[] {
  return DEFAULT_CHECKLIST.map((i) => ({ id: i.id, text: i.text, packed: false }));
}

/** Get the current checklist for a session, materializing defaults if missing. */
export function getChecklist(sessionId: string): ChecklistItem[] {
  const existing = readRaw(sessionId);
  if (existing) return existing;
  const fresh = freshItems();
  saveChecklist(sessionId, fresh);
  return fresh;
}

/** Read a saved checklist without materializing the default list. */
export function getStoredChecklist(sessionId: string): ChecklistItem[] | null {
  return readRaw(sessionId);
}

export function saveChecklist(sessionId: string, items: ChecklistItem[]): boolean {
  try {
    localStorage.setItem(KEY(sessionId), JSON.stringify(items));
    try { localStorage.setItem(`${KEY(sessionId)}::shadow`, JSON.stringify(items)); } catch { /* ignore */ }
    return true;
  } catch { return false; }
}

export function toggleChecklistItem(sessionId: string, itemId: string) {
  const items = getChecklist(sessionId);
  const next = items.map((i) => (i.id === itemId ? { ...i, packed: !i.packed } : i));
  return saveChecklist(sessionId, next);
}

export function packedCount(items: ChecklistItem[]): number {
  return items.filter((i) => i.packed).length;
}
