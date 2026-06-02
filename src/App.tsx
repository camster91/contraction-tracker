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
  Shield,
  Volume2,
  VolumeX,
  Undo2,
  Type,
  Moon,
  Tag,
  ClipboardList,
} from 'lucide-react';
import {
  type Contraction,
  COMMON_TAGS,
  allTags,
  buildSummary,
  durationSeconds,
  formatClock,
  formatDuration,
  formatElapsed,
  formatRelative,
  getTags,
  intervalSeconds,
  isFiveOneOne,
  secondsSinceLastFinish,
} from './lib/contractions';
import { load, save, uid } from './lib/storage';
import { autoBackup, loadAutoBackup } from './lib/idb';
import {
  chimeAlert,
  chimeStart,
  chimeStop,
  setMuted,
  setInQuietHours,
  speak,
  stopSpeaking,
  unlockAudio,
} from './lib/audio';
import { disableWakeLock, enableWakeLock, installWakeLockVisibilityHandler } from './lib/wakelock';
import {
  getMuteSchedule,
  isBigText,
  isInQuietHours,
  setBigText,
  setMuteSchedule,
  type MuteSchedule,
} from './lib/settings';
import { useUndo } from './lib/undo';
import Timeline from './components/Timeline';
import SessionsSheet from './components/SessionsSheet';
import PeopleSheet from './components/PeopleSheet';
import ShareSheet from './components/ShareSheet';
import ChecklistSheet from './components/ChecklistSheet';
import ViewSessionModal from './components/ViewSessionModal';
import {
  contractionsInSession,
  getActiveSessionId,
  getSessions,
  getShares,
  migrateContractionsToSessions,
  type Session,
} from './lib/sessions';

const STORAGE_KEY = 'contraction-tracker:v1';
const SESSION_KEY = 'contraction-tracker:current';
const MUTED_KEY = 'contraction-tracker:muted';
const BACKUP_REMINDER_KEY = 'contraction-tracker:backup-dismissed';

type Stored = {
  contractions: Contraction[];
};

function formatDurationSpoken(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s} second${s === 1 ? '' : 's'}`;
  if (s === 0) return `${m} minute${m === 1 ? '' : 's'}`;
  return `${m} minute${m === 1 ? '' : 's'} and ${s} second${s === 1 ? '' : 's'}`;
}

function pluralContraction(n: number): string {
  return `${n} contraction${n === 1 ? '' : 's'}`;
}

export default function App() {
  const [contractions, setContractions] = useState<Contraction[]>(() =>
    load<Stored>(STORAGE_KEY, { contractions: [] }).contractions,
  );
  const [current, setCurrent] = useState<Contraction | null>(() => load(SESSION_KEY, null));
  const [now, setNow] = useState(Date.now());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [intensityDraft, setIntensityDraft] = useState<string>('');
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [showBackupInfo, setShowBackupInfo] = useState(false);
  const [muted, setMutedState] = useState<boolean>(() => load<boolean>(MUTED_KEY, false));
  const [bigText, setBigTextState] = useState<boolean>(() => isBigText());
  const [muteSchedule, setMuteScheduleState] = useState<MuteSchedule>(() => getMuteSchedule());
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [showShare, setShowShare] = useState<string | null>(null); // sessionId or null
  const [sessions, setSessions] = useState<Session[]>(() => getSessions());
  const [activeSessionId, setActiveId] = useState<string>(() => getActiveSessionId());

  // Viewing an ended session read-only (without switching active session)
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);

  // Hospital bag checklist sheet
  const [showChecklist, setShowChecklist] = useState(false);

  // Backup reminder — show if no share link created in last 4+ hours and not dismissed
  const [dismissedBannerAt, setDismissedBannerAt] = useState<number | null>(() => {
    const raw = localStorage.getItem(BACKUP_REMINDER_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const shares = getShares();
  const hasRecentShare = shares.some((s) => !s.revoked);
  const showBackupBanner = !hasRecentShare && !(dismissedBannerAt && Date.now() - dismissedBannerAt < 24 * 60 * 60 * 1000);

  // Onboarding tooltip steps: null = dismissed, 0/1/2 = step
  const [onboardingStep, setOnboardingStep] = useState<number | null>(() => {
    const seen = localStorage.getItem('contraction-tracker:onboarding-seen');
    return seen ? null : 0;
  });

  const undo = useUndo();
  const backupInfoTimeout = useRef<number | null>(null);
  const alertAnnouncedRef = useRef<number>(0);
  const lastAnnouncedMinuteRef = useRef<number>(0);

  const tickRef = useRef<number | null>(null);

  // On first mount: if localStorage is empty but IndexedDB has a backup, restore it.
  // This is the recovery path for "I cleared my browser data but the app is still installed."
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const localStored = load<Stored>(STORAGE_KEY, { contractions: [] });
        if (localStored.contractions.length > 0) {
          setSavedAt(new Date());
          return;
        }
        const backup = await loadAutoBackup<Contraction>();
        if (mounted && backup && backup.contractions.length > 0) {
          setContractions(backup.contractions);
          if (backup.current) setCurrent(backup.current);
          if (backup.savedAt) setSavedAt(new Date(backup.savedAt));
        }
      } catch {
        /* IDB not available; localStorage is the only copy */
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Active session display name (or "Contractions" as fallback)
  const activeSessionName = useMemo(
    () => sessions.find((s) => s.id === activeSessionId)?.name ?? 'Contractions',
    [sessions, activeSessionId],
  );

  // Save to localStorage + mirror to IndexedDB on every change.
  useEffect(() => {
    save(STORAGE_KEY, { contractions });
    autoBackup(contractions, current).then((ok) => {
      if (ok) setSavedAt(new Date());
    });
  }, [contractions, current]);
  useEffect(() => {
    save(SESSION_KEY, current);
    autoBackup(contractions, current).then((ok) => {
      if (ok) setSavedAt(new Date());
    });
  }, [current, contractions]);

  useEffect(() => {
    if (current && !current.end) {
      tickRef.current = window.setInterval(() => setNow(Date.now()), 1000);
      return () => {
        if (tickRef.current) window.clearInterval(tickRef.current);
      };
    }
  }, [current]);

  useEffect(() => {
    // Register the PWA service worker (only in production; dev is unregister-then-reload)
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* PWA install is optional; fail silently */
      });
    }
    // Install the visibility-change re-acquire handler for the wake lock
    installWakeLockVisibilityHandler();
    // Release the wake lock if the page is being torn down
    return () => disableWakeLock();
  }, []);

  // Keep the audio module in sync with the muted state
  useEffect(() => {
    setMuted(muted);
    save(MUTED_KEY, muted);
    if (muted) stopSpeaking();
  }, [muted]);

  // Keep audio module in sync with the mute schedule. Re-evaluated every minute
  // so quiet-hours transition happens without a page reload.
  useEffect(() => {
    setMuteSchedule(muteSchedule);
    setInQuietHours(isInQuietHours(muteSchedule));
    const id = window.setInterval(() => {
      setInQuietHours(isInQuietHours(muteSchedule));
    }, 60_000);
    return () => window.clearInterval(id);
  }, [muteSchedule]);

  // Apply big-text mode to <html> so CSS can scale appropriately
  useEffect(() => {
    setBigText(bigText);
    document.documentElement.classList.toggle('big-text', bigText);
  }, [bigText]);

  const handleStart = () => {
    if (current && !current.end) return;
    // iOS: the start tap counts as a user gesture, so the audio context can unlock here
    unlockAudio();
    setCurrent({ id: uid(), start: new Date().toISOString(), end: null, intensity: null });
    chimeStart();
    enableWakeLock();
  };

  const handleStop = () => {
    if (!current || current.end) return;
    const finished: Contraction = { ...current, end: new Date().toISOString() };
    setContractions((prev) => [...prev, finished]);
    setCurrent(null);
    disableWakeLock();
    chimeStop();
    // Voice readout of the contraction we just finished
    const dur = durationSeconds(finished);
    speak(`That was ${formatDurationSpoken(dur)}.`);
    setEditingId(finished.id);
    setIntensityDraft('');
    setNoteDraft('');
    setTagsDraft(getTags(finished));
    // Save the state *before* this contraction was added so undo can remove it
    undo.push({
      kind: 'stop',
      label: `Saved contraction (${formatDuration(dur)})`,
      contractions: contractions,
      current: null,
    });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const intensity = intensityDraft ? Math.max(1, Math.min(10, Number(intensityDraft))) : null;
    const note = noteDraft.trim();
    // De-dupe tags and strip empty
    const cleanTags = Array.from(new Set(tagsDraft.filter(Boolean)));
    setContractions((prev) =>
      prev.map((c) => (c.id === editingId
        ? { ...c, intensity, note: note || undefined, tags: cleanTags.length ? cleanTags : undefined }
        : c)),
    );
    setEditingId(null);
    setIntensityDraft('');
    setNoteDraft('');
    setTagsDraft([]);
  };
  // Was the entry just-finished (auto-edit panel after Stop) or already-saved?
  // 2-minute window: the user has a moment to add intensity/note, then it's "saved".
  const editingContraction = contractions.find((c) => c.id === editingId);
  const isJustFinished =
    !!editingContraction && Date.now() - new Date(editingContraction.start).getTime() < 2 * 60 * 1000;

  const handleCancelEdit = () => {
    if (!editingId) return;
    if (isJustFinished) {
      // Capture the just-finished entry for undo before discarding
      const justFinished = contractions.find((c) => c.id === editingId);
      if (justFinished) {
        undo.push({
          kind: 'discard',
          label: `Discarded contraction (${formatDuration(durationSeconds(justFinished, now))})`,
          contractions: contractions,
          current: current,
        });
      }
      setContractions((prev) => prev.filter((c) => c.id !== editingId));
      // The user discarded the just-finished contraction, so there's no active timer.
      disableWakeLock();
    }
    setEditingId(null);
    setIntensityDraft('');
    setNoteDraft('');
    setTagsDraft([]);
  };

  const handleDelete = (id: string) => {
    const target = contractions.find((c) => c.id === id);
    if (!target) return;
    setContractions((prev) => prev.filter((c) => c.id !== id));
    undo.push({
      kind: 'delete',
      label: `Deleted contraction (${formatDuration(durationSeconds(target, now))})`,
      contractions: contractions,
      current: current,
    });
  };

  const handleClearAll = () => {
    if (!confirm('Delete all contractions? This cannot be undone.')) return;
    const snapshot = contractions;
    setContractions([]);
    undo.push({
      kind: 'clear',
      label: `Cleared all ${snapshot.length} contractions`,
      contractions: snapshot,
      current: current,
    });
  };

  const handleUndo = () => {
    const entry = undo.take();
    if (!entry) return;
    setContractions(entry.contractions);
    setCurrent(entry.current);
    // Close any open edit panel that referenced a now-restored entry
    setEditingId(null);
    setIntensityDraft('');
    setNoteDraft('');
    setTagsDraft([]);
    undo.dismiss();
  };

  const handleReadSummary = () => {
    if (finished.length === 0) {
      speak('No contractions recorded yet.');
      return;
    }
    const last = finished[finished.length - 1];
    const prev = finished[finished.length - 2];
    const lastDur = durationSeconds(last, now);
    const lastGap = prev ? intervalSeconds(prev, last) : null;
    const sinceFinish = secondsSinceLastFinish(contractions, now);
    // Each part is a clause. We join with ", " and add a final period so the
    // voice reads naturally without double periods.
    const parts: string[] = [];
    parts.push(`${pluralContraction(finished.length)} so far`);
    parts.push(`last contraction was ${formatDurationSpoken(lastDur)}`);
    if (lastGap !== null) {
      parts.push(`started ${formatDurationSpoken(lastGap)} after the previous one`);
    }
    if (sinceFinish !== null && !current) {
      parts.push(`${formatDurationSpoken(sinceFinish)} since the last one`);
    }
    const summary = parts.join(', ') + '.';
    speak(summary);
  };

  const handleMuteToggle = () => {
    unlockAudio();
    setMutedState((m) => !m);
  };

  const handleShare = async () => {
    const text = buildSummary(contractions);
    const file = new File([text], `contractions-${new Date().toISOString().split('T')[0]}.txt`, { type: 'text/plain' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Contraction log', text });
        return;
      } catch {
        /* user cancelled */
      }
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Contraction log', text });
        return;
      } catch {
        /* cancelled */
      }
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

  // One-time migration: stamp old contractions (no sessionId) with the primary
  // session. Idempotent — only writes if any are missing the field.
  useEffect(() => {
    const migrated = migrateContractionsToSessions(contractions);
    if (migrated !== contractions) {
      setContractions(migrated);
    }
    // Make sure the primary session exists in the sessions list
    setSessions(getSessions());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
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
  const secondsSinceFinish = secondsSinceLastFinish(contractions, now);
  const firstStart = finished[0]?.start;
  const totalLogElapsedSec = firstStart
    ? Math.max(0, Math.round((now - new Date(firstStart).getTime()) / 1000))
    : 0;
  // Filtered list when a tag filter is active
  const visibleFinished = useMemo(() => {
    if (!tagFilter) return finished;
    return finished.filter((c) => getTags(c).includes(tagFilter));
  }, [finished, tagFilter]);
  // All tags used anywhere, for the filter chip row
  const knownTags = useMemo(() => allTags(contractions), [contractions]);
  // Available common tags that haven't been applied yet
  const availableCommonTags = useMemo(() => {
    const used = new Set<string>();
    for (const c of contractions) for (const t of getTags(c)) used.add(t);
    return COMMON_TAGS.filter((t) => !used.has(t));
  }, [contractions]);

  // Voice the 5-1-1 alert once when it transitions from off → on.
  // Guarded by a timestamp so it doesn't re-trigger every render.
  useEffect(() => {
    if (!showAlert) return;
    const nowMs = Date.now();
    if (nowMs - alertAnnouncedRef.current < 60_000) return;
    alertAnnouncedRef.current = nowMs;
    chimeAlert();
    // force=true bypasses quiet hours — the 5-1-1 alert is a medical signal
    speak('This looks like the 5 1 1 pattern. Consider calling your provider.', { force: true });
  }, [showAlert]);

  // Periodic "X minutes in" voice readouts while a contraction is running.
  // Only on whole minutes; rate-limited to once per minute.
  useEffect(() => {
    if (!current || current.end) return;
    const minutes = Math.floor(currentElapsed / 60);
    if (minutes < 1) return;
    if (lastAnnouncedMinuteRef.current === minutes) return;
    lastAnnouncedMinuteRef.current = minutes;
    speak(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'} in.`);
  }, [currentElapsed, current]);

  return (
    <div className="flex flex-col h-dvh text-ink-50 max-w-md mx-auto w-full">
      {/* Undo toast — fixed to the bottom of the screen so it doesn't push content.
          Auto-dismisses after 5s; user can tap Undo to reverse the last action. */}
      {undo.pending && (
        <div
          className="fixed inset-x-0 bottom-6 z-50 flex justify-center pointer-events-none"
          role="status"
          aria-live="polite"
        >
          <div className="pointer-events-auto mx-4 flex items-center gap-3 bg-plum-950/95 border border-ink-200/40 backdrop-blur-xl rounded-2xl px-4 py-2.5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] max-w-sm animate-fade-in">
            <span className="text-sm text-ink-100 flex-1">{undo.pending.label}</span>
            <button
              onClick={handleUndo}
              className="text-sm text-rose-300 active:text-rose-200 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg active:bg-rose-300/10"
            >
              <Undo2 className="w-4 h-4" />
              Undo
            </button>
            <button
              onClick={undo.dismiss}
              className="p-1 text-ink-400 active:text-ink-200"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Settings sheet — drops down from the settings button */}
      {showSettings && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setShowSettings(false)}
            aria-hidden="true"
          />
          <div className="absolute right-5 top-full mt-1 z-40 w-72 rounded-2xl border border-ink-200/30 bg-plum-950/95 backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] p-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <Type className="w-4 h-4 text-ink-300" strokeWidth={1.75} />
              <div className="text-sm font-semibold text-ink-50 font-display">Settings</div>
            </div>

            {/* Big text toggle */}
            <label className="flex items-center justify-between py-2 cursor-pointer">
              <span className="text-sm text-ink-200">Big text</span>
              <button
                role="switch"
                aria-checked={bigText}
                onClick={() => setBigTextState((v) => !v)}
                className={`w-10 h-6 rounded-full transition-colors ${
                  bigText ? 'bg-rose-300/60' : 'bg-ink-100/20'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-ink-50 shadow transition-transform ${
                    bigText ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>

            {/* Mute schedule */}
            <div className="border-t border-ink-200/20 mt-2 pt-3">
              <label className="flex items-center justify-between py-2 cursor-pointer">
                <span className="text-sm text-ink-200 flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5" /> Quiet hours
                </span>
                <button
                  role="switch"
                  aria-checked={muteSchedule.enabled}
                  onClick={() =>
                    setMuteScheduleState((s) => ({ ...s, enabled: !s.enabled }))
                  }
                  className={`w-10 h-6 rounded-full transition-colors ${
                    muteSchedule.enabled ? 'bg-rose-300/60' : 'bg-ink-100/20'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-ink-50 shadow transition-transform ${
                      muteSchedule.enabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </label>
              {muteSchedule.enabled && (
                <div className="flex items-center gap-2 mt-2 text-xs text-ink-400">
                  <span>From</span>
                  <select
                    value={muteSchedule.startHour}
                    onChange={(e) =>
                      setMuteScheduleState((s) => ({ ...s, startHour: Number(e.target.value) }))
                    }
                    className="bg-ink-100/10 border border-ink-200/30 rounded px-2 py-1 text-ink-100"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                  <span>to</span>
                  <select
                    value={muteSchedule.endHour}
                    onChange={(e) =>
                      setMuteScheduleState((s) => ({ ...s, endHour: Number(e.target.value) }))
                    }
                    className="bg-ink-100/10 border border-ink-200/30 rounded px-2 py-1 text-ink-100"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
              )}
              {muteSchedule.enabled && isInQuietHours(muteSchedule) && (
                <div className="text-[10px] text-amber-300 mt-2">
                  Quiet hours are active now. Only the 5-1-1 alert will play.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Sessions sheet — drops from the Luna wordmark */}
      {showSessions && !showPeople && !showShare && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setShowSessions(false)}
            aria-hidden="true"
          />
          <SessionsSheet
            contractions={contractions}
            activeSessionId={activeSessionId}
            onActiveChange={(id) => {
              setActiveId(id);
              setShowSessions(false);
            }}
            onClose={() => setShowSessions(false)}
            onOpenPeople={() => setShowPeople(true)}
            onOpenShare={(id) => setShowShare(id)}
            onViewSession={(s) => {
              setViewingSessionId(s.id);
              setShowSessions(false);
            }}
          />
        </>
      )}

      {/* People sheet */}
      {showPeople && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => {
              setShowPeople(false);
              setShowSessions(false);
            }}
            aria-hidden="true"
          />
          <PeopleSheet onClose={() => setShowPeople(false)} />
        </>
      )}

      {/* Share sheet — opens from a session row's share button */}
      {showShare && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setShowShare(null)}
            aria-hidden="true"
          />
          <ShareSheet
            sessionId={showShare}
            contractions={contractionsInSession(contractions, showShare)}
            onClose={() => {
              setShowShare(null);
              setSessions(getSessions());
            }}
          />
        </>
      )}

      {/* Header */}
      <header className="flex-shrink-0 px-5 pt-5 pb-3 flex items-center justify-between relative">
        <button
          onClick={() => {
            setShowSessions((s) => !s);
            setShowSettings(false);
            setShowBackupInfo(false);
          }}
          className="flex items-center gap-2.5 active:opacity-70"
          aria-label="Sessions"
        >
          <Heart className="w-5 h-5 text-rose-300 fill-rose-300/20" strokeWidth={1.5} />
          <h1 className="font-display text-xl font-medium tracking-tight text-ink-50">Luna</h1>
          <span className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-medium mt-0.5">
            {activeSessionName}
          </span>
        </button>
        <div className="flex items-center gap-1">
          {/* Saved-locally indicator — tappable for tooltip */}
          <button
            onClick={() => {
              setShowBackupInfo(true);
              if (backupInfoTimeout.current) window.clearTimeout(backupInfoTimeout.current);
              backupInfoTimeout.current = window.setTimeout(() => setShowBackupInfo(false), 6000);
            }}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] text-sage-300 active:bg-sage-300/10 transition-colors font-medium"
            aria-label="Saved locally — tap for details"
          >
            <span className="relative flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-sage-300 animate-pulse-live" />
              <span className="relative w-2 h-2 rounded-full bg-sage-300" />
            </span>
            <span>saved</span>
          </button>
          {finished.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-[11px] text-ink-400 active:text-rose-300 px-2 py-1.5 font-medium transition-colors"
            >
              clear
            </button>
          )}
          {/* Share with partner — opens the share sheet for the active session */}
          {finished.length > 0 && (
            <button
              onClick={() => setShowShare(activeSessionId)}
              className="p-1.5 rounded-lg text-ink-300 active:text-rose-300 active:bg-rose-300/10 transition-colors"
              aria-label="Share with partner"
              title="Share with partner"
            >
              <Share2 className="w-4 h-4" strokeWidth={1.75} />
            </button>
          )}
          {/* Hospital bag checklist */}
          <button
            onClick={() => setShowChecklist(true)}
            className="p-1.5 rounded-lg text-ink-300 active:text-sage-300 active:bg-sage-300/10 transition-colors"
            aria-label="Hospital bag checklist"
            title="Hospital bag"
          >
            <ClipboardList className="w-4 h-4" strokeWidth={1.75} />
          </button>
          {/* Sound on/off */}
          <button
            onClick={handleMuteToggle}
            className={`p-1.5 rounded-lg transition-colors ${
              muted ? 'text-ink-500 active:text-ink-300' : 'text-ink-300 active:text-rose-300'
            }`}
            aria-label={muted ? 'Sound off — tap to enable' : 'Sound on — tap to mute'}
            title={muted ? 'Sound off' : 'Sound on'}
          >
            {muted ? <VolumeX className="w-4 h-4" strokeWidth={1.75} /> : <Volume2 className="w-4 h-4" strokeWidth={1.75} />}
          </button>
          {/* Settings */}
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="p-1.5 rounded-lg text-ink-300 active:text-rose-300 active:bg-ink-100/10 transition-colors"
            aria-label="Settings"
            title="Settings"
          >
            <Type className="w-4 h-4" strokeWidth={1.75} />
          </button>
          {/* Sessions toggle — opens the sessions sheet from the main button */}
        </div>

        {/* Tooltip — drops down from the saved indicator */}
        {showBackupInfo && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setShowBackupInfo(false)}
              aria-hidden="true"
            />
            <div className="absolute right-5 top-full mt-1 z-40 w-64 rounded-2xl border border-sage-300/30 bg-plum-950/95 backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] px-4 py-3 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-sage-300/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield className="w-3.5 h-3.5 text-sage-300" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink-50 font-display">
                    Saved on this phone
                  </div>
                  <p className="text-[11px] text-ink-300 mt-1 leading-relaxed">
                    Every contraction is saved automatically to your phone's storage. Even if you
                    close the app or lose internet, your history stays.
                  </p>
                  {savedAt && (
                    <div className="text-[10px] text-ink-500 mt-2 font-medium">
                      Last saved {formatRelative(savedAt, now)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
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

      {/* Stale in-progress timer warning.
          If a current contraction is older than 4 hours, it's almost certainly
          a forgotten timer from a previous session. Surface a warning + discard
          option instead of just showing a 4-hour duration on the clock. */}
      {current && !current.end && Date.now() - new Date(current.start).getTime() > 4 * 60 * 60 * 1000 && (
        <div className="flex-shrink-0 mx-5 mb-3 rounded-2xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 flex items-start gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-full bg-amber-300/15 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-300" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-amber-200 font-display">Old timer</div>
            <div className="text-xs text-ink-300 mt-0.5 leading-relaxed">
              This contraction started {formatRelative(new Date(current.start), now)}. Did you forget to stop it?
            </div>
            <button
              onClick={() => setCurrent(null)}
              className="text-xs bg-amber-300/20 active:bg-amber-300/30 text-amber-200 rounded-lg px-3 py-1.5 font-semibold mt-2.5 transition-colors"
            >
              Discard timer
            </button>
          </div>
        </div>
      )}

      {/* Backup reminder banner — soft nudge if no share link has been created */}
      {showBackupBanner && (
        <div className="flex-shrink-0 mx-5 mb-3 rounded-2xl border border-sage-300/30 bg-sage-300/10 px-4 py-3 flex items-start gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-full bg-sage-300/15 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-sage-300" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-ink-100 font-display">Save a backup</div>
            <div className="text-xs text-ink-300 mt-0.5 leading-relaxed">
              Create a share link to back up your contraction history.
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.setItem(BACKUP_REMINDER_KEY, JSON.stringify(Date.now()));
              setDismissedBannerAt(Date.now());
            }}
            className="p-1.5 text-ink-400 active:text-ink-200 flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-5 pb-8 w-full">
        {/* Hero CTA */}
        <div className="pt-2 pb-6">
          {!current ? (
            <button
              onClick={handleStart}
              className="w-full min-h-[180px] rounded-3xl bg-gradient-to-br from-rose-300 via-rose-400 to-rose-500 text-plum-950 active:scale-[0.99] transition-transform duration-150 animate-breathe-soft flex flex-col items-center justify-center px-6 py-8"
            >
              <div className="w-14 h-14 rounded-full bg-plum-950/10 backdrop-blur-sm flex items-center justify-center mb-3">
                <Play className="w-6 h-6" fill="currentColor" strokeWidth={0} />
              </div>
              <div className="font-display text-3xl font-medium tracking-tight leading-none">Start</div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70 mt-2 font-semibold text-center">
                Tap when it begins
              </div>
            </button>
          ) : (
            <div className="w-full min-h-[180px] rounded-3xl border border-rose-300/40 bg-gradient-to-br from-rose-300/10 to-transparent px-6 py-8 flex flex-col items-center justify-center animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-rose-300 animate-pulse-live" />
                <div className="text-[10px] uppercase tracking-[0.25em] text-rose-300 font-semibold">
                  In progress
                </div>
              </div>
              <div className="font-display text-6xl font-light text-ink-50 tabular-nums leading-none">
                {formatDuration(currentElapsed)}
              </div>
              <div className="text-[11px] text-ink-400 mt-3 tracking-wide flex items-center gap-2">
                <span>Started at</span>
                <input
                  type="time"
                  value={current.start ? new Date(current.start).toISOString().slice(11, 16) : ''}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(':');
                    const d = new Date(current.start);
                    d.setHours(Number(h), Number(m));
                    setCurrent((c) => c ? { ...c, start: d.toISOString() } : null);
                  }}
                  className="bg-transparent text-ink-400 border-none outline-none focus:underline focus:text-rose-300 cursor-pointer"
                  aria-label="Edit start time"
                />
              </div>
              <div className="text-[10px] text-sage-300/80 mt-1.5 tracking-wide flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sage-300/70" />
                <span>Screen will stay on</span>
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

        {/* "Since last" hero stat — biggest reading on the page during active
            labor, between contractions. Hidden while a contraction is in
            progress (the in-progress card takes that role) and for the
            first few seconds of the very first contraction. */}
        {!current && finished.length > 0 && secondsSinceFinish !== null && (
          <div className="mb-4 rounded-2xl border border-ink-200/30 bg-gradient-to-br from-ink-100/[0.04] to-transparent px-4 py-4 animate-fade-in">
            <div className="text-[10px] uppercase tracking-[0.2em] text-ink-400 font-semibold">Since last</div>
            <div className="font-display text-4xl font-light text-ink-50 tabular-nums mt-1 leading-none">
              {formatDuration(secondsSinceFinish)}
            </div>
            <div className="text-[10px] text-ink-500 mt-1.5">
              {finished.length === 1
                ? 'since first contraction'
                : `${pluralContraction(finished.length)} logged · started ${formatElapsed(totalLogElapsedSec)} ago`}
            </div>
          </div>
        )}

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
            <div className="flex items-center justify-between mb-2.5 ml-1 flex-wrap gap-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-ink-400 font-semibold">
                History
              </div>
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={handleReadSummary}
                  className="text-ink-300 active:text-rose-300 active:bg-ink-100/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs transition-colors"
                  title="Read summary aloud"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Read</span>
                </button>
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

            {/* Tag filter chips — only shown when there are tagged contractions.
                Tap a tag to filter the history list to that tag; tap All to clear. */}
            {knownTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3 ml-1">
                <button
                  onClick={() => setTagFilter(null)}
                  className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                    tagFilter === null
                      ? 'bg-rose-300/20 text-rose-200 border border-rose-300/40'
                      : 'bg-ink-100/5 text-ink-400 border border-ink-200/30 active:bg-ink-100/10'
                  }`}
                >
                  All ({finished.length})
                </button>
                {knownTags.map(({ tag, count }) => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter((f) => (f === tag ? null : tag))}
                    className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors flex items-center gap-1 ${
                      tagFilter === tag
                        ? 'bg-rose-300/20 text-rose-200 border border-rose-300/40'
                        : 'bg-ink-100/5 text-ink-300 border border-ink-200/30 active:bg-ink-100/10'
                    }`}
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                    <span className="opacity-60">({count})</span>
                  </button>
                ))}
              </div>
            )}

            <ul className="space-y-2">
              {[...visibleFinished].reverse().map((c, idx) => {
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
                                onClick={() => setIntensityDraft(intensityDraft === String(n) ? '' : String(n))}
                                className={`w-6 h-6 rounded-full text-[10px] font-semibold transition-colors ${
                                  intensityDraft === String(n)
                                    ? 'bg-rose-300 text-plum-950'
                                    : 'bg-ink-100/10 text-ink-300 active:bg-ink-100/20'
                                }`}
                                aria-label={`Intensity ${n}`}
                                title={intensityDraft === String(n) ? `${n} of 10 — tap to clear` : `Set intensity to ${n}`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Quick-tag chips — tap to toggle inclusion on this contraction */}
                        <div className="flex flex-wrap gap-1.5">
                          {COMMON_TAGS.map((t) => {
                            const active = tagsDraft.includes(t);
                            return (
                              <button
                                key={t}
                                onClick={() =>
                                  setTagsDraft((cur) =>
                                    active ? cur.filter((x) => x !== t) : [...cur, t],
                                  )
                                }
                                className={`text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-full font-semibold transition-colors flex items-center gap-1 ${
                                  active
                                    ? 'bg-rose-300/20 text-rose-200 border border-rose-300/40'
                                    : 'bg-ink-100/5 text-ink-300 border border-ink-200/30 active:bg-ink-100/10'
                                }`}
                              >
                                <Tag className="w-2.5 h-2.5" />
                                {t}
                              </button>
                            );
                          })}
                          {tagsDraft
                            .filter((t) => !COMMON_TAGS.includes(t as (typeof COMMON_TAGS)[number]))
                            .map((t) => (
                              <button
                                key={t}
                                onClick={() => setTagsDraft((cur) => cur.filter((x) => x !== t))}
                                className="text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-full font-semibold bg-rose-300/20 text-rose-200 border border-rose-300/40 transition-colors flex items-center gap-1"
                              >
                                <Tag className="w-2.5 h-2.5" />
                                {t}
                              </button>
                            ))}
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
                            <span className="flex items-center gap-1.5">
                              <input
                                type="time"
                                value={c.start ? new Date(c.start).toISOString().slice(11, 16) : ''}
                                onChange={(e) => {
                                  const [h, m] = e.target.value.split(':');
                                  const d = new Date(c.start);
                                  d.setHours(Number(h), Number(m));
                                  setContractions((prev) =>
                                    prev.map((x) => x.id === c.id ? { ...x, start: d.toISOString() } : x),
                                  );
                                }}
                                className="font-display text-base font-medium text-ink-50 bg-transparent border-none outline-none focus:underline focus:text-rose-300 w-[5.5rem] cursor-pointer"
                                aria-label="Edit start time"
                              />
                            </span>
                            <span className="font-display text-lg font-light text-rose-300 tabular-nums">
                              {formatDuration(dur)}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="text-[10px] text-ink-500">–</span>
                              <input
                                type="time"
                                value={c.end ? new Date(c.end).toISOString().slice(11, 16) : ''}
                                onChange={(e) => {
                                  if (!c.end) return;
                                  const [h, m] = e.target.value.split(':');
                                  const d = new Date(c.end);
                                  d.setHours(Number(h), Number(m));
                                  setContractions((prev) =>
                                    prev.map((x) => x.id === c.id ? { ...x, end: d.toISOString() } : x),
                                  );
                                }}
                                className="font-display text-sm font-medium text-ink-300 bg-transparent border-none outline-none focus:underline focus:text-rose-300 w-[5rem] cursor-pointer"
                                aria-label="Edit end time"
                              />
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
          <div
            className="text-center pt-4 pb-2 animate-fade-in cursor-pointer"
            onClick={handleStart}
            role="button"
            aria-label="Tap to start a contraction"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          >
            <div className="font-display text-2xl font-light text-ink-200 tracking-tight">
              When you're ready.
            </div>
            <p className="text-sm text-ink-400 mt-2 leading-relaxed max-w-xs mx-auto">
              Tap Start when a contraction begins. Tap Stop when it ends. The app handles the rest.
            </p>
            {availableCommonTags.length > 0 && (
              <p className="text-[11px] text-ink-500 mt-3 max-w-xs mx-auto">
                Tip: after stopping, you can tag the contraction (back labor, pressure, etc).
              </p>
            )}
          </div>
        )}

        {/* Onboarding tooltip — 3-step swipeable overlay for first-time users */}
        {onboardingStep !== null && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                localStorage.setItem('contraction-tracker:onboarding-seen', '1');
                setOnboardingStep(null);
              }}
              aria-hidden="true"
            />
            <div className="fixed inset-x-4 bottom-24 z-50 rounded-2xl border border-rose-300/40 bg-plum-950/95 backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.7)] p-5 animate-fade-in">
              {onboardingStep === 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-rose-300/20 flex items-center justify-center">
                      <Play className="w-4 h-4 text-rose-300 fill-rose-300" />
                    </div>
                    <div className="font-display text-base font-semibold text-ink-50">Start a contraction</div>
                  </div>
                  <p className="text-sm text-ink-200 leading-relaxed">
                    Tap the big Start button when a contraction begins. The screen will stay on and the timer will run.
                  </p>
                </div>
              )}
              {onboardingStep === 1 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-rose-300/20 flex items-center justify-center">
                      <Square className="w-4 h-4 text-rose-300 fill-rose-300" />
                    </div>
                    <div className="font-display text-base font-semibold text-ink-50">Stop and add details</div>
                  </div>
                  <p className="text-sm text-ink-200 leading-relaxed">
                    Tap Stop when it ends. You can add intensity, tags, and a note to remember how it felt.
                  </p>
                </div>
              )}
              {onboardingStep === 2 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-rose-300/20 flex items-center justify-center">
                      <Share2 className="w-4 h-4 text-rose-300" />
                    </div>
                    <div className="font-display text-base font-semibold text-ink-50">Share with your team</div>
                  </div>
                  <p className="text-sm text-ink-200 leading-relaxed">
                    Use the Share button to send a link with a midwife or your birth partner so they can follow along.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${i === onboardingStep ? 'bg-rose-300' : 'bg-ink-400/40'}`}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  {onboardingStep < 2 ? (
                    <button
                      onClick={() => setOnboardingStep((s) => (s !== null ? s + 1 : null))}
                      className="text-xs bg-rose-300 active:bg-rose-400 text-plum-950 rounded-lg px-4 py-2 font-semibold transition-colors"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        localStorage.setItem('contraction-tracker:onboarding-seen', '1');
                        setOnboardingStep(null);
                      }}
                      className="text-xs bg-rose-300 active:bg-rose-400 text-plum-950 rounded-lg px-4 py-2 font-semibold transition-colors"
                    >
                      Got it
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Checklist sheet (hospital bag) — opens from the header Briefcase icon */}
        {showChecklist && (
          <ChecklistSheet sessionId={activeSessionId} onClose={() => setShowChecklist(false)} />
        )}

        {/* View-session modal — read-only view of an ended session */}
        {viewingSessionId && (() => {
          const sess = sessions.find((s) => s.id === viewingSessionId);
          if (!sess) return null;
          return (
            <ViewSessionModal
              session={sess}
              contractions={contractionsInSession(contractions, viewingSessionId)}
              onClose={() => setViewingSessionId(null)}
            />
          );
        })()}
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
