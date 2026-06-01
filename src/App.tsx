import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Square,
  Trash2,
  Share2,
  Download,
  AlertTriangle,
  Clock,
  Activity,
  Pencil,
  X,
  Check,
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

const STORAGE_KEY = 'contraction-tracker:v1';
const SESSION_KEY = 'contraction-tracker:current';

type Stored = {
  contractions: Contraction[];
};

export default function App() {
  const [contractions, setContractions] = useState<Contraction[]>(() =>
    load<Stored>(STORAGE_KEY, { contractions: [] }).contractions,
  );
  // The contraction currently in progress (if any). Persists across closes.
  const [current, setCurrent] = useState<Contraction | null>(() => load(SESSION_KEY, null));
  const [now, setNow] = useState(Date.now());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [intensityDraft, setIntensityDraft] = useState<string>('');
  const [noteDraft, setNoteDraft] = useState<string>('');

  const tickRef = useRef<number | null>(null);

  // Persist whenever state changes
  useEffect(() => {
    save(STORAGE_KEY, { contractions });
  }, [contractions]);
  useEffect(() => {
    save(SESSION_KEY, current);
  }, [current]);

  // 1Hz tick while a contraction is in progress
  useEffect(() => {
    if (current && !current.end) {
      tickRef.current = window.setInterval(() => setNow(Date.now()), 1000);
      return () => {
        if (tickRef.current) window.clearInterval(tickRef.current);
      };
    }
  }, [current]);

  // Telegram SDK init
  useEffect(() => {
    const tg = (window as unknown as { Telegram?: { WebApp?: { ready: () => void; expand: () => void; colorScheme?: string; themeParams?: Record<string, string> } } }).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, []);

  const handleStart = () => {
    if (current && !current.end) return; // already running
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

  // Was the entry just-finished (auto-edit panel after Stop) or already-saved?
  const editingContraction = contractions.find((c) => c.id === editingId);
  const isJustFinished =
    !!editingContraction && Date.now() - new Date(editingContraction.start).getTime() < 30_000;

  const handleCancelEdit = () => {
    if (!editingId) return;
    // Only discard the entire record if it was just-finished and never saved
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
    const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void; sendData?: (data: string) => void } } }).Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      // Send the summary as a Telegram message via share URL
      const url = `https://t.me/share/url?url=${encodeURIComponent('Contraction log')}&text=${encodeURIComponent(text)}`;
      tg.openTelegramLink(url);
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Contraction log', text });
      } catch {
        /* user cancelled */
      }
      return;
    }
    // Fallback: copy to clipboard
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

  // Compute stats from finished contractions
  const finished = useMemo(
    () => contractions.filter((c) => c.end).sort((a, b) => a.start.localeCompare(b.start)),
    [contractions],
  );
  const lastFinished = finished[finished.length - 1];
  const prevFinished = finished[finished.length - 2];
  const lastDuration = lastFinished ? durationSeconds(lastFinished, now) : 0;
  const lastInterval = lastFinished && prevFinished ? intervalSeconds(prevFinished, lastFinished) : null;
  const avgDuration = finished.length
    ? Math.round(
        finished.reduce((acc, c) => acc + durationSeconds(c, now), 0) / finished.length,
      )
    : 0;
  const gaps = finished.slice(1).map((c, i) => intervalSeconds(finished[i], c));
  const avgGap = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;
  const showAlert = isFiveOneOne(contractions, now);
  const currentElapsed = current && !current.end ? durationSeconds(current, now) : 0;

  return (
    <div className="flex flex-col h-dvh bg-neutral-950 text-neutral-100">
      {/* Top status bar */}
      <header className="flex-shrink-0 border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-rose-400" />
          <h1 className="text-base font-semibold">Contraction Timer</h1>
        </div>
        {finished.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-neutral-500 active:text-rose-400 px-2 py-1"
            aria-label="Clear all"
          >
            Clear
          </button>
        )}
      </header>

      {/* 5-1-1 alert */}
      {showAlert && (
        <div className="flex-shrink-0 bg-rose-600/20 border-b border-rose-600/40 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-rose-200">5-1-1 pattern detected</div>
            <div className="text-xs text-rose-300/80 mt-0.5">
              ~1 min long, ~5 min apart, for ~1 hour. Consider calling your provider.
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        {/* Primary action — start/stop */}
        <div className="px-4 py-6">
          {!current ? (
            <button
              onClick={handleStart}
              className="w-full bg-rose-500 active:bg-rose-600 rounded-2xl py-8 flex flex-col items-center justify-center transition-colors"
            >
              <Play className="w-10 h-10 mb-2" fill="currentColor" />
              <span className="text-lg font-semibold">Start contraction</span>
              <span className="text-xs text-rose-100/80 mt-1">Tap when it begins</span>
            </button>
          ) : (
            <div className="bg-rose-500/10 border-2 border-rose-500 rounded-2xl py-6 flex flex-col items-center">
              <div className="text-xs uppercase tracking-widest text-rose-300 mb-1">In progress</div>
              <div className="text-6xl font-light tabular-nums text-rose-100">
                {formatDuration(currentElapsed)}
              </div>
              <button
                onClick={handleStop}
                className="mt-4 bg-neutral-100 active:bg-white text-neutral-900 rounded-xl px-8 py-3 flex items-center gap-2 font-semibold"
              >
                <Square className="w-4 h-4" fill="currentColor" />
                Stop
              </button>
            </div>
          )}
        </div>

        {/* Live stats */}
        {finished.length > 0 && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Last duration"
                value={formatDuration(lastDuration)}
                sub={lastFinished ? `at ${formatClock(lastFinished.start)}` : undefined}
              />
              <StatCard
                label="Last interval"
                value={lastInterval !== null ? formatDuration(lastInterval) : '—'}
                sub="since previous start"
              />
              <StatCard
                label="Average duration"
                value={formatDuration(avgDuration)}
                sub={`${finished.length} total`}
              />
              <StatCard
                label="Average interval"
                value={avgGap !== null ? formatDuration(avgGap) : '—'}
                sub="between starts"
              />
            </div>
          </div>
        )}

        {/* History list */}
        {finished.length > 0 && (
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
                History
              </h2>
              <div className="flex gap-1">
                <button
                  onClick={handleShare}
                  className="text-xs bg-neutral-800 active:bg-neutral-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>
                <button
                  onClick={handleDownload}
                  className="text-xs bg-neutral-800 active:bg-neutral-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  .txt
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
                    className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5"
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">
                            {formatClock(c.start)} · {formatDuration(dur)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-neutral-500">Intensity</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={10}
                            placeholder="1-10"
                            value={intensityDraft}
                            onChange={(e) => setIntensityDraft(e.target.value)}
                            className="bg-neutral-800 rounded px-2 py-1 text-sm w-16 text-center"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Note (optional)"
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          className="w-full bg-neutral-800 rounded px-2 py-1.5 text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="flex-1 bg-rose-500 active:bg-rose-600 rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex-1 bg-neutral-800 active:bg-neutral-700 rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1.5"
                          >
                            <X className="w-4 h-4" />
                            {isJustFinished ? 'Discard' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">
                            {formatClock(c.start)} · {formatDuration(dur)}
                            {c.intensity ? (
                              <span className="ml-2 text-xs text-rose-300">
                                {c.intensity}/10
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-2 flex-wrap">
                            {interval !== null && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDuration(interval)} apart
                              </span>
                            )}
                            {c.note && <span className="truncate">— {c.note}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => {
                              setEditingId(c.id);
                              setIntensityDraft(c.intensity?.toString() ?? '');
                              setNoteDraft(c.note ?? '');
                            }}
                            className="p-2 text-neutral-500 active:text-neutral-200"
                            aria-label="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-2 text-neutral-500 active:text-rose-400"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {finished.length === 0 && !current && (
          <div className="px-4 pb-8 text-center text-sm text-neutral-500">
            <p>Tap "Start contraction" when one begins.</p>
            <p className="mt-1 text-xs">
              Tap "Stop" when it ends. The app does the rest.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="text-xl font-light tabular-nums mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-neutral-500 mt-0.5">{sub}</div>}
    </div>
  );
}
