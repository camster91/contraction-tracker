import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Square,
  Trash2,
  Share2,
  Download,
  AlertTriangle,
  Pencil,
  X,
  Check,
  Heart,
} from 'lucide-react';
import {
  type Contraction,
  buildSummary,
  durationSeconds,
  formatClock,
  formatDuration,
  intervalSeconds,
  isFiveOneOne,
} from './lib/contractions';
import { load, save, uid } from './lib/storage';
import Timeline from './components/Timeline';

const STORAGE_KEY = 'contraction-tracker:v1';
const SESSION_KEY = 'contraction-tracker:current';

type Stored = {
  contractions: Contraction[];
};

export default function App() {
  const [contractions, setContractions] = useState<Contraction[]>(() =>
    load<Stored>(STORAGE_KEY, { contractions: [] }).contractions,
  );
  const [current, setCurrent] = useState<Contraction | null>(() => load(SESSION_KEY, null));
  const [now, setNow] = useState(Date.now());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [intensityDraft, setIntensityDraft] = useState<string>('');
  const [noteDraft, setNoteDraft] = useState<string>('');

  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    save(STORAGE_KEY, { contractions });
  }, [contractions]);
  useEffect(() => {
    save(SESSION_KEY, current);
  }, [current]);

  useEffect(() => {
    if (current && !current.end) {
      tickRef.current = window.setInterval(() => setNow(Date.now()), 1000);
      return () => {
        if (tickRef.current) window.clearInterval(tickRef.current);
      };
    }
  }, [current]);

  useEffect(() => {
    const tg = (window as unknown as { Telegram?: { WebApp?: { ready: () => void; expand: () => void } } }).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, []);

  const handleStart = () => {
    if (current && !current.end) return;
    setCurrent({ id: uid(), start: new Date().toISOString(), end: null, intensity: null });
  };

  const handleStop = () => {
    if (!current || current.end) return;
    const finished: Contraction = { ...current, end: new Date().toISOString() };
    setContractions((prev) => [...prev, finished]);
    setCurrent(null);
    setEditingId(finished.id);
    setIntensityDraft('');
    setNoteDraft('');
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const intensity = intensityDraft ? Math.max(1, Math.min(10, Number(intensityDraft))) : null;
    const note = noteDraft.trim();
    setContractions((prev) =>
      prev.map((c) => (c.id === editingId ? { ...c, intensity, note: note || undefined } : c)),
    );
    setEditingId(null);
    setIntensityDraft('');
    setNoteDraft('');
  };

  const editingContraction = contractions.find((c) => c.id === editingId);
  const isJustFinished =
    !!editingContraction && Date.now() - new Date(editingContraction.start).getTime() < 30_000;

  const handleCancelEdit = () => {
    if (!editingId) return;
    if (isJustFinished) {
      setContractions((prev) => prev.filter((c) => c.id !== editingId));
    }
    setEditingId(null);
    setIntensityDraft('');
    setNoteDraft('');
  };

  const handleDelete = (id: string) => {
    setContractions((prev) => prev.filter((c) => c.id !== id));
  };

  const handleClearAll = () => {
    if (!confirm('Delete all contractions? This cannot be undone.')) return;
    setContractions([]);
  };

  const handleShare = async () => {
    const text = buildSummary(contractions);
    const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } }).Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      const url = `https://t.me/share/url?url=${encodeURIComponent('Contraction log')}&text=${encodeURIComponent(text)}`;
      tg.openTelegramLink(url);
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Contraction log', text });
      } catch {
        /* cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      alert('Summary copied to clipboard');
    } catch {
      alert(text);
    }
  };

  const handleDownload = () => {
    const text = buildSummary(contractions);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contractions-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const finished = useMemo(
    () => contractions.filter((c) => c.end).sort((a, b) => a.start.localeCompare(b.start)),
    [contractions],
  );
  const lastFinished = finished[finished.length - 1];
  const prevFinished = finished[finished.length - 2];
  const lastDuration = lastFinished ? durationSeconds(lastFinished, now) : 0;
  const lastInterval = lastFinished && prevFinished ? intervalSeconds(prevFinished, lastFinished) : null;
  const avgDuration = finished.length
    ? Math.round(finished.reduce((acc, c) => acc + durationSeconds(c, now), 0) / finished.length)
    : 0;
  const gaps = finished.slice(1).map((c, i) => intervalSeconds(finished[i], c));
  const avgGap = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;
  const showAlert = isFiveOneOne(contractions, now);
  const currentElapsed = current && !current.end ? durationSeconds(current, now) : 0;

  return (
    <div className="flex flex-col h-dvh text-ink-50 max-w-md mx-auto w-full">
      {/* Header */}
      <header className="flex-shrink-0 px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Heart className="w-5 h-5 text-rose-300 fill-rose-300/20" strokeWidth={1.5} />
          <h1 className="font-display text-xl font-medium tracking-tight text-ink-50">Luna</h1>
          <span className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-medium mt-0.5">
            Contractions
          </span>
        </div>
        {finished.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-[11px] uppercase tracking-[0.15em] text-ink-400 active:text-rose-300 px-2 py-1.5 font-medium transition-colors"
          >
            Clear
          </button>
        )}
      </header>

      {/* 5-1-1 alert */}
      {showAlert && (
        <div className="flex-shrink-0 mx-5 mb-3 rounded-2xl border border-rose-300/60 bg-rose-300/15 px-4 py-3 flex items-start gap-3 animate-fade-in shadow-[0_4px_24px_-8px_rgba(232,149,122,0.3)]">
          <div className="w-8 h-8 rounded-full bg-rose-300/15 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-rose-300" strokeWidth={2} />
          </div>
          <div>
            <div className="text-sm font-semibold text-rose-200 font-display">5-1-1 pattern</div>
            <div className="text-xs text-ink-300 mt-0.5 leading-relaxed">
              ~1 min long, ~5 min apart, for ~1 hour. Time to call your provider.
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-5 pb-8 w-full">
        {/* Hero CTA */}
        <div className="pt-2 pb-6">
          {!current ? (
            <button
              onClick={handleStart}
              className="w-full relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-300 via-rose-400 to-rose-500 text-plum-950 active:scale-[0.99] transition-transform duration-150 animate-breathe-soft py-10 px-6"
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
                <div className="w-16 h-16 rounded-full bg-plum-950/10 backdrop-blur-sm flex items-center justify-center mb-3">
                  <Play className="w-7 h-7 ml-0.5" fill="currentColor" strokeWidth={0} />
                </div>
                <div className="font-display text-2xl font-medium tracking-tight">Start</div>
                <div className="text-[11px] uppercase tracking-[0.2em] opacity-70 mt-1 font-medium">
                  Tap when it begins
                </div>
              </div>
            </button>
          ) : (
            <div
              className="w-full rounded-3xl border border-rose-300/40 bg-gradient-to-br from-rose-300/10 to-transparent px-6 py-8 flex flex-col items-center animate-fade-in"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-rose-300 animate-pulse-live" />
                <div className="text-[10px] uppercase tracking-[0.25em] text-rose-300 font-semibold">
                  In progress
                </div>
              </div>
              <div className="font-display text-7xl font-light text-ink-50 tabular-nums leading-none">
                {formatDuration(currentElapsed)}
              </div>
              <div className="text-[11px] text-ink-400 mt-3 tracking-wide">
                Started at {formatClock(current.start)}
              </div>
              <button
                onClick={handleStop}
                className="mt-5 bg-ink-50 active:bg-ink-100 text-plum-950 rounded-full px-7 py-2.5 flex items-center gap-2 font-semibold text-sm transition-colors"
              >
                <Square className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} />
                Stop
              </button>
            </div>
          )}
        </div>

        {/* Live stats */}
        {finished.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatCard label="Last" value={formatDuration(lastDuration)} sub={lastFinished ? formatClock(lastFinished.start) : undefined} />
            <StatCard
              label="Last gap"
              value={lastInterval !== null ? formatDuration(lastInterval) : '—'}
              sub="since previous"
            />
            <StatCard label="Average" value={formatDuration(avgDuration)} sub={`${finished.length} total`} />
            <StatCard
              label="Average gap"
              value={avgGap !== null ? formatDuration(avgGap) : '—'}
              sub="between starts"
            />
          </div>
        )}

        {/* Timeline visualization */}
        {finished.length >= 2 && (
          <div className="mb-6 animate-fade-in">
            <div className="text-[10px] uppercase tracking-[0.2em] text-ink-400 font-semibold mb-2.5 ml-1">
              Pattern
            </div>
            <Timeline contractions={finished} />
          </div>
        )}

        {/* History list */}
        {finished.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2.5 ml-1">
              <div className="text-[10px] uppercase tracking-[0.2em] text-ink-400 font-semibold">
                History
              </div>
              <div className="flex gap-1">
                <button
                  onClick={handleShare}
                  className="text-ink-300 active:text-rose-300 active:bg-ink-100/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="text-ink-300 active:text-rose-300 active:bg-ink-100/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>.txt</span>
                </button>
              </div>
            </div>
            <ul className="space-y-2">
              {[...finished].reverse().map((c, idx) => {
                const dur = durationSeconds(c, now);
                const interval = idx < finished.length - 1 ? intervalSeconds(finished[finished.length - 2 - idx], c) : null;
                const isEditing = editingId === c.id;
                return (
                  <li
                    key={c.id}
                    className="rounded-2xl border border-ink-200/30 bg-gradient-to-br from-ink-100/[0.04] to-transparent px-4 py-3"
                  >
                    {isEditing ? (
                      <div className="space-y-2.5 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <div className="font-display text-base font-medium">
                            {formatClock(c.start)} · {formatDuration(dur)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-[11px] uppercase tracking-[0.15em] text-ink-400 font-semibold">
                            Intensity
                          </label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                              <button
                                key={n}
                                onClick={() => setIntensityDraft(String(n))}
                                className={`w-6 h-6 rounded-full text-[10px] font-semibold transition-colors ${
                                  intensityDraft === String(n)
                                    ? 'bg-rose-300 text-plum-950'
                                    : 'bg-ink-100/10 text-ink-300 active:bg-ink-100/20'
                                }`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          type="text"
                          placeholder="Note (optional)"
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          className="w-full bg-ink-100/5 border border-ink-200/30 rounded-xl px-3 py-2 text-sm text-ink-50 placeholder-ink-400 focus:outline-none focus:border-rose-300/50"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="flex-1 bg-rose-300 active:bg-rose-400 text-plum-950 rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Check className="w-4 h-4" strokeWidth={2.5} />
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex-1 bg-ink-100/5 border border-ink-200/30 active:bg-ink-100/10 text-ink-200 rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <X className="w-4 h-4" strokeWidth={2.5} />
                            {isJustFinished ? 'Discard' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-display text-base font-medium text-ink-50">
                              {formatClock(c.start)}
                            </span>
                            <span className="font-display text-lg font-light text-rose-300 tabular-nums">
                              {formatDuration(dur)}
                            </span>
                            {c.intensity ? (
                              <span className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">
                                · {c.intensity}/10
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-ink-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            {interval !== null && (
                              <span>{formatDuration(interval)} apart</span>
                            )}
                            {c.note && <span className="truncate">— {c.note}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 ml-2">
                          <button
                            onClick={() => {
                              setEditingId(c.id);
                              setIntensityDraft(c.intensity?.toString() ?? '');
                              setNoteDraft(c.note ?? '');
                            }}
                            className="p-2 text-ink-400 active:text-rose-300 transition-colors"
                            aria-label="Edit"
                          >
                            <Pencil className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-2 text-ink-400 active:text-rose-300 transition-colors"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Empty state */}
        {finished.length === 0 && !current && (
          <div className="text-center pt-4 pb-2 animate-fade-in">
            <div className="font-display text-2xl font-light text-ink-200 tracking-tight">
              When you're ready.
            </div>
            <p className="text-sm text-ink-400 mt-2 leading-relaxed max-w-xs mx-auto">
              Tap Start when a contraction begins. Tap Stop when it ends. The app handles the rest.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-ink-200/30 bg-gradient-to-br from-ink-100/[0.04] to-transparent px-3.5 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-semibold">{label}</div>
      <div className="font-display text-2xl font-light text-ink-50 tabular-nums mt-1 leading-none">
        {value}
      </div>
      {sub && <div className="text-[10px] text-ink-500 mt-1.5 tracking-wide">{sub}</div>}
    </div>
  );
}
