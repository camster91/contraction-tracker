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
): Promise<Message> {
  // Throws on failure rather than returning null. The v1.0.2 audit
  // (a7aead4 comment) and the b75adb5 cycle audit both flagged the
  // earlier return-null pattern: callers wrap this in try/catch but
  // the catch block is dead because we never throw. Worst case was
  // BabyIsHereModal.handleSave — on relay failure the modal would
  // still transition the share to 'postpartum' and close, silently
  // losing the celebration. Throwing here means the catch block
  // in the caller fires and the host sees the error + can retry.
  const res = await fetch(`${RELAY_URL}/api/shares/${code}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, content, authorName, clientId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`postMessage failed: ${res.status} ${res.statusText} ${text}`.trim());
  }
  const data = await res.json();
  if (!data.message) {
    throw new Error(`postMessage: relay returned 200 but no message body`);
  }
  return data.message;
}