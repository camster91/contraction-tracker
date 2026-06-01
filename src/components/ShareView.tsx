// Read-only share view rendered at `/?share=CODE`.
//
// This is a single-device experience today: the partner opens the link on
// the same device (or shows it to someone next to them). For true
// multi-device realtime sync, a backend relay would be needed. The data
// model (session-scoped contractions) is already shaped for that — just
// swap the localStorage read for a fetch against a relay.

import { useEffect, useMemo, useState } from 'react';
import { Heart, Shield, AlertTriangle, Clock } from 'lucide-react';
import {
  durationSeconds,
  formatClock,
  formatDuration,
  formatElapsed,
  intervalSeconds,
  isFiveOneOne,
  secondsSinceLastFinish,
} from '../lib/contractions';
import {
  getShare,
  isShareValid,
  markShareOpened,
  sessionIdOf,
  type Share,
} from '../lib/sessions';

type Props = {
  code: string;
};

export default function ShareView({ code }: Props) {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [share, setShare] = useState<Share | null>(null);
  const [contractions, setContractions] = useState<import('../lib/contractions').Contraction[]>([]);
  const [now, setNow] = useState(Date.now());
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const s = getShare(code);
    setShare(s);
    setChecked(true);
    if (s && isShareValid(s) && !s.pin) {
      setUnlocked(true);
      markShareOpened(s.id);
    }
  }, [code]);

  // Live tick — refresh every 5s so duration/gap counts update
  useEffect(() => {
    if (!unlocked) return;
    const id = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, [unlocked]);

  // Read this device's contractions for the shared session.
  // (Single-device mode — same browser/profile that generated the share.)
  useEffect(() => {
    if (!unlocked || !share || !isShareValid(share)) return;
    const stored = localStorage.getItem('contraction-tracker:v1');
    if (!stored) {
      setContractions([]);
      return;
    }
    try {
      const data = JSON.parse(stored) as { contractions?: import('../lib/contractions').Contraction[] };
      const all = data.contractions || [];
      // Filter by the shared session
      const sessionContractions = all.filter(
        (c) => sessionIdOf(c) === share.sessionId,
      );
      setContractions(sessionContractions);
    } catch {
      setContractions([]);
    }
  }, [unlocked, share]);

  // Listen for storage changes so the partner sees updates as Cam logs them.
  useEffect(() => {
    if (!unlocked || !share || !isShareValid(share)) return;
    const handler = (e: StorageEvent) => {
      if (e.key !== 'contraction-tracker:v1') return;
      try {
        const data = JSON.parse(e.newValue || '{}') as { contractions?: import('../lib/contractions').Contraction[] };
        const all = data.contractions || [];
        setContractions(all.filter((c) => sessionIdOf(c) === share.sessionId));
        setNow(Date.now());
      } catch { /* ignore */ }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [unlocked, share]);

  // ---- Locked / not-yet-checked states ----

  if (!checked) {
    return <Shell><Centered><div className="text-ink-400 text-sm">Loading…</div></Centered></Shell>;
  }

  if (!share || !isShareValid(share)) {
    return (
      <Shell>
        <Centered>
          <div className="text-center max-w-xs">
            <div className="w-14 h-14 rounded-full bg-ink-100/10 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-ink-400" />
            </div>
            <div className="font-display text-xl text-ink-100 mb-1">Link unavailable</div>
            <p className="text-sm text-ink-400">
              This share link is no longer valid. Ask for a new one.
            </p>
          </div>
        </Centered>
      </Shell>
    );
  }

  // PIN gate
  if (share.pin && !unlocked) {
    return (
      <Shell>
        <Centered>
          <div className="w-full max-w-xs">
            <div className="w-14 h-14 rounded-full bg-ink-100/10 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-ink-300" />
            </div>
            <div className="font-display text-xl text-ink-100 mb-1 text-center">Enter PIN</div>
            <p className="text-xs text-ink-400 mb-4 text-center">
              Ask the person in labor for the 4-digit code.
            </p>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                setPinError(false);
              }}
              className="w-full bg-ink-100/5 border border-ink-200/30 rounded-xl px-4 py-3 text-center text-2xl font-display tabular-nums tracking-widest text-ink-50 focus:outline-none focus:border-rose-300/50"
              placeholder="• • • •"
              autoFocus
            />
            {pinError && (
              <div className="text-xs text-rose-300 text-center mt-2">Wrong PIN. Try again.</div>
            )}
            <button
              onClick={() => {
                if (pinInput === share.pin) {
                  setUnlocked(true);
                  markShareOpened(share.id);
                } else {
                  setPinError(true);
                }
              }}
              disabled={pinInput.length < 4}
              className="w-full mt-3 bg-rose-300 active:bg-rose-400 text-plum-950 rounded-xl py-3 font-semibold disabled:opacity-40 transition-colors"
            >
              Unlock
            </button>
          </div>
        </Centered>
      </Shell>
    );
  }

  // ---- Main read-only view ----

  const finished = useMemo(
    () => contractions.filter((c) => c.end).sort((a, b) => a.start.localeCompare(b.start)),
    [contractions],
  );
  const lastFinished = finished[finished.length - 1];
  const firstFinished = finished[0];
  const totalElapsedSec = firstFinished
    ? Math.round((now - new Date(firstFinished.start).getTime()) / 1000)
    : 0;
  const sinceFinish = secondsSinceLastFinish(contractions, now);
  const showAlert = isFiveOneOne(contractions, now);

  return (
    <Shell>
      <div className="max-w-md mx-auto w-full px-5 pt-6 pb-10">
        <header className="flex items-center gap-2.5 mb-5">
          <Heart className="w-5 h-5 text-rose-300 fill-rose-300/20" strokeWidth={1.5} />
          <h1 className="font-display text-xl font-medium tracking-tight text-ink-50">Luna</h1>
          <span className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-medium mt-0.5">
            Labor tracker
          </span>
        </header>

        {showAlert && (
          <div className="mb-4 rounded-2xl border border-rose-300/60 bg-rose-300/15 px-4 py-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-300/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-300" strokeWidth={2} />
            </div>
            <div>
              <div className="text-sm font-semibold text-rose-200 font-display">5-1-1 pattern</div>
              <div className="text-xs text-ink-300 mt-0.5 leading-relaxed">
                It might be time to go to the hospital.
              </div>
            </div>
          </div>
        )}

        {/* Big stat */}
        <div className="rounded-3xl border border-ink-200/30 bg-gradient-to-br from-ink-100/[0.04] to-transparent p-5 mb-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink-400 font-semibold">Since last</div>
          <div className="font-display text-5xl font-light text-ink-50 tabular-nums mt-1 leading-none">
            {sinceFinish !== null ? formatDuration(sinceFinish) : '—'}
          </div>
          <div className="text-[11px] text-ink-400 mt-2">
            {finished.length} {finished.length === 1 ? 'contraction' : 'contractions'} ·{' '}
            {totalElapsedSec > 0 ? `started ${formatElapsed(totalElapsedSec)} ago` : 'just started'}
          </div>
        </div>

        {/* Last contraction */}
        {lastFinished && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-2xl border border-ink-200/30 bg-gradient-to-br from-ink-100/[0.04] to-transparent px-3.5 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-semibold">Last</div>
              <div className="font-display text-2xl font-light text-ink-50 tabular-nums mt-1 leading-none">
                {formatDuration(durationSeconds(lastFinished, now))}
              </div>
              <div className="text-[10px] text-ink-500 mt-1.5 tracking-wide">
                at {formatClock(lastFinished.start)}
              </div>
            </div>
            <div className="rounded-2xl border border-ink-200/30 bg-gradient-to-br from-ink-100/[0.04] to-transparent px-3.5 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-semibold">Last gap</div>
              <div className="font-display text-2xl font-light text-ink-50 tabular-nums mt-1 leading-none">
                {(() => {
                  const prev = finished[finished.length - 2];
                  return prev ? formatDuration(intervalSeconds(prev, lastFinished)) : '—';
                })()}
              </div>
              <div className="text-[10px] text-ink-500 mt-1.5 tracking-wide">since previous</div>
            </div>
          </div>
        )}

        {/* History list */}
        {finished.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-ink-400 font-semibold mb-2.5 ml-1">
              History
            </div>
            <ul className="space-y-2">
              {[...finished].reverse().slice(0, 12).map((c) => {
                const dur = durationSeconds(c, now);
                return (
                  <li
                    key={c.id}
                    className="rounded-2xl border border-ink-200/30 bg-gradient-to-br from-ink-100/[0.04] to-transparent px-4 py-2.5"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-base font-medium text-ink-50">
                        {formatClock(c.start)}
                      </span>
                      <span className="font-display text-lg font-light text-rose-300 tabular-nums">
                        {formatDuration(dur)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            {finished.length > 12 && (
              <div className="text-[10px] text-ink-500 mt-2 text-center">
                + {finished.length - 12} earlier
              </div>
            )}
          </div>
        )}

        {finished.length === 0 && (
          <div className="text-center py-8 text-sm text-ink-400">
            <Clock className="w-6 h-6 mx-auto mb-2 text-ink-500" />
            Waiting for the first contraction…
          </div>
        )}

        <div className="text-[10px] text-ink-600 text-center mt-8">
          Read-only view · expires {new Date(share.expiresAt).toLocaleString()}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-plum-950 text-ink-50" style={{ background: '#120c10' }}>
      {children}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center px-5">
      {children}
    </div>
  );
}
