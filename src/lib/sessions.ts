// Session / People data model.
//
// All fields are additive and read with safe defaults so v1.6 data
// (with no sessionId) still works. Old contractions belong to the
// implicit "primary" session.

import type { Contraction } from './contractions';

export const PRIMARY_SESSION_ID = 'primary';

export type Session = {
  id: string;
  name: string;
  startedAt: string;     // ISO
  endedAt: string | null; // null = still active
  notes?: string;
};

export type Person = {
  id: string;
  name: string;
  relationship: string; // free-form: partner, mom, doula, midwife
  phone?: string;
  email?: string;
  createdAt: string;
};

// ---- localStorage keys ----
const SESSIONS_KEY = 'contraction-tracker:sessions';
const PEOPLE_KEY = 'contraction-tracker:people';
const ACTIVE_SESSION_KEY = 'contraction-tracker:active-session';

// ---- helpers (with shadow mirrors for corruption recovery, same pattern as storage.ts) ----
function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* fall through */ }
  try {
    const shadow = localStorage.getItem(`${key}::shadow`);
    if (shadow) {
      try { localStorage.setItem(key, shadow); } catch { /* ignore */ }
      return JSON.parse(shadow) as T;
    }
  } catch { /* fall through */ }
  return fallback;
}

function writeJSON(key: string, value: unknown): boolean {
  try {
    const json = JSON.stringify(value);
    localStorage.setItem(key, json);
    try { localStorage.setItem(`${key}::shadow`, json); } catch { /* ignore */ }
    return true;
  } catch { return false; }
}

// ---- Sessions ----

export function getSessions(): Session[] {
  const list = readJSON<Session[]>(SESSIONS_KEY, []);
  // Ensure a "primary" session always exists at index 0 (back-compat for v1.6 data)
  if (!list.find((s) => s.id === PRIMARY_SESSION_ID)) {
    // Synthesize a primary session. Old code set startedAt to 30 days ago,
    // which made every fresh install show "Primary · 5/13/2026 · 720h 0m"
    // regardless of when the user actually started. Instead:
    //   - If we have contractions in localStorage, anchor the primary to
    //     the oldest one. The 30-day offset assumed "the user installed 30
    //     days ago but only started timing now" — the actual oldest
    //     contraction start is a better anchor.
    //   - If we have no data, just use now. "1 minute ago" is honest; a
    //     hard-coded 30 days is a lie.
    let startedAt = new Date().toISOString();
    try {
      const stored = JSON.parse(localStorage.getItem('contraction-tracker:v1') || '{}');
      const oldest = (stored.contractions || [])
        .filter((c: { start?: string; sessionId?: string }) =>
          (c.sessionId || PRIMARY_SESSION_ID) === PRIMARY_SESSION_ID && typeof c.start === 'string')
        .map((c: { start: string }) => c.start)
        .sort()[0];
      if (oldest) startedAt = oldest;
    } catch { /* fall through to "now" */ }
    const primary: Session = {
      id: PRIMARY_SESSION_ID,
      name: 'Primary',
      startedAt,
      endedAt: null,
    };
    return [primary, ...list];
  }
  return list;
}

export function setSessions(sessions: Session[]) {
  return writeJSON(SESSIONS_KEY, sessions);
}

export function getActiveSessionId(): string {
  return localStorage.getItem(ACTIVE_SESSION_KEY) || PRIMARY_SESSION_ID;
}

export function setActiveSessionId(id: string) {
  localStorage.setItem(ACTIVE_SESSION_KEY, id);
}

export function createSession(name: string): Session | null {
  const sessions = getSessions();
  const session: Session = {
    id: `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || `Session ${sessions.length + 1}`,
    startedAt: new Date().toISOString(),
    endedAt: null,
  };
  if (!setSessions([...sessions, session])) return null;
  return session;
}

export function endSession(id: string) {
  const sessions = getSessions();
  setSessions(sessions.map((s) => (s.id === id ? { ...s, endedAt: new Date().toISOString() } : s)));
}

export function deleteSession(id: string) {
  if (id === PRIMARY_SESSION_ID) return; // never delete the primary session
  setSessions(getSessions().filter((s) => s.id !== id));
  if (getActiveSessionId() === id) setActiveSessionId(PRIMARY_SESSION_ID);
}

// ---- People ----

export function getPeople(): Person[] {
  return readJSON<Person[]>(PEOPLE_KEY, []);
}

export function setPeople(people: Person[]) {
  return writeJSON(PEOPLE_KEY, people);
}

export function addPerson(input: Omit<Person, 'id' | 'createdAt'>): Person | null {
  const person: Person = {
    ...input,
    id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  if (!setPeople([...getPeople(), person])) return null;
  return person;
}

export function updatePerson(id: string, patch: Partial<Omit<Person, 'id' | 'createdAt'>>) {
  setPeople(getPeople().map((p) => (p.id === id ? { ...p, ...patch } : p)));
}

export function deletePerson(id: string) {
  setPeople(getPeople().filter((p) => p.id !== id));
}

// ---- Contraction filter by session ----

/** Get the sessionId for a contraction. Old data (no sessionId) → primary. */
export function sessionIdOf(c: Contraction): string {
  return c.sessionId || PRIMARY_SESSION_ID;
}

export function contractionsInSession(contractions: Contraction[], sessionId: string): Contraction[] {
  return contractions.filter((c) => sessionIdOf(c) === sessionId);
}

/** Move all old v1.6 contractions (no sessionId) into the primary session. */
export function migrateContractionsToSessions(contractions: Contraction[]): Contraction[] {
  // Idempotent: if a contraction already has a sessionId, leave it.
  // If not, stamp it with PRIMARY_SESSION_ID. (Optional — we could skip this
  // and rely on sessionIdOf() at read time, but persisting makes the data
  // explicit and avoids a class of bugs.)
  let changed = false;
  const out = contractions.map((c) => {
    if (!c.sessionId) {
      changed = true;
      return { ...c, sessionId: PRIMARY_SESSION_ID };
    }
    return c;
  });
  return changed ? out : contractions;
}
