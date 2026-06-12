// Relay sync — syncs contraction data with the Olive relay server
// at https://relay.ashbi.ca when a share link is active.
//
// Used by: ShareSheet (push) and ShareView (pull)

export const RELAY_URL = 'https://relay.ashbi.ca';

export async function createShareOnRelay(input: {
  sessionId: string;
  pin?: string;
  ttlHours?: number;
  mode?: string;
  state?: string;
}): Promise<{ code: string; expiresAt: string; pin: string | null; state: string } | null> {
  try {
    const res = await fetch(`${RELAY_URL}/api/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: input.sessionId, pin: input.pin, ttlHours: input.ttlHours, mode: input.mode, state: input.state }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
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
        headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`${RELAY_URL}/api/shares/${code}/stats`);
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
    const res = await fetch(`${RELAY_URL}/api/shares/${code}/contractions`);
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
        headers: { 'Content-Type': 'application/json' },
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
};

export async function getShareFromRelay(code: string): Promise<ShareFromRelay | null> {
  try {
    const res = await fetch(`${RELAY_URL}/api/shares/${code}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function validatePinOnRelay(code: string, pin: string): Promise<boolean> {
  try {
    const res = await fetch(`${RELAY_URL}/api/shares/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'validate-pin', pin }),
    });
    return res.ok;
  } catch {
    return false;
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
    const res = await fetch(`${RELAY_URL}/api/shares/${code}/audit`);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke', reason: reason || null, clientId: clientId || null }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function markShareOpenedOnRelay(code: string): Promise<boolean> {
  try {
    const res = await fetch(`${RELAY_URL}/api/shares/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set-state', state }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
