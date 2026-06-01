// Undo stack — captures the most recent destructive action and lets the
// user reverse it within 5 seconds. A tiny, dependency-free state machine.
//
// Each undo entry stores:
//   - The data snapshot to restore (full history list + current timer)
//   - A human label for the toast ("Stopped 1:05 contraction")
//   - An expiration timestamp
//
// When a new action is pushed, any previous pending undo is dropped
// (you can only undo the latest action).

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Contraction } from './contractions';

export type UndoEntry = {
  /** Full history list to restore */
  contractions: Contraction[];
  /** Current in-progress timer to restore (or null) */
  current: Contraction | null;
  /** Label for the toast, e.g. "Stopped 1:05 contraction" */
  label: string;
  /** Action kind for analytics / debug */
  kind: 'stop' | 'delete' | 'clear' | 'discard';
  /** Timestamp when this entry expires (ms since epoch) */
  expiresAt: number;
};

const UNDO_WINDOW_MS = 5000;

export function useUndo() {
  const [pending, setPending] = useState<UndoEntry | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => clearTimer, []);

  const push = useCallback(
    (entry: Omit<UndoEntry, 'expiresAt'>) => {
      clearTimer();
      const next: UndoEntry = { ...entry, expiresAt: Date.now() + UNDO_WINDOW_MS };
      setPending(next);
      timeoutRef.current = window.setTimeout(() => {
        setPending(null);
        timeoutRef.current = null;
      }, UNDO_WINDOW_MS);
    },
    [],
  );

  const dismiss = useCallback(() => {
    clearTimer();
    setPending(null);
  }, []);

  // Take and return the current pending undo without clearing the timer.
  // Caller can use the result to restore state, then calls dismiss().
  const take = useCallback((): UndoEntry | null => pending, [pending]);

  return { pending, push, dismiss, take };
}
