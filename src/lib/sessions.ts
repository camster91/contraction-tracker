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
  id: string;            // short code used in the URL (e.g. "olive-3kf8")
  sessionId: string;
  mode?: string;         // 'partner' | 'friends' — default 'partner'
  pin?: string;          // optional 4-digit PIN
  state?: 'prenatal' | 'labor' | 'postpartum' | 'archived'; // default 'prenatal'
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
  const arr = readJSON<Share[]>(SHARES_KEY, []);
  // Filter out expired/revoked shares so the UI only shows live ones.
  // This also acts as garbage collection — old 30-day-TTL shares
  // (from before the 7-day switch) eventually self-clean.
  return arr.filter(isShareValid);
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
  // Optional id override — used by handleCreate to pass the relay's
  // returned code so the local shares array and the relay row point at
  // the same id. Without this, the local store and the relay each
  // generated their own code and the host-marker / partner-URL lookups
  // would miss when the two didn't happen to collide.
  id?: string;
  ttlHours?: number;
  pin?: string;
  mode?: string;
}): Share {
  // One share per session. If an active share already exists for this
  // session, return it instead of creating a new one. This means the
  // partner with the existing code keeps seeing live updates as the
  // session progresses — no broken links, no multiple codes to track.
  const existing = getShares();
  const active = existing.find(
    (s) => s.sessionId === input.sessionId && isShareValid(s),
  );
  if (active) {
    // Update mode if the user is upgrading from "friends" to "partner"
    // or vice versa. Keep the same code.
    if (input.mode && input.mode !== active.mode) {
      active.mode = input.mode;
      setShares(existing);
    }
    return active;
  }
  const id = input.id || generateShareCode();
  // Ensure unique across all sessions (defensive — should not collide
  // with input.id since the relay guarantees uniqueness; only matters
  // for the locally-generated fallback).
  if (existing.find((s) => s.id === id)) {
    return createShare(input);
  }
  const ttl = input.ttlHours ?? 168; // 7 days default — long enough to
  // cover early labor through postpartum; short enough that an
  // abandoned share self-destructs within a week.
  const share: Share = {
    id,
    sessionId: input.sessionId,
    mode: input.mode || 'full',
    pin: input.pin,
    state: 'prenatal',
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

export function setShareState(id: string, state: 'prenatal' | 'labor' | 'postpartum' | 'archived') {
  setShares(getShares().map((s) => (s.id === id ? { ...s, state } : s)));
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
