// useShareActivity — subscribe to SSE for viewer messages on a given share.
// Used by the main app shell to show a toast when a partner reacts or posts
// in the activity feed while the host is in the timer view (not on /?share=).
//
// v1.1: T2 — host sees viewer activity in real time on the main app.
//
// The /api/shares/:code/stream endpoint broadcasts { type: 'message', message }
// for activity feed posts. It also broadcasts { type: 'update', ... } for
// contraction updates and { type: 'state', ... } for state changes. We only
// care about 'message' here — contraction updates are handled by the existing
// ShareView subscription, and state changes are local-only (host initiates them).
//
// Single subscription per share. If the host has multiple active shares, each
// gets its own EventSource. We dedupe by message id so re-broadcasts don't
// trigger duplicate toasts.

import { useEffect, useRef, useState } from 'react';
import { getShareEventStreamUrl } from './relay';

export type IncomingMessage = {
  id: string;
  shareId: string;
  kind: 'reaction' | 'text' | 'image' | 'status';
  authorName: string;
  content: string;
  createdAt: string;
};

export type ShareActivity = {
  // Most recent message we got from this share's activity feed.
  // null until the first event arrives (or after reconnect recovery).
  latest: IncomingMessage | null;
  // Whether the SSE connection is currently working.
  connected: boolean;
  // Increments on every new unique message — used as a "force re-render" hint
  // for components that want to count events without re-reading `latest`.
  eventCount: number;
};

export function useShareActivitySubscription(code: string | null): ShareActivity {
  const [latest, setLatest] = useState<IncomingMessage | null>(null);
  const [connected, setConnected] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  // Refs so reconnect logic always reads the freshest values without re-binding.
  const seenRef = useRef<Set<string>>(new Set());
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!code) {
      setLatest(null);
      setConnected(false);
      return;
    }

    // Reset on code change — different share = different conversation.
    seenRef.current = new Set();
    reconnectAttemptsRef.current = 0;
    setLatest(null);
    setConnected(false);
    setEventCount(0);

    const url = getShareEventStreamUrl(code);

    const connect = () => {
      try {
        const es = new EventSource(url);
        esRef.current = es;
        es.onopen = () => {
          setConnected(true);
          reconnectAttemptsRef.current = 0;
        };
        es.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (payload.type !== 'message' || !payload.message) return;
            const msg = payload.message as IncomingMessage;
            if (seenRef.current.has(msg.id)) return; // dedupe
            seenRef.current.add(msg.id);
            setLatest(msg);
            setEventCount((n) => n + 1);
          } catch {
            // Malformed event — ignore.
          }
        };
        es.onerror = () => {
          setConnected(false);
          // EventSource auto-reconnects on a near-instant loop. Close ours and
          // schedule a backoff so 20 viewers don't all reconnect in lockstep.
          try { es.close(); } catch { /* ignore */ }
          esRef.current = null;
          reconnectAttemptsRef.current += 1;
          // Cap backoff at 30s.
          const delay = Math.min(30_000, 1000 * 2 ** reconnectAttemptsRef.current);
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(connect, delay);
        };
      } catch {
        // Browser doesn't support EventSource (very rare) — leave connected=false
        // and don't try to reconnect.
      }
    };

    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      try { esRef.current?.close(); } catch { /* ignore */ }
      esRef.current = null;
    };
  }, [code]);

  return { latest, connected, eventCount };
}
