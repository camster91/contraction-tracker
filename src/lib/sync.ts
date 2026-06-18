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
// Fix: stamp each broadcast with a short content hash + a per-tab
// monotonic seq. On receive, check the incoming (tabId, hash) against a
// small LRU of "hashes I have seen recently, regardless of source". If
// seen, drop the message — it's a logical duplicate being rebroadcast
// through the network of tabs.
//
// Why hash + tabId (and not just hash)? Two tabs can independently make
// the same edit (e.g. user clicks Start in both at the same moment).
// Their hashes will collide, but each tab's LRU is local — tab A's
// "I just sent this" check uses A's LRU. We need both the hash (to
// recognize logical duplicates) and the tabId (to know if it was us
// or another tab that sent it).
//
// Why not sequence numbers alone? Seq is per-tab-monotonic, but if
// Tab A sends seq=1, Tab B applies it and re-broadcasts seq=2, Tab A
// receives seq=2, applies it, re-broadcasts seq=3, etc. — the seq
// always differs but the content is the same. Hash catches this.

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

// Bounded LRU of recently-seen hashes (any source). When a message
// arrives, we check the hash. If seen, drop. We also remember the
// hash of messages we sent so a message that comes back to us
// (shouldn't happen per spec, but defensively) is dropped.
const RECENT_HASH_LIMIT = 16;
const recentHashes: string[] = [];

function rememberHash(hash: string) {
  if (!recentHashes.includes(hash)) {
    recentHashes.push(hash);
    if (recentHashes.length > RECENT_HASH_LIMIT) recentHashes.shift();
  }
}

function isDuplicate(hash: string): boolean {
  return recentHashes.includes(hash);
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
  // Only the IDs, starts, and ends are stable signal. Notes/tags/
  // voiceMemo/photo are high-cardinality but change-with-the-same-id;
  // we want the hash to be stable enough to dedupe the "this exact
  // state was just sent" case. If two tabs edit different fields of
  // the same contraction concurrently, the result will diverge
  // locally and the thrash will resolve to last-write-wins (which is
  // what the user wants anyway).
  return contentHash(
    contractions
      .map((c) => `${c.id}:${c.start}:${c.end ?? ''}:${c.intensity ?? ''}`)
      .join('|'),
  );
}

function hashCurrent(current: Contraction | null): string {
  if (!current) return 'null';
  return contentHash(`${current.id}:${current.start}:${current.end ?? ''}:${current.intensity ?? ''}`);
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
    // Remember this hash BEFORE dispatching. If onContractions ends
    // up triggering a broadcast (via setContractions -> useEffect),
    // that broadcast will compute the same hash and remember it,
    // so any subsequent round-trip will be detected.
    rememberHash(hash);
    if (isDuplicate(hash)) {
      // We sent this ourselves (defensive — BroadcastChannel
      // doesn't normally deliver to the sender) or we just received
      // the same logical change from another tab. Either way, drop.
      return;
    }
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
  rememberHash(hash);
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
  rememberHash(hash);
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
