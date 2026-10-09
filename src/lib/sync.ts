// BroadcastChannel-based cross-tab sync. Not a real backend — this is
// best-effort local sync between tabs on the same device. Emits whenever
// contractions or current-timer change, so another tab sees live updates.
//
// Echo guard: the previous implementation used a `receiveInFlight` counter
// that was decremented via queueMicrotask after a setState. The intent was
// to suppress rebroadcast in the same tab that just received a change.
// But React's useEffect (which is what calls broadcastContractions after
// a state change) runs AFTER queueMicrotask, so by the time the broadcast
// was about to happen, the counter was already back to 0. The guard never
// actually fired. Result: every tab that received a change rebroadcast it,
// and every other tab received that, and so on — infinite thrash.
//
// Fix: stamp each broadcast with a short content hash + a per-tab id. On
// receive, check the incoming (payload type, hash) against a small LRU of
// keys seen recently, regardless of source. If seen, drop the message — it
// is a logical duplicate being rebroadcast through the network of tabs.
//
// The tab id remains on messages for diagnostics and future ordering work.
// The local LRU handles logical duplicates, while the payload type keeps an
// independently-broadcast current timer from colliding with array state.
//
import type { Contraction } from './contractions';

type SyncMessage = {
  /** Unique-ish tag identifying the source tab. */
  tabId: string;
  /** Content hash of the payload — short, fast, good-enough. */
  hash: string;
  payload:
    | { type: 'contractions'; contractions: Contraction[] }
    | { type: 'current'; current: Contraction | null };
};

let channel: BroadcastChannel | null = null;

// Per-tab id. Random once at module init — collisions are vanishingly
// unlikely (a device has at most a handful of tabs and we use 8 random
// base36 chars = 41 bits of entropy).
const tabId =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

// Bounded LRU of recently-seen payload keys (any source). The payload type
// is part of the key: a current-timer message and a contractions-array
// message must not suppress one another when their content hashes match.
// When a message arrives, check before remembering it. Remembering first
// would make every incoming message look like a duplicate and disable
// cross-tab sync entirely.
const RECENT_HASH_LIMIT = 16;
const recentHashes: string[] = [];

type PayloadType = SyncMessage['payload']['type'];

function payloadKey(type: PayloadType, hash: string): string {
  return `${type}:${hash}`;
}

function rememberHash(type: PayloadType, hash: string) {
  const key = payloadKey(type, hash);
  if (!recentHashes.includes(key)) {
    recentHashes.push(key);
    if (recentHashes.length > RECENT_HASH_LIMIT) recentHashes.shift();
  }
}

function isDuplicate(type: PayloadType, hash: string): boolean {
  return recentHashes.includes(payloadKey(type, hash));
}

/**
 * Cheap content hash. We're not doing crypto — just want collisions to
 * be vanishingly unlikely for "same logical change". FNV-1a is fast,
 * 32-bit, and good enough for dedupe.
 */
function contentHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(36);
}

function hashContractions(contractions: Contraction[]): string {
  // Preserve array order and all user-authored fields. A note/tag/photo
  // edit is a real state change and must not be treated as the same payload
  // as the previous contraction record with the same id and timestamps.
  return contentHash(
    JSON.stringify(contractions.map((c) => ({
      id: c.id,
      start: c.start,
      end: c.end,
      source: c.source ?? null,
      intensity: c.intensity ?? null,
      note: c.note ?? null,
      tags: c.tags ?? [],
      sessionId: c.sessionId ?? null,
      painLocations: c.painLocations ?? [],
      voiceMemo: c.voiceMemo ?? null,
      photo: c.photo ?? null,
    }))),
  );
}

function hashCurrent(current: Contraction | null): string {
  if (!current) return 'null';
  return contentHash(JSON.stringify({
    id: current.id,
    start: current.start,
    end: current.end,
    source: current.source ?? null,
    intensity: current.intensity ?? null,
    note: current.note ?? null,
    tags: current.tags ?? [],
    sessionId: current.sessionId ?? null,
    painLocations: current.painLocations ?? [],
    voiceMemo: current.voiceMemo ?? null,
    photo: current.photo ?? null,
  }));
}

export function initSync(
  onContractions: (c: Contraction[]) => void,
  onCurrent: (c: Contraction | null) => void,
) {
  if (typeof BroadcastChannel === 'undefined') return;
  try {
    channel?.close();
  } catch {
    // ignore — closing a never-opened channel can throw on some browsers
  }
  channel = new BroadcastChannel('olive');
  channel.onmessage = (e: MessageEvent<SyncMessage>) => {
    const { hash, payload } = e.data;
    if (!payload || (payload.type !== 'contractions' && payload.type !== 'current') || typeof hash !== 'string') return;
    if (isDuplicate(payload.type, hash)) {
      // We sent this ourselves (defensive — BroadcastChannel
      // doesn't normally deliver to the sender) or we just received
      // the same logical change from another tab. Either way, drop.
      return;
    }
    // Remember before dispatching so the state effect's rebroadcast is
    // recognized as the same logical update by the other tabs.
    rememberHash(payload.type, hash);
    if (payload.type === 'contractions') onContractions(payload.contractions);
    if (payload.type === 'current') onCurrent(payload.current);
  };
}

/**
 * @deprecated The receive-in-flight counter was broken (see file comment).
 * Kept as a no-op so old import sites don't break. The seq+hash-based
 * echo guard inside broadcastContractions/broadcastCurrent handles
 * suppression now.
 */
export function isReceiving(): boolean {
  return false;
}

export function broadcastContractions(contractions: Contraction[]) {
  if (!channel) return;
  const hash = hashContractions(contractions);
  // Remember our own hash so a hypothetical return-to-sender is dropped.
  rememberHash('contractions', hash);
  const msg: SyncMessage = {
    tabId,
    hash,
    payload: { type: 'contractions', contractions },
  };
  try {
    channel.postMessage(msg);
  } catch {
    // BroadcastChannel can throw on serialization errors (e.g. circular
    // refs in a Contraction). Swallow — cross-tab sync is best-effort.
  }
}

export function broadcastCurrent(current: Contraction | null) {
  if (!channel) return;
  const hash = hashCurrent(current);
  rememberHash('current', hash);
  const msg: SyncMessage = {
    tabId,
    hash,
    payload: { type: 'current', current },
  };
  try {
    channel.postMessage(msg);
  } catch {
    // best-effort
  }
}
