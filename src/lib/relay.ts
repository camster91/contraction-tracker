// Relay sync — syncs contraction data with the Olive relay server
// at https://relay.ashbi.ca when a share link is active.
//
// Used by: ShareSheet (push) and ShareView (pull)
//
// The relay URL is the one piece of config that differs between production
// and a local/staging build. Override at build time with
//   VITE_RELAY_URL=https://my-relay.test npm run build
// or for the Dockerfile:
//   docker build --build-arg VITE_RELAY_URL=https://relay-staging.ashbi.ca .
// If unset, defaults to production. The relay is HTTPS-only — no http://
// fallbacks. If you need to talk to a localhost relay, set
// VITE_RELAY_URL=http://localhost:8787 explicitly.
//
// The default is a const (not a `let`) so a runtime mutation can't
// redirect all subsequent relay calls.
// `import.meta.env` is typed by vite/client (see tsconfig.app.json
// `types: ["vite/client"]`). The `??` keeps the build happy when
// the env var is unset (Vite types it as `string | undefined`).
const configuredRelayUrl = import.meta.env.VITE_RELAY_URL?.trim();
export const RELAY_URL: string =
  configuredRelayUrl || 'https://relay.ashbi.ca';

const HOST_TOKEN_PREFIX = 'olive:share-host-token:';
const ACCESS_TOKEN_PREFIX = 'olive:share-access-token:';

function readToken(prefix: string, code: string): string | null {
  try { return localStorage.getItem(prefix + code); } catch { return null; }
}

function storeToken(prefix: string, code: string, token: string): void {
  try { localStorage.setItem(prefix + code, token); } catch { /* storage unavailable */ }
}

export function getShareCapability(code: string): string | null {
  return readToken(HOST_TOKEN_PREFIX, code) || readToken(ACCESS_TOKEN_PREFIX, code);
}

export function getShareAuthorizationHeaders(code: string): Record<string, string> {
  const token = getShareCapability(code);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getShareEventStreamUrl(code: string): string {
  const token = getShareCapability(code);
  const base = `${RELAY_URL}/api/shares/${code}/stream`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

export async function createShareOnRelay(input: {
  sessionId: string;
  pin?: string;
  ttlHours?: number;
  mode?: string;
  state?: string;
  journeyPermissions?: JourneyPermission[];
}): Promise<{ code: string; expiresAt: string; hostToken: string; hasPin: boolean; state: string; mode: string; journeyPermissions: JourneyPermission[] } | null> {
  try {
    const res = await fetch(`${RELAY_URL}/api/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: input.sessionId, pin: input.pin, ttlHours: input.ttlHours, mode: input.mode, state: input.state, journeyPermissions: input.journeyPermissions }),
    });
    if (!res.ok) return null;
    const result = await res.json();
    if (!result.hostToken || typeof result.hostToken !== 'string') return null;
    storeToken(HOST_TOKEN_PREFIX, result.code, result.hostToken);
    return result;
  } catch {
    return null;
  }
}

export type JourneyPermission = 'responsibilities:read' | 'responsibilities:complete';
export type SharedResponsibility = {
  id: string;
  title: string;
  assigneeName?: string;
  phase?: 'preparing' | 'labor' | 'postpartum' | 'archived';
  completedAt: string | null;
};
export type SharedJourney = { permissions: JourneyPermission[]; responsibilities: SharedResponsibility[]; updatedAt: string | null };

export async function pushJourneyToRelay(code: string, responsibilities: SharedResponsibility[]): Promise<boolean> {
  try {
    const res = await fetch(`${RELAY_URL}/api/shares/${code}/journey`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getShareAuthorizationHeaders(code) },
      body: JSON.stringify({ responsibilities }),
    });
    return res.ok;
  } catch { return false; }
}

export async function pullJourneyFromRelay(code: string): Promise<SharedJourney | null> {
  try {
    const res = await fetch(`${RELAY_URL}/api/shares/${code}/journey`, { headers: getShareAuthorizationHeaders(code) });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function updateSharedResponsibilityOnRelay(code: string, id: string, completed: boolean, identity: {
  clientId: string; clientSecret: string; authorName: string;
}): Promise<SharedResponsibility | null> {
  try {
    const res = await fetch(`${RELAY_URL}/api/shares/${code}/journey/responsibilities/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getShareAuthorizationHeaders(code) },
      body: JSON.stringify({ completed, ...identity }),
    });
    if (!res.ok) return null;
    return (await res.json()).responsibility;
  } catch { return null; }
}

export async function pushContractionsToRelay(
  code: string,
  contractions: unknown[],
  current: unknown,
): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${RELAY_URL}/api/shares/${code}/contractions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getShareAuthorizationHeaders(code) },
        body: JSON.stringify({ contractions, current }),
      });
      if (res.ok) return true;
    } catch {
      // Retry once on network failure
      if (attempt === 0) await new Promise(r => setTimeout(r, 500));
    }
  }
  return false;
}

export type ShareStats = {
  code: string;
  state: string;
  mode: 'full' | 'stats' | 'track';
  totalContractions: number;
  averageDurationSec: number;
  averageIntervalSec: number;
  longestDurationSec: number;
  shortestDurationSec: number;
  totalActiveSec: number;
  fiveOneOne: boolean;
  updatedAt: string | null;
};

export async function getShareStats(code: string): Promise<ShareStats | null> {
  try {
    const res = await fetch(`${RELAY_URL}/api/shares/${code}/stats`, { headers: getShareAuthorizationHeaders(code) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function pullContractionsFromRelay(code: string): Promise<{
  contractions: unknown[];
  current: unknown;
  updatedAt: string | null;
} | null> {
  try {
    const res = await fetch(`${RELAY_URL}/api/shares/${code}/contractions`, { headers: getShareAuthorizationHeaders(code) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// T4: Append a start/stop event to the multi-host event log.
// The relay re-derives the contractions snapshot from the event log
// and returns the latest snapshot in the response. The relay SSE-broadcasts
// an 'event' message so all viewers get a live update.
export type ContractionEvent = {
  type: 'start' | 'stop';
  timestamp?: number;
  authorClientId?: string;
};

export type ContractionEventResponse = {
  ok: boolean;
  type: 'start' | 'stop';
  timestamp: number;
  contractions: Array<{
    start: number;
    end: number;
    duration: number;
    author: string | null;
    stoppedBy: string | null;
  }>;
  current: { start: number; author: string | null } | null;
  updatedAt: string;
};

export async function postContractionEventToRelay(
  code: string,
  event: ContractionEvent,
): Promise<ContractionEventResponse | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${RELAY_URL}/api/shares/${code}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getShareAuthorizationHeaders(code) },
        body: JSON.stringify({
          type: event.type,
          timestamp: event.timestamp ?? Date.now(),
          authorClientId: event.authorClientId ?? null,
        }),
      });
      if (res.status === 403) return null; // 'stats' mode — events not allowed
      if (!res.ok) return null;
      return await res.json();
    } catch {
      if (attempt === 0) await new Promise(r => setTimeout(r, 500));
    }
  }
  return null;
}

export type ShareFromRelay = {
  code: string;
  sessionId: string;
  hasPin: boolean;
  mode: 'full' | 'stats' | 'track';
  state: string;
  expiresAt: string;
  lastOpenedAt: string | null;
  createdAt: string;
  stateChangedAt: string | null;
  journeyPermissions?: JourneyPermission[];
};

export async function getShareFromRelay(code: string): Promise<ShareFromRelay | null> {
  try {
    const res = await fetch(`${RELAY_URL}/api/shares/${code}`, { headers: getShareAuthorizationHeaders(code) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// T11: validate a PIN against the relay. The relay is the source of truth
// for the PIN — never trust a client-side string comparison (the local
// `share.pin` is the masked '••••' placeholder, not the real PIN).
//
// Return shape:
//   { ok: true,  }                 — PIN matched
//   { ok: false, reason: 'pin' }   — wrong PIN
//   { ok: false, reason: 'network' } — network/HTTP error (caller decides
//                                     whether to show a retry or treat as
//                                     locked-out)
export type PinValidation =
  | { ok: true }
  | { ok: false; reason: 'pin' | 'network' };

export async function validatePinOnRelay(code: string, pin: string): Promise<PinValidation> {
  try {
    const res = await fetch(`${RELAY_URL}/api/shares/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'validate-pin', pin }),
    });
    if (res.ok) {
      const data = await res.json();
      if (!data.accessToken || typeof data.accessToken !== 'string') return { ok: false, reason: 'network' };
      storeToken(ACCESS_TOKEN_PREFIX, code, data.accessToken);
      return { ok: true };
    }
    if (res.status === 401 || res.status === 403) return { ok: false, reason: 'pin' };
    return { ok: false, reason: 'network' };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

export type ShareAudit = {
  code: string;
  state: string;
  revoked: boolean;
  revokedAt: string | null;
  revokedByClientId: string | null;
  revokedReason: string | null;
  createdAt: string;
  expiresAt: string;
  lastOpenedAt: string | null;
  events: Array<{
    id: string;
    kind: string;
    clientId: string | null;
    actorName: string | null;
    meta: any;
    createdAt: string;
  }>;
};

export async function getShareAudit(code: string): Promise<ShareAudit | null> {
  try {
    const res = await fetch(`${RELAY_URL}/api/shares/${code}/audit`, { headers: getShareAuthorizationHeaders(code) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function revokeShareOnRelay(code: string, reason?: string, clientId?: string): Promise<boolean> {
  try {
    const res = await fetch(`${RELAY_URL}/api/shares/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getShareAuthorizationHeaders(code) },
      body: JSON.stringify({ action: 'revoke', reason: reason || null, clientId: clientId || null }),
    });
    if (res.ok) {
      try {
        localStorage.removeItem(HOST_TOKEN_PREFIX + code);
        localStorage.removeItem(ACCESS_TOKEN_PREFIX + code);
      } catch { /* ignore */ }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function markShareOpenedOnRelay(code: string): Promise<boolean> {
  try {
    const res = await fetch(`${RELAY_URL}/api/shares/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getShareAuthorizationHeaders(code) },
      body: JSON.stringify({ action: 'opened' }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function setShareStateOnRelay(code: string, state: string): Promise<boolean> {
  try {
    const res = await fetch(`${RELAY_URL}/api/shares/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getShareAuthorizationHeaders(code) },
      body: JSON.stringify({ action: 'set-state', state }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
