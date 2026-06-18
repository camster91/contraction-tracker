// ToastHost — renders the current toast from the global store.
// Mount once at the app root.
//
// Visual design: matches the existing Undo toast in App.tsx.
// Bottom-center for success/info (calm, not interrupting the timer),
// top-center for error (more attention, like the existing data-
// damaged and quota toasts).
//
// Accessibility:
//   - aria-live="polite" for success/info (announce when idle)
//   - aria-live="assertive" for error (announce immediately)
//   - role="status" for polite, role="alert" for assertive
//   - Dismiss button has an aria-label

import { useEffect, useState } from 'react';
import { X, Check, AlertTriangle, Info } from 'lucide-react';
import { useToast, toast } from '../lib/toast';

export default function ToastHost() {
  const t = useToast();
  // Tick once a second so the auto-dismiss timer fires on schedule
  // even if the user is idle (no other state change triggers a
  // re-render). Cheap.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!t) return;
    if (t.duration <= 0) return;
    const id = setTimeout(() => {
      toast.dismiss();
      setTick((n) => n + 1);
    }, t.duration);
    return () => clearTimeout(id);
  }, [t?.id, t?.duration]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!t) return null;

  const isError = t.variant === 'error';
  const isInfo = t.variant === 'info';
  const Icon = isError ? AlertTriangle : isInfo ? Info : Check;
  // Success: bottom-center (calm, doesn't block the timer).
  // Error: top-center (more attention, matches the existing data-
  // damaged and quota toasts in App.tsx).
  const position = isError ? 'top-6' : 'bottom-6';
  const tone = isError
    ? 'bg-rose-300/15 border-rose-300/40 text-rose-200'
    : isInfo
      ? 'bg-ink-100/10 border-ink-200/40 text-ink-100'
      : 'bg-plum-950/95 border-ink-200/40 text-ink-100';

  return (
    <div
      className={`fixed inset-x-0 ${position} z-50 flex justify-center pointer-events-none`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <div
        className={`pointer-events-auto mx-4 flex items-center gap-3 ${tone} border backdrop-blur-xl rounded-2xl px-4 py-2.5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] max-w-sm animate-fade-in`}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${isError ? 'text-rose-300' : isInfo ? 'text-ink-300' : 'text-rose-300'}`} strokeWidth={2} />
        <span className="text-sm flex-1 min-w-0">{t.message}</span>
        <button
          onClick={() => toast.dismiss()}
          className="p-1 text-ink-400 active:text-ink-200 flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
