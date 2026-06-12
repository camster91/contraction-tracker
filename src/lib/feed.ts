// Activity feed — wraps the relay messages API
// Used by ActivityFeed.tsx and host-side status posting

import { RELAY_URL } from './relay';

export type MessageKind = 'reaction' | 'text' | 'image' | 'voice' | 'status';

export type Message = {
  id: string;
  shareId: string;
  kind: MessageKind;
  authorName: string;
  content: string;
  clientId?: string | null;
  createdAt: string; // ISO
};

export async function getMessages(code: string): Promise<Message[]> {
  try {
    const res = await fetch(`${RELAY_URL}/api/shares/${code}/messages`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.messages || [];
  } catch {
    return [];
  }
}

export async function postMessage(
  code: string,
  kind: MessageKind,
  content: string,
  authorName: string,
  clientId?: string,
): Promise<Message | null> {
  try {
    const res = await fetch(`${RELAY_URL}/api/shares/${code}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, content, authorName, clientId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.message || null;
  } catch {
    return null;
  }
}