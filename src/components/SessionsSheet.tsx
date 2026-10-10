// Session picker — list, create, switch active, end, delete.
// The active session is stored separately so Cam can quickly hop between
// past and current labor sessions.

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '../lib/toast';
import { Plus, Square, Trash2, ArrowLeft, Play, Eye } from 'lucide-react';
import {
  PRIMARY_SESSION_ID,
  sessionDisplayName,
  type Session,
  createSession,
  deleteSession,
  endSession,
  getActiveSessionId,
  getSessions,
  setActiveSessionId,
} from '../lib/sessions';
import { contractionsInSession } from '../lib/sessions';
import { getStoredChecklist } from '../lib/checklist';
import { getExams } from '../lib/hospital';
import type { Contraction } from '../lib/contractions';
import { BrandIllustration } from './Brand';
import { useModalDialog } from '../hooks/useModalDialog';

type Props = {
  contractions: Contraction[];
  activeSessionId: string;
  runningSessionId?: string | null;
  onActiveChange: (id: string) => void;
  onSessionsChange?: (sessions: Session[]) => void;
  onClose: () => void;
  onViewSession: (session: Session) => void;
};

export default function SessionsSheet({
  contractions,
  activeSessionId,
  runningSessionId = null,
  onActiveChange,
  onSessionsChange,
  onClose,
  onViewSession,
}: Props) {
  const dialogRef = useModalDialog(onClose);
  const [sessions, setSessions] = useState<Session[]>(() => getSessions());
  // Live tick — refreshes the "5h 23m" duration display every 60s
  const [_, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; variant: 'info' | 'error' } | null>(null);

  const refreshSessions = () => {
    const next = getSessions();
    setSessions(next);
    onSessionsChange?.(next);
    return next;
  };

  const stopBeforeChanging = () => {
    const message = 'Stop the active contraction before changing sessions.';
    setFeedback({ message, variant: 'info' });
  };

  const switchTo = (id: string, available = sessions, force = false) => {
    const target = available.find((session) => session.id === id);
    if (!target || target.endedAt) return false;
    if (!force && runningSessionId && runningSessionId !== id) {
      stopBeforeChanging();
      return false;
    }
    if (!setActiveSessionId(id)) {
      const message = 'Could not switch sessions. Free some storage and try again.';
      setFeedback({ message, variant: 'error' });
      return false;
    }
    onActiveChange(id);
    return true;
  };

  const handleCreate = () => {
    if (runningSessionId) {
      stopBeforeChanging();
      return;
    }
    const sess = createSession(name);
    if (!sess) { toast.error('Could not save this session. Free up space and try again.'); return; }
    const next = refreshSessions();
    if (switchTo(sess.id, next)) setFeedback(null);
    setCreating(false);
    setName('');
  };

  const handleEnd = (id: string) => {
    if (runningSessionId === id) {
      stopBeforeChanging();
      return;
    }
    const wasActive = activeSessionId === id || getActiveSessionId() === id;
    // End-session is reversible (the session stays in the list, can be
    // re-opened) and there's no data loss. No confirm needed. (Previously
    // used window.confirm, which blocks the page and is flaky on iOS PWAs.)
    if (!endSession(id)) {
      const message = 'Could not end this session. Nothing was changed; free some storage and try again.';
      setFeedback({ message, variant: 'error' });
      return;
    }
    const next = refreshSessions();
    setFeedback(null);
    if (wasActive && next.some(session => session.id === PRIMARY_SESSION_ID)) onActiveChange(PRIMARY_SESSION_ID);
  };

  // Inline two-tap delete confirmation. First tap arms it; second tap
  // (within ARM_WINDOW_MS) confirms. The trash button briefly shows
  // "Tap to confirm" with a red background. Auto-disarms if the user
  // doesn't follow through. Replaces the old window.confirm() that
  // blocked the page and was flaky on iOS PWAs.
  const [armedDeleteId, setArmedDeleteId] = useState<string | null>(null);
  const armTimerRef = useRef<number | null>(null);
  const ARM_WINDOW_MS = 4000;

  const disarmDelete = useCallback(() => {
    if (armTimerRef.current) {
      window.clearTimeout(armTimerRef.current);
      armTimerRef.current = null;
    }
    setArmedDeleteId(null);
  }, []);

  useEffect(() => disarmDelete, [disarmDelete]);

  const armDelete = (id: string) => {
    if (id === PRIMARY_SESSION_ID) return;
    disarmDelete();
    setArmedDeleteId(id);
    armTimerRef.current = window.setTimeout(disarmDelete, ARM_WINDOW_MS);
  };

  const handleDelete = (id: string) => {
    if (id === PRIMARY_SESSION_ID) return; // button is disabled for primary
    if (runningSessionId === id) {
      stopBeforeChanging();
      return;
    }
    if (armedDeleteId !== id) {
      armDelete(id);
      return;
    }
    // Confirmed — disarm and delete.
    disarmDelete();
    const target = sessions.find((session) => session.id === id);
    if (!target) return;
    const contractionsCount = contractionsInSession(contractions, id).length;
    const examsCount = getExams(id).length;
    const checklistCount = getStoredChecklist(id)?.length ?? 0;
    const savedParts = [
      contractionsCount ? `${contractionsCount} contraction${contractionsCount === 1 ? '' : 's'}` : '',
      examsCount ? `${examsCount} exam${examsCount === 1 ? '' : 's'}` : '',
      checklistCount ? `${checklistCount} checklist item${checklistCount === 1 ? '' : 's'}` : '',
    ].filter(Boolean);
    if (savedParts.length > 0) {
      const message = `Cannot delete ${sessionDisplayName(target)}: it has ${savedParts.join(', ')}. Remove these records first.`;
      setFeedback({ message, variant: 'error' });
      return;
    }
    const wasActive = activeSessionId === id || getActiveSessionId() === id;
    if (!deleteSession(id)) {
      const message = 'Could not delete this session. Nothing was changed; free some storage and try again.';
      setFeedback({ message, variant: 'error' });
      return;
    }
    const next = refreshSessions();
    setFeedback(null);
    if (wasActive && next.some(session => session.id === PRIMARY_SESSION_ID)) onActiveChange(PRIMARY_SESSION_ID);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Sessions" tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] flex flex-col rounded-t-3xl border-t border-ink-200/30 bg-plum-950/98 shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.6)] p-5 animate-slide-up">

      <div className="flex shrink-0 items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="min-h-11 min-w-11 p-1 -ml-1 text-ink-400 active:text-ink-200"
            aria-label="Close Sessions"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-sm font-semibold text-ink-50 font-display">Sessions</div>
        </div>
        {!creating && (
          <button
            onClick={() => (runningSessionId ? stopBeforeChanging() : setCreating(true))}
            disabled={Boolean(runningSessionId)}
            aria-disabled={Boolean(runningSessionId)}
            title={runningSessionId ? 'Stop the active contraction before creating a session' : 'Create a new session'}
            className="text-xs text-rose-300 active:text-rose-200 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg active:bg-rose-300/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        )}
      </div>

      <div className="min-h-0 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
      {(feedback || runningSessionId) && (
        <p
          role={feedback?.variant === 'error' ? 'alert' : 'status'}
          aria-live={feedback?.variant === 'error' ? 'assertive' : 'polite'}
          className={`mb-3 rounded-xl border px-3 py-2 text-xs ${feedback?.variant === 'error' ? 'border-rose-300/40 bg-rose-300/10 text-rose-200' : 'border-ink-200/30 bg-ink-100/5 text-ink-200'}`}
        >
          {feedback?.message ?? 'Stop the active contraction before changing sessions. You can still view past sessions.'}
        </p>
      )}
      <p className="text-sm text-ink-300 mb-3">Current session: <strong className="text-ink-50">{sessionDisplayName(sessions.find((s) => s.id === activeSessionId))}</strong></p>
      {creating && (
        <div className="mb-3 rounded-xl border border-ink-200/30 bg-ink-100/5 p-3">
          <label htmlFor="session-name-input" className="block text-sm text-ink-300 mb-2">
            Session name
          </label>
          <input
            id="session-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (e.g. First labor)"
            className="w-full bg-transparent text-base text-ink-50 placeholder-ink-400 focus:outline-none mb-2"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setCreating(false);
                setName('');
              }}
              className="flex-1 text-xs bg-ink-100/5 active:bg-ink-100/10 border border-ink-200/30 text-ink-200 rounded-lg py-1.5 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="flex-1 text-xs bg-rose-300 active:bg-rose-400 text-plum-950 rounded-lg py-1.5 font-semibold transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {contractions.length === 0 && <div className="flex items-center gap-3 mb-3">
        <BrandIllustration name="records" className="w-14 h-14" />
        <p className="text-xs text-ink-300 leading-relaxed">Keep each timing session together. Records are saved privately on this device.</p>
      </div>}

      <ul className="space-y-1.5">
        {sessions.map((s) => {
          const isActive = s.id === activeSessionId;
          const count = contractionsInSession(contractions, s.id).length;
          return (
            <li
              key={s.id}
              className={`rounded-xl border px-3 py-2.5 transition-colors ${
                isActive
                  ? 'border-rose-300/50 bg-rose-300/10'
                  : 'border-ink-200/30 bg-ink-100/5'
              }`}
            >
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => switchTo(s.id)}
                  disabled={Boolean(s.endedAt) || Boolean(runningSessionId && runningSessionId !== s.id)}
                  aria-disabled={Boolean(runningSessionId && runningSessionId !== s.id)}
                  title={s.endedAt ? 'Ended session — use View to inspect it' : runningSessionId && runningSessionId !== s.id ? 'Stop the active contraction before switching sessions' : undefined}
                  aria-pressed={isActive}
                  className="min-h-11 flex-1 text-left min-w-0"
                >
                  <div className="text-sm font-medium text-ink-50 truncate flex items-center gap-1.5">
                    {s.endedAt ? (
                      <Square className="w-3 h-3 text-ink-500" strokeWidth={2} />
                    ) : (
                      <Play className="w-3 h-3 text-rose-300 fill-rose-300" strokeWidth={0} />
                    )}
                    {sessionDisplayName(s)}
                  </div>
                  <div className="text-xs text-ink-500 mt-0.5">
                    {count} {count === 1 ? 'contraction' : 'contractions'} ·{' '}
                    {new Date(s.startedAt).toLocaleDateString()}
                    {s.startedAt && (() => {
                      const durMs = (s.endedAt ? new Date(s.endedAt).getTime() : Date.now()) - new Date(s.startedAt).getTime();
                      const hours = Math.floor(durMs / (60 * 60 * 1000));
                      const minutes = Math.floor((durMs % (60 * 60 * 1000)) / (60 * 1000));
                      if (hours > 0) return ` · ${hours}h ${minutes}m`;
                      return ` · ${minutes}m`;
                    })()}
                  </div>
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  {s.endedAt && (
                    <button
                      onClick={() => onViewSession(s)}
                      className="min-h-11 px-3 inline-flex items-center text-ink-400 active:text-sage-300 transition-colors"
                      aria-label="View"
                      title="View"
                    >
                      <Eye className="w-3.5 h-3.5 inline mr-1.5" />View
                    </button>
                  )}
                  {s.id !== PRIMARY_SESSION_ID && (
                    <>
                      {!s.endedAt && (
                        <button
                          onClick={() => handleEnd(s.id)}
                          className="min-h-11 px-3 inline-flex items-center text-ink-400 active:text-ink-200 transition-colors"
                          aria-label="End session"
                          title="End session"
                        >
                          <Square className="w-3.5 h-3.5 inline mr-1.5" />End session
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={s.id === PRIMARY_SESSION_ID}
                        className={`min-h-11 px-3 inline-flex items-center transition-colors ${s.id === PRIMARY_SESSION_ID ? 'text-ink-600 cursor-not-allowed' : armedDeleteId === s.id ? 'text-rose-300 bg-rose-300/15 rounded-lg' : 'text-ink-400 active:text-rose-300'}`}
                        aria-label={armedDeleteId === s.id ? 'Tap again to confirm delete' : 'Delete'}
                        title={s.id === PRIMARY_SESSION_ID ? 'This birth cannot be deleted' : armedDeleteId === s.id ? 'Tap again to confirm' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5 inline mr-1.5" />{armedDeleteId === s.id ? 'Confirm delete' : 'Delete'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      </div>
    </div>
    </>
  );
}
