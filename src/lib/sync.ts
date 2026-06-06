// BroadcastChannel-based cross-tab sync. Not a real backend — this is
// best-effort local sync between tabs on the same device. Emits whenever
// contractions or current-timer change, so another tab sees live updates.
//
// Echo guard: a tiny "receive-in-flight" flag prevents the receiving tab
// from rebroadcasting the change it just absorbed (which would otherwise
// cause both tabs to thrash on the same data).

import type { Contraction } from './contractions';

type SyncMessage =
  | { type: 'contractions'; contractions: Contraction[] }
  | { type: 'current'; current: Contraction | null };

let channel: BroadcastChannel | null = null;
let receiveInFlight = 0;

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
    receiveInFlight++;
    try {
      if (e.data.type === 'contractions') onContractions(e.data.contractions);
      if (e.data.type === 'current') onCurrent(e.data.current);
    } finally {
      // release on next microtask so the resulting setState + save useEffect
      // sees the flag and skips the rebroadcast
      queueMicrotask(() => {
        receiveInFlight = Math.max(0, receiveInFlight - 1);
      });
    }
  };
}

export function isReceiving(): boolean {
  return receiveInFlight > 0;
}

export function broadcastContractions(contractions: Contraction[]) {
  if (receiveInFlight > 0) return;
  channel?.postMessage({ type: 'contractions', contractions } as SyncMessage);
}

export function broadcastCurrent(current: Contraction | null) {
  if (receiveInFlight > 0) return;
  channel?.postMessage({ type: 'current', current } as SyncMessage);
}
