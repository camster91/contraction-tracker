// BroadcastChannel-based cross-tab sync. Not a real backend — this is
// best-effort local sync between tabs on the same device. Emits whenever
// contractions or current-timer change, so another tab sees live updates.

import type { Contraction } from './contractions';

type SyncMessage =
  | { type: 'contractions'; contractions: Contraction[] }
  | { type: 'current'; current: Contraction | null };

let channel: BroadcastChannel | null = null;

export function initSync(
  onContractions: (c: Contraction[]) => void,
  onCurrent: (c: Contraction | null) => void,
) {
  if (typeof BroadcastChannel === 'undefined') return;
  channel = new BroadcastChannel('luna');
  channel.onmessage = (e: MessageEvent<SyncMessage>) => {
    if (e.data.type === 'contractions') onContractions(e.data.contractions);
    if (e.data.type === 'current') onCurrent(e.data.current);
  };
}

export function broadcastContractions(contractions: Contraction[]) {
  channel?.postMessage({ type: 'contractions', contractions } as SyncMessage);
}

export function broadcastCurrent(current: Contraction | null) {
  channel?.postMessage({ type: 'current', current } as SyncMessage);
}