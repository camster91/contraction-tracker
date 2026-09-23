// Session picker — list, create, switch active, end, delete.
// The active session is stored separately so Cam can quickly hop between
// past and current labor sessions.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Square, Trash2, Users, ArrowLeft, Play, Eye } from 'lucide-react';
import {
  PRIMARY_SESSION_ID,
  type Session,
  createSession,
  deleteSession,
  endSession,
  getActiveSessionId,
  getSessions,
  setActiveSessionId,
} from '../lib/sessions';
import { contractionsInSession } from '../lib/sessions';
import type { Contraction } from '../lib/contractions';

type Props = {
  contractions: Contraction[];
  activeSessionId: string;
  onActiveChange: (id: string) => void;
  onClose: () => void;
  onOpenPeople: () => void;
  onViewSession: (session: Session) => void;
};

export default function SessionsSheet({
  contractions,
  activeSessionId,
  onActiveChange,
  onClose,
  onOpenPeople,
  onViewSession,
}: Props) {
  const [sessions, setSessions] = useState<Session[]>(() => getSessions());
  // Live tick — refreshes the "5h 23m" duration display every 60s
  const [_, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const switchTo = (id: string) => {
    setActiveSessionId(id);
    onActiveChange(id);
  };

  const handleCreate = () => {
    const sess = createSession(name);
    setSessions(getSessions());
    switchTo(sess.id);
    setCreating(false);
    setName('');
  };

  const handleEnd = (id: string) => {
    // End-session is reversible (the session stays in the list, can be
    // re-opened) and there's no data loss. No confirm needed. (Previously
    // used window.confirm, which blocks the page and is flaky on iOS PWAs.)
    endSession(id);
    setSessions(getSessions());
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
    if (armedDeleteId !== id) {
      armDelete(id);
      return;
    }
    // Confirmed — disarm and delete.
    disarmDelete();
    deleteSession(id);
    setSessions(getSessions());
    if (getActiveSessionId() === id) switchTo(PRIMARY_SESSION_ID);
  };

  return (
    <div className="absolute right-5 top-full mt-1 z-40 w-80 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-ink-200/30 bg-plum-950/95  shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-1 -ml-1 text-ink-400 active:text-ink-200"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-sm font-semibold text-ink-50 font-display">Sessions</div>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="text-xs text-rose-300 active:text-rose-200 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg active:bg-rose-300/10"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-3 rounded-xl border border-ink-200/30 bg-ink-100/5 p-3">
          <label htmlFor="session-name-input" className="sr-only">
            Session name
          </label>
          <input
            id="session-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (e.g. First labor)"
            className="w-full bg-transparent text-sm text-ink-50 placeholder-ink-400 focus:outline-none mb-2"
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

      <ul className="space-y-1.5 max-h-80 overflow-y-auto">
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => switchTo(s.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="text-sm font-medium text-ink-50 truncate flex items-center gap-1.5">
                    {s.endedAt ? (
                      <Square className="w-3 h-3 text-ink-500" strokeWidth={2} />
                    ) : (
                      <Play className="w-3 h-3 text-rose-300 fill-rose-300" strokeWidth={0} />
                    )}
                    {s.name}
                  </div>
                  <div className="text-[10px] text-ink-500 mt-0.5">
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
                <div className="flex items-center gap-0.5">
                  {s.endedAt && (
                    <button
                      onClick={() => onViewSession(s)}
                      className="p-1.5 text-ink-400 active:text-sage-300 transition-colors"
                      aria-label="View"
                      title="View"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {s.id !== PRIMARY_SESSION_ID && (
                    <>
                      {!s.endedAt && (
                        <button
                          onClick={() => handleEnd(s.id)}
                          className="p-1.5 text-ink-400 active:text-ink-200 transition-colors"
                          aria-label="End session"
                          title="End session"
                        >
                          <Square className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={s.id === PRIMARY_SESSION_ID}
                        className={`p-1.5 transition-colors ${s.id === PRIMARY_SESSION_ID ? 'text-ink-600 cursor-not-allowed' : armedDeleteId === s.id ? 'text-rose-300 bg-rose-300/15 rounded-lg' : 'text-ink-400 active:text-rose-300'}`}
                        aria-label={armedDeleteId === s.id ? 'Tap again to confirm delete' : 'Delete'}
                        title={s.id === PRIMARY_SESSION_ID ? 'Primary session cannot be deleted' : armedDeleteId === s.id ? 'Tap again to confirm' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-ink-200/20 mt-3 pt-3">
        <button
          onClick={onOpenPeople}
          className="w-full text-left text-sm text-ink-200 active:text-rose-300 px-2 py-1.5 rounded-lg active:bg-ink-100/10 flex items-center gap-2 transition-colors"
        >
          <Users className="w-4 h-4" />
          Manage people
        </button>
      </div>
    </div>
  );
}
