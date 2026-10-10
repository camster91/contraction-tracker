// Undo stack — captures the most recent destructive action and lets the
// user reverse it until dismissed or the next recording change succeeds.
//
// Each undo entry stores:
//   - The data snapshot to restore (full history list + current timer)
//   - A human label for the toast ("Stopped 1:05 contraction")
//
// When a new action is pushed, any previous pending undo is dropped
// (you can only undo the latest action).

import { useCallback, useState } from 'react';
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
};

export function useUndo() {
  const [pending, setPending] = useState<UndoEntry | null>(null);
  const push = useCallback((entry: UndoEntry) => setPending(entry), []);
  const dismiss = useCallback(() => setPending(null), []);
  // Keep the entry available when persistence rejects a restore.
  const take = useCallback((): UndoEntry | null => pending, [pending]);
  return { pending, push, dismiss, take };
}
