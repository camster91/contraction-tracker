// Identity — stable, persistent per-browser identity for the activity feed.
//
// v1.1 T3: Per-recipient clientId for identity.
//
// Each browser/device that joins a share gets a stable clientId (UUID-like
// string) generated on first use and persisted in localStorage. The same
// clientId is sent with every message post and SSE connection. The relay
// tracks which authorName is bound to which clientId per share, so:
//   - Jordan's phone sends clientId=abc123, name=Jordan → relay records the binding
//   - Jordan's laptop sends clientId=abc123, name=Jordan → relay accepts (same binding)
//   - Jordan's laptop later sends clientId=abc123, name=Bob → relay rejects
//     (someone changed their name in the same browser, that's a hijack attempt)
//
// The clientId is per-browser, NOT per-share. This means the same clientId is
// used across all shares the user joins, which is what enables the relay to
// track identity across multiple shares if we ever need that.
//
// Storage key: olive:client-id (a single UUID is shared across all shares on
// this device). The name-keyed binding per share is stored in
// olive:client-name:{code}.

const CLIENT_ID_KEY = 'olive:client-id';
const CLIENT_NAME_KEY_PREFIX = 'olive:client-name:';

function generateClientId(): string {
  // 16-char base36 string. Not a real UUID but unique enough for the use case
  // (16^36 ≈ 10^56 possible values, collisions are astronomically rare).
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6);
}

export function getOrCreateClientId(): string {
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY);
    if (existing && /^[a-z0-9]{14,32}$/.test(existing)) return existing;
    const fresh = generateClientId();
    localStorage.setItem(CLIENT_ID_KEY, fresh);
    return fresh;
  } catch {
    // localStorage unavailable (private mode, etc.) — fall back to a
    // per-session ID. The relay still works, just loses cross-session
    // continuity on this device.
    return generateClientId();
  }
}

export function getStoredName(code: string): string | null {
  try {
    return localStorage.getItem(CLIENT_NAME_KEY_PREFIX + code);
  } catch {
    return null;
  }
}

export function storeName(code: string, name: string): void {
  try {
    const trimmed = name.trim();
    if (!trimmed) {
      localStorage.removeItem(CLIENT_NAME_KEY_PREFIX + code);
    } else {
      localStorage.setItem(CLIENT_NAME_KEY_PREFIX + code, trimmed);
    }
  } catch {
    /* ignore */
  }
}

export function clearStoredName(code: string): void {
  try {
    localStorage.removeItem(CLIENT_NAME_KEY_PREFIX + code);
  } catch {
    /* ignore */
  }
}

// The relay is the source of truth for the binding. Frontend mirrors it in
// localStorage for instant UI (so the name field pre-fills). The relay's
// `validateIdentityOnRelay` (see lib/relay.ts) is the authoritative check.
export type IdentityState = {
  clientId: string;
  // Map of code -> name. Multiple codes because a viewer can join multiple
  // shares over time and the relay tracks each independently.
  names: Record<string, string>;
};

export function getIdentityState(): IdentityState {
  return {
    clientId: getOrCreateClientId(),
    names: getAllStoredNames(),
  };
}

function getAllStoredNames(): Record<string, string> {
  try {
    const out: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CLIENT_NAME_KEY_PREFIX)) {
        const code = k.slice(CLIENT_NAME_KEY_PREFIX.length);
        const v = localStorage.getItem(k);
        if (v) out[code] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}
