// Tiny global toast store. Replaces native alert()/confirm() for
// transient feedback ("Copied to clipboard", "Could not share the
// backup file", etc.) without blocking the page.
//
// Design choices:
//   - Module-level state + subscribe pattern (Zustand-style). No
//     provider, no context — components just call toast.success()
//     and the <ToastHost> renders.
//   - One toast at a time, FIFO queue. A new toast replaces the
//     current one (last-write-wins) — simpler than a queue and
//     matches what the app actually needs (one confirmation at a
//     time).
//   - Auto-dismiss timer. Success toasts dismiss in 3s, errors in
//     6s (longer for the user to read).
//   - Manual dismiss via the X button calls toast.dismiss().
//   - aria-live="polite" for success, "assertive" for error.
//     Screen readers will announce errors immediately and success
//     messages when idle.
//
// Why not react-hot-toast / sonner / etc.? All add 5-15KB. This
// implementation is ~80 lines and adds 0 KB (inlined). The native
// alert() calls we're replacing are 8 callsites total — the
// dependency overhead is not worth it.

import { useEffect, useState } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
  /** ms until auto-dismiss. 0 = sticky. */
  duration: number;
};

let current: Toast | null = null;
const listeners = new Set<(t: Toast | null) => void>();
let nextId = 1;

function show(message: string, variant: ToastVariant, duration: number) {
  // Replace any current toast. The id is informational only.
  const t: Toast = { id: nextId++, message, variant, duration };
  current = t;
  for (const l of listeners) l(t);
}

export const toast = {
  success(message: string, opts: { duration?: number } = {}) {
    show(message, 'success', opts.duration ?? 3000);
  },
  error(message: string, opts: { duration?: number } = {}) {
    show(message, 'error', opts.duration ?? 6000);
  },
  info(message: string, opts: { duration?: number } = {}) {
    show(message, 'info', opts.duration ?? 4000);
  },
  dismiss() {
    current = null;
    for (const l of listeners) l(null);
  },
};

/** Hook for components that want to render the toast host. */
export function useToast(): Toast | null {
  const [t, setT] = useState<Toast | null>(current);
  useEffect(() => {
    listeners.add(setT);
    // Re-emit current value on mount in case it changed before the
    // listener was attached (e.g. SSR or fast-mount races). Cheap.
    setT(current);
    return () => {
      listeners.delete(setT);
    };
  }, []);
  return t;
}
