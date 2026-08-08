// Read-only view of an ended session — shows all contractions without edit controls.
import { useState } from 'react';
import { X, Clock } from 'lucide-react';
import { formatClock, formatDuration, getTags, durationSeconds, intervalSeconds } from '../lib/contractions';
import type { Contraction } from '../lib/contractions';
import type { Session } from '../lib/sessions';
import { useModalDialog } from '../hooks/useModalDialog';

type Props = {
  session: Session;
  contractions: Contraction[];
  onClose: () => void;
};

export default function ViewSessionModal({ session, contractions, onClose }: Props) {
  const dialogRef = useModalDialog(onClose);
  const [now] = useState(() => Date.now());
  const sorted = [...contractions].filter((c) => c.end).sort((a, b) => a.start.localeCompare(b.start));

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Session ${session.name}`}
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-ink-200/30 bg-plum-950/98  shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.6)] max-h-[90dvh] flex flex-col animate-slide-up"
      >
        {/* Handle + header */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-8 h-1 rounded-full bg-ink-200/40" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3">
          <div>
            <div className="text-base font-semibold text-ink-50 font-display">{session.name}</div>
            <div className="text-[11px] text-ink-400 mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Ended {new Date(session.endedAt!).toLocaleDateString()} · {sorted.length} contractions
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-ink-400 active:text-ink-200 rounded-xl active:bg-ink-100/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Contractions */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2">
          {sorted.length === 0 ? (
            <div className="text-center py-8 text-ink-400 text-sm">No contractions in this session.</div>
          ) : (
            sorted.map((c, idx) => {
              const dur = durationSeconds(c, now);
              const prev = idx > 0 ? sorted[idx - 1] : null;
              const gap = prev ? intervalSeconds(prev, c) : null;
              return (
                <div key={c.id} className="rounded-xl border border-ink-200/30 bg-ink-100/5 px-4 py-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-base font-medium text-ink-50">
                      {formatClock(c.start)}
                    </span>
                    <span className="font-display text-lg font-light text-rose-300 tabular-nums">
                      {formatDuration(dur)}
                    </span>
                    {c.intensity && (
                      <span className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">
                        · {c.intensity}/10
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    {gap !== null && <span>{formatDuration(gap)} apart</span>}
                    {getTags(c).map((t) => (
                      <span key={t} className="text-[10px] bg-rose-300/15 text-rose-200 px-1.5 py-0.5 rounded-full">
                        {t}
                      </span>
                    ))}
                    {c.note && <span className="truncate">— {c.note}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
