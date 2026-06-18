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

/**
 * Typed error thrown by postMessage. The `code` lets callers
 * distinguish failure modes:
 *   - 'network': fetch threw (no response). Retryable.
 *   - 'http'   : non-2xx response. The relay explicitly rejected
 *                the message (e.g. archived share, validation).
 *                Usually NOT retryable as-is.
 *   - 'shape'  : 2xx but response body missing `message`. The relay
 *                is reachable but speaking a different shape. Bug.
 * The `status` field is set for 'http' errors.
 *
 * Callers can switch on err.code to decide whether to retry.
 */
export class PostMessageError extends Error {
  code: 'network' | 'http' | 'shape';
  status: number | null;
  constructor(
    code: 'network' | 'http' | 'shape',
    message: string,
    status: number | null = null,
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'PostMessageError';
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
  let res: Response;
  try {
    res = await fetch(`${RELAY_URL}/api/shares/${code}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, content, authorName, clientId }),
    });
  } catch (err) {
    // fetch threw — no response at all. Network-level failure.
    // Retryable: the user can tap the retry button.
    throw new PostMessageError(
      'network',
      `Couldn't reach the share server: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new PostMessageError(
      'http',
      `postMessage failed: ${res.status} ${res.statusText} ${text}`.trim(),
      res.status,
    );
  }
  let data: { message?: Message };
  try {
    data = await res.json();
  } catch {
    throw new PostMessageError(
      'shape',
      'postMessage: relay returned 2xx but no parseable JSON body',
    );
  }
  if (!data.message) {
    throw new PostMessageError(
      'shape',
      'postMessage: relay returned 200 but no message body',
    );
  }
  return data.message;
}