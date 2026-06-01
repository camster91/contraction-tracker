// Session picker — list, create, switch active, end, delete.
// The active session is stored separately so Cam can quickly hop between
// past and current labor sessions.

import { useState } from 'react';
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
  onOpenShare: (sessionId: string) => void;
  onViewSession: (session: Session) => void;
};

export default function SessionsSheet({
  contractions,
  activeSessionId,
  onActiveChange,
  onClose,
  onOpenPeople,
  onOpenShare,
  onViewSession,
}: Props) {
  const [sessions, setSessions] = useState<Session[]>(() => getSessions());
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
    if (!confirm('Mark this session as ended? You can still view it later.')) return;
    endSession(id);
    setSessions(getSessions());
  };

  const handleDelete = (id: string) => {
    if (id === PRIMARY_SESSION_ID) {
      alert('Cannot delete the primary session.');
      return;
    }
    const count = contractionsInSession(contractions, id).length;
    if (count > 0) {
      if (!confirm(`This session has ${count} contractions. Delete it anyway?`)) return;
    } else {
      if (!confirm('Delete this session?')) return;
    }
    deleteSession(id);
    setSessions(getSessions());
    if (getActiveSessionId() === id) switchTo(PRIMARY_SESSION_ID);
  };

  return (
    <div className="absolute right-5 top-full mt-1 z-40 w-80 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-ink-200/30 bg-plum-950/95 backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] p-4 animate-fade-in">
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
          <input
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
                  </div>
                </button>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => onOpenShare(s.id)}
                    className="p-1.5 text-ink-400 active:text-rose-300 transition-colors"
                    aria-label="Share"
                    title="Share with someone"
                  >
                    <Users className="w-3.5 h-3.5" />
                  </button>
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
                        className="p-1.5 text-ink-400 active:text-rose-300 transition-colors"
                        aria-label="Delete"
                        title="Delete"
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
