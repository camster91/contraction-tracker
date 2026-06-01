// Session / People / Share data model.
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

export type Share = {
  id: string;            // short code used in the URL (e.g. "luna-3kf8")
  sessionId: string;
  pin?: string;          // optional 4-digit PIN
  expiresAt: string;     // ISO
  revoked: boolean;
  createdAt: string;
  lastOpenedAt?: string; // for showing "last viewed 3m ago" to the host
};

// ---- localStorage keys ----
const SESSIONS_KEY = 'contraction-tracker:sessions';
const PEOPLE_KEY = 'contraction-tracker:people';
const SHARES_KEY = 'contraction-tracker:shares';
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

function writeJSON(key: string, value: unknown) {
  try {
    const json = JSON.stringify(value);
    localStorage.setItem(key, json);
    try { localStorage.setItem(`${key}::shadow`, json); } catch { /* ignore */ }
  } catch { /* quota or serialization issue */ }
}

// ---- Sessions ----

export function getSessions(): Session[] {
  const list = readJSON<Session[]>(SESSIONS_KEY, []);
  // Ensure a "primary" session always exists at index 0 (back-compat for v1.6 data)
  if (!list.find((s) => s.id === PRIMARY_SESSION_ID)) {
    const primary: Session = {
      id: PRIMARY_SESSION_ID,
      name: 'Primary',
      startedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endedAt: null,
    };
    return [primary, ...list];
  }
  return list;
}

export function setSessions(sessions: Session[]) {
  writeJSON(SESSIONS_KEY, sessions);
}

export function getActiveSessionId(): string {
  return localStorage.getItem(ACTIVE_SESSION_KEY) || PRIMARY_SESSION_ID;
}

export function setActiveSessionId(id: string) {
  localStorage.setItem(ACTIVE_SESSION_KEY, id);
}

export function createSession(name: string): Session {
  const sessions = getSessions();
  const session: Session = {
    id: `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || `Session ${sessions.length + 1}`,
    startedAt: new Date().toISOString(),
    endedAt: null,
  };
  setSessions([...sessions, session]);
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
  writeJSON(PEOPLE_KEY, people);
}

export function addPerson(input: Omit<Person, 'id' | 'createdAt'>): Person {
  const person: Person = {
    ...input,
    id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  setPeople([...getPeople(), person]);
  return person;
}

export function updatePerson(id: string, patch: Partial<Omit<Person, 'id' | 'createdAt'>>) {
  setPeople(getPeople().map((p) => (p.id === id ? { ...p, ...patch } : p)));
}

export function deletePerson(id: string) {
  setPeople(getPeople().filter((p) => p.id !== id));
}

// ---- Shares ----

export function getShares(): Share[] {
  return readJSON<Share[]>(SHARES_KEY, []);
}

export function setShares(shares: Share[]) {
  writeJSON(SHARES_KEY, shares);
}

/** Generate a short, URL-friendly code that's hard to guess. */
function generateShareCode(): string {
  // 6 chars, lowercase + digits, omit ambiguous chars (0/o, 1/l/i)
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function createShare(input: {
  sessionId: string;
  ttlHours?: number;
  pin?: string;
}): Share {
  const id = generateShareCode();
  // Ensure unique
  const existing = getShares();
  if (existing.find((s) => s.id === id)) {
    // Astronomically unlikely but handle it
    return createShare(input);
  }
  const ttl = input.ttlHours ?? 24;
  const share: Share = {
    id,
    sessionId: input.sessionId,
    pin: input.pin,
    expiresAt: new Date(Date.now() + ttl * 60 * 60 * 1000).toISOString(),
    revoked: false,
    createdAt: new Date().toISOString(),
  };
  setShares([...existing, share]);
  return share;
}

export function getShare(id: string): Share | null {
  return getShares().find((s) => s.id === id) || null;
}

export function revokeShare(id: string) {
  setShares(getShares().map((s) => (s.id === id ? { ...s, revoked: true } : s)));
}

export function isShareValid(share: Share | null): share is Share {
  if (!share) return false;
  if (share.revoked) return false;
  if (new Date(share.expiresAt).getTime() < Date.now()) return false;
  return true;
}

export function markShareOpened(id: string) {
  setShares(getShares().map((s) => (s.id === id ? { ...s, lastOpenedAt: new Date().toISOString() } : s)));
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
