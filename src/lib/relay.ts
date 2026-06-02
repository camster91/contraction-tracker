// Relay sync — syncs contraction data with the Luna relay server
// at https://relay.ashbi.ca when a share link is active.
//
// Used by: ShareSheet (push) and ShareView (pull)

const RELAY_URL = 'https://relay.ashbi.ca';

export async function createShareOnRelay(input: {
  sessionId: string;
  pin?: string;
  ttlHours?: number;
}): Promise<{ code: string; expiresAt: string; pin: string | null } | null> {
  try {
    const res = await fetch(`${RELAY_URL}/api/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
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
  try {
    const res = await fetch(`${RELAY_URL}/api/shares/${code}/contractions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractions, current }),
    });
    return res.ok;
  } catch {
    return false;
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

export async function getShareFromRelay(code: string): Promise<{
  code: string;
  sessionId: string;
  hasPin: boolean;
  expiresAt: string;
  lastOpenedAt: string | null;
  createdAt: string;
} | null> {
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

export async function revokeShareOnRelay(code: string): Promise<boolean> {
  try {
    const res = await fetch(`${RELAY_URL}/api/shares/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke' }),
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
