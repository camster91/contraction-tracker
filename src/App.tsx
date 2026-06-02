import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Plus,
  Square,
  Trash2,
  Share2,
  Download,
  Upload,
  AlertTriangle,
  Pencil,
  X,
  Check,
  Heart,
  Shield,
  Volume2,
  VolumeX,
  Undo2,
  Moon,
  Tag,
  ClipboardList,
  PictureInPicture2,
  ChevronDown,
  Users2,
  Cog,
  Stethoscope,
  Mic,
  MicOff,
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
  isHour12Preferred,
  secondsSinceLastFinish,
  setHour12Preferred,
} from './lib/contractions';
import { load, save, uid } from './lib/storage';
import { autoBackup, loadAutoBackup } from './lib/idb';
import {
  buildBackup,
  downloadBackup,
  readBackupFile,
  mergeBackup,
  rotateBackup,
  validateBackup,
} from './lib/backup';
import { initSync, broadcastContractions, broadcastCurrent, isReceiving } from './lib/sync';
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
import { isVoiceSupported, startListening, stopListening } from './lib/voice';
import Timeline from './components/Timeline';
import FrequencyChart from './components/FrequencyChart';
import SessionsSheet from './components/SessionsSheet';
import PeopleSheet from './components/PeopleSheet';
import ShareSheet from './components/ShareSheet';
import ChecklistSheet from './components/ChecklistSheet';
import HospitalSheet from './components/HospitalSheet';
import ViewSessionModal from './components/ViewSessionModal';
import ActiveLaborBanner from './components/ActiveLaborBanner';
import PainLocationPicker from './components/PainLocationPicker';
import {
  contractionsInSession,
  createSession,
  getSessions,
  getActiveSessionId,
  getPeople,
  getShares,
  migrateContractionsToSessions,
  type Session,
} from './lib/sessions';
import { getChecklist, packedCount, saveChecklist } from './lib/checklist';
import { getExams } from './lib/hospital';

const STORAGE_KEY = 'contraction-tracker:v1';
const SESSION_KEY = 'contraction-tracker:current';
const APP_VERSION = '1.37';
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
  const [contractions, setContractions] = useState<Contraction[]>(() => {
    const stored = load<Stored>(STORAGE_KEY, { contractions: [] });
    // Validate: ensure contractions is an array, each has at least id + start
    if (!Array.isArray(stored.contractions)) {
      setDataDamagedToast(true);
      return [];
    }
    const valid = stored.contractions.filter((c: any) => c && typeof c.id === 'string' && typeof c.start === 'string');
    if (valid.length < stored.contractions.length) {
      setDataDamagedToast(true);
    }
    return valid;
  });
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
  const [voiceActive, setVoiceActive] = useState(false);

  // Viewing an ended session read-only (without switching active session)
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);

  // Hospital bag checklist sheet
  const [showChecklist, setShowChecklist] = useState(false);

  // Hospital sheet (cervical exams)
  const [showHospital, setShowHospital] = useState(false);

  // Pain location draft (edit panel)
  const [painLocationsDraft, setPainLocationsDraft] = useState<string[]>([]);

  // Theme variant — 'calm' (default warm rose) or 'cool' (blue/plum)
  const [themeVariant, setThemeVariant] = useState<'calm' | 'cool'>(() => {
    return (localStorage.getItem('contraction-tracker:theme') as 'calm' | 'cool') || 'calm';
  });

  // 12-hour time format toggle. Defaults to 24h.
  const [hour12, setHour12] = useState<boolean>(() => isHour12Preferred());
  // Bump a counter when this changes so consumers re-read the preference.
  // (formatClock reads localStorage on every call, so a simple state change
  // is enough — React re-renders and all the formatted clocks update.)

  // Data integrity toast — shown when corrupted data was detected and recovered
  const [dataDamagedToast, setDataDamagedToast] = useState(false);

  // Hidden file input for importing backups
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const alertAnnouncedRef = useRef<number>(0);
  const lastAnnouncedMinuteRef = useRef<number>(0);

  // Check for data integrity issues surfaced by validateStoredData on load.
  // If the primary was corrupted but shadow restored, show the recovery toast.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('luna:data-damaged');
      if (raw) {
        sessionStorage.removeItem('luna:data-damaged');
        setDataDamagedToast(true);
        setTimeout(() => setDataDamagedToast(false), 6000);
      }
    } catch { /* ignore */ }
  }, []);

  // Auto-discard stale in-progress timer. If a "current" contraction has been
  // running for more than 12 hours, it's almost certainly a forgotten timer
  // from days ago (app left open, phone put in a drawer, etc.). Surface a
  // 4h amber warning as before, but at 12h silently discard it and offer an
  // undo from the toast stack.
  useEffect(() => {
    if (!current || current.end) return;
    const ageMs = Date.now() - new Date(current.start).getTime();
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    if (ageMs <= TWELVE_HOURS) return;
    const snapshot = current;
    setCurrent(null);
    undo.push({
      kind: 'discard',
      label: `Discarded stale timer (${formatDuration((ageMs - TWELVE_HOURS) / 1000 + TWELVE_HOURS / 1000)})`,
      contractions,
      current: snapshot,
    });
    // Only run this once per stale timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current && current.start]);

  // On first mount: if localStorage is empty but IndexedDB has a backup, restore it.

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

  // BroadcastChannel sync — keep other tabs up to date when data changes
  useEffect(() => {
    initSync(
      (incoming) => setContractions(incoming),
      (incoming) => setCurrent(incoming),
    );
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
    if (!isReceiving()) broadcastContractions(contractions);
  }, [contractions, current]);
  useEffect(() => {
    save(SESSION_KEY, current);
    autoBackup(contractions, current).then((ok) => {
      if (ok) setSavedAt(new Date());
    });
    if (!isReceiving()) broadcastCurrent(current);
    // Auto-sync to relay if a share is active for this session
    try {
      const activeShares = getShares().filter(s => !s.revoked && s.sessionId === activeSessionId);
      for (const s of activeShares) {
        import('./lib/relay').then(r => r.pushContractionsToRelay(s.id, contractions, current)).catch(() => {});
      }
    } catch { /* relay sync is best-effort */ }
  }, [current, contractions]);

  useEffect(() => {
    // Persistent tick — uses rAF for smooth display but only fires setState
    // when the second actually changes. This prevents 60fps re-renders when
    // the display value is the same (which is 59 out of 60 frames).
    let frame = 0;
    let lastSec = -1;
    const tick = () => {
      const now = Date.now();
      const sec = Math.floor(now / 1000);
      if (sec !== lastSec) {
        lastSec = sec;
        setNow(now);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []); // mount once, never restart

  // Worker for contraction tick — managed separately so the
  // main rAF loop above never pauses.
  useEffect(() => {
    const inProgress = current && !current.end;
    if (!inProgress) return;
    const worker = new Worker('/timer-worker.js');
    worker.onmessage = (e) => {
      if (e.data.type === 'tick') setNow(e.data.now);
    };
    worker.postMessage({ type: 'start' });
    return () => {
      worker.postMessage({ type: 'stop' });
      worker.terminate();
    };
  }, [current]);

  useEffect(() => {
    // Register the PWA service worker (only in production; dev is unregister-then-reload)
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* PWA install is optional; fail silently */
      });
      // When the waiting worker takes over (via skipWaiting + clients.claim),
      // reload the page so the new bundle is loaded. The Update button does
      // this by posting 'SKIP_WAITING'; the auto-skipWaiting on install also
      // triggers this for users who just leave the app open.
      let reloading = false;
      const onChange = () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener('controllerchange', onChange);
    }
    // Install the visibility-change re-acquire handler for the wake lock
    installWakeLockVisibilityHandler();
    // Release the wake lock if the page is being torn down
    return () => { disableWakeLock(); stopListening(); };
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
    setPainLocationsDraft(finished.painLocations ?? []);
    // Save the state *before* this contraction was added so undo can remove it
    undo.push({
      kind: 'stop',
      label: `Saved contraction (${formatDuration(dur)})`,
      contractions: contractions,
      current: null,
    });
  };

  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleEnterPip = async () => {
    if (!document.pictureInPictureEnabled) return;
    try {
      // If we already have a PiP window open, exit
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return;
      }
      // Create a canvas, render the timer to it, then PiP via a video element
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // Draw the timer
      const draw = () => {
        if (!ctx) return;
        ctx.fillStyle = '#120c10';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#faf6f4';
        ctx.font = '64px Fraunces, Georgia, serif';
        ctx.textAlign = 'center';
        const elapsed = current && !current.end ? durationSeconds(current, Date.now()) : 0;
        ctx.fillText(formatDuration(elapsed), canvas.width / 2, 80);
      };
      draw();
      // Create a video from canvas stream
      const stream = canvas.captureStream(30);
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      await video.requestPictureInPicture();
      pipCanvasRef.current?.remove();
    } catch {
      // PIP not supported or denied — silently ignore
    }
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const intensity = intensityDraft ? Math.max(1, Math.min(10, Number(intensityDraft))) : null;
    const note = noteDraft.trim();
    // De-dupe tags and strip empty
    const cleanTags = Array.from(new Set(tagsDraft.filter(Boolean)));
    setContractions((prev) =>
      prev.map((c) => (c.id === editingId
        ? {
            ...c,
            intensity,
            note: note || undefined,
            tags: cleanTags.length ? cleanTags : undefined,
            painLocations: painLocationsDraft.length ? painLocationsDraft : undefined,
          }
        : c)),
    );
    setEditingId(null);
    setIntensityDraft('');
    setNoteDraft('');
    setTagsDraft([]);
    setPainLocationsDraft([]);
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
    setPainLocationsDraft([]);
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

  const handleVoiceToggle = () => {
    setVoiceActive((v) => {
      if (v) {
        stopListening();
        return false;
      } else {
        startListening(handleStart, handleStop);
        return true;
      }
    });
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

  // ---- Backup export ----
  const handleExportBackup = async () => {
    const sessions = getSessions();
    const people = getPeople();
    const shares = getShares();
    // Dynamically import to avoid circular deps and use proper ESM types
    const { getExams } = await import('./lib/hospital');
    const exams: Record<string, unknown[]> = {};
    for (const s of sessions) {
      exams[s.id] = getExams(s.id);
    }
    const checklists: Record<string, unknown[]> = {};
    for (const s of sessions) {
      checklists[s.id] = getChecklist(s.id);
    }
    const data = buildBackup({
      contractions,
      current,
      sessions,
      people,
      shares,
      exams,
      checklists,
    });
    downloadBackup(data);
    rotateBackup(data);
  };

  // ---- Safe app update (preserves data across SW reload) ----
  // Tries the soft path first: if a new SW is waiting, just tell it to take
  // over and the page reloads itself. Falls back to the heavy "unregister +
  // wipe cache + reload" path if no worker is waiting (e.g. the page is being
  // visited for the first time in a while and the install hasn't even run).
  const handleAppUpdate = async () => {
    if (!confirm('Update to the latest version? Your data is preserved and will be restored.')) return;
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.waiting) {
        reg.waiting.postMessage('SKIP_WAITING');
        // The new worker will call clients.claim(); we reload on controllerchange.
        return;
      }
      if (reg && reg.installing) {
        reg.installing.addEventListener('statechange', () => {
          if (reg.installing && reg.installing.state === 'installed' && navigator.serviceWorker.controller) {
            reg.installing.postMessage('SKIP_WAITING');
          }
        });
        return;
      }
      // No waiting/incoming worker — do a fresh registration so the next
      // page load picks up the latest sw.js.
      try { await reg?.update(); } catch { /* ignore */ }
    }
    // Last-resort: unregister everything and reload to force a clean SW.
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    window.location.reload();
  };

  // ---- Backup import ----
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await readBackupFile(file);
      if (!validateBackup(parsed)) {
        alert('This file is not a valid Luna backup.');
        return;
      }
      // Build existing maps using proper types
      const allPeople = getPeople();
      const allShares = getShares();
      const existingContractions = new Map<string, Contraction>(contractions.map((c) => [c.id, c]));
      const existingSessions = new Map<string, Session>(sessions.map((s) => [s.id, s]));
      const existingPeople = new Map<string, { id: string }>(allPeople.map((p: { id: string }) => [p.id, p]));
      const existingShares = new Map<string, { id: string }>(allShares.map((sh: { id: string }) => [sh.id, sh]));
      const existingExams = new Map<string, Map<string, { id: string }>>();
      const existingChecklists = new Map<string, Map<string, { id: string }>>();

      const { getExams: geom, writeExams } = await import('./lib/hospital');
      for (const s of sessions) {
        const ex = geom(s.id) as Array<{ id: string }>;
        existingExams.set(s.id, new Map(ex.map((x) => [x.id, x])));
      }
      for (const s of sessions) {
        const cl = getChecklist(s.id);
        existingChecklists.set(s.id, new Map(cl.map((i) => [i.id, i])));
      }

      const result = mergeBackup(parsed, {
        contractions: existingContractions,
        sessions: existingSessions,
        people: existingPeople,
        shares: existingShares,
        exams: existingExams,
        checklists: existingChecklists,
      });

      // Apply merged data
      setContractions([...existingContractions.values()]);
      setSessions([...existingSessions.values()]);
      const { setPeople: sp, setShares: ss } = await import('./lib/sessions');
      sp([...existingPeople.values()] as never[]);
      ss([...existingShares.values()] as never[]);

      // Persist exams and checklists
      for (const [sid, examMap] of existingExams) {
        writeExams(sid, [...examMap.values()] as never[]);
      }
      for (const [sid, itemMap] of existingChecklists) {
        saveChecklist(sid, [...itemMap.values()] as never[]);
      }
      alert(`Imported ${result.contractions} contractions, ${result.sessions} session(s), ${result.people} contacts, ${result.exams} exams.`);
    } catch (err) {
      alert('Failed to import backup: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ---- Send via share (Web Share API with file) ----
  const handleSendVia = async () => {
    const sessions = getSessions();
    const people = getPeople();
    const shares = getShares();
    const { getExams } = await import('./lib/hospital');
    const exams: Record<string, unknown[]> = {};
    for (const s of sessions) {
      exams[s.id] = getExams(s.id);
    }
    const checklists: Record<string, unknown[]> = {};
    for (const s of sessions) {
      checklists[s.id] = getChecklist(s.id);
    }
    const data = buildBackup({
      contractions,
      current,
      sessions,
      people,
      shares,
      exams,
      checklists,
    });
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const date = new Date().toISOString().split('T')[0];
    const file = new File([blob], `luna-backup-${date}.json`, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Labor backup', text: 'Here is my contraction log' });
        return;
      } catch { /* cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(json);
      alert('Backup copied to clipboard. Paste it into a message to send.');
    } catch {
      alert('Could not share the backup file.');
    }
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

  // 5-1-1 progress: count how many recent contractions match the pattern
  const onTrackCount = useMemo(() => {
    const finished = contractions.filter((c) => c.end).sort((a, b) => a.start.localeCompare(b.start));
    const oneHourAgo = now - 60 * 60 * 1000;
    const recent = finished.filter((c) => new Date(c.start).getTime() >= oneHourAgo);
    if (recent.length < 3) return null;
    return recent.filter((c) => durationSeconds(c, now) >= 45).length;
  }, [contractions, now]);
  const showOnTrack = !showAlert && onTrackCount !== null && onTrackCount >= 3;
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

      {/* Data integrity recovery toast — shown when corrupted primary was healed from shadow */}
      {dataDamagedToast && (
        <div
          className="fixed inset-x-0 top-6 z-50 flex justify-center pointer-events-none"
          role="alert"
          aria-live="assertive"
        >
          <div className="pointer-events-auto mx-4 flex items-start gap-3 bg-amber-300/15 border border-amber-300/40 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] max-w-sm animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-amber-200">Data restored</div>
              <div className="text-xs text-ink-300 mt-0.5">
                Some data was repaired automatically. If anything looks wrong, try restoring from a backup.
              </div>
            </div>
            <button
              onClick={() => setDataDamagedToast(false)}
              className="p-1 text-ink-400 active:text-ink-200 flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Hidden file input for backup import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportBackup}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Settings sheet — bottom overlay */}
      {showSettings && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-ink-200/30 bg-plum-950/98 backdrop-blur-xl shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.6)] max-h-[85dvh] flex flex-col animate-slide-up">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-8 h-1 rounded-full bg-ink-200/40" />
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-6">
            <div className="flex items-center gap-2 mb-3">
              <Cog className="w-4 h-4 text-ink-300" strokeWidth={1.75} />
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

            {/* Theme variant */}
            <div className="border-t border-ink-200/20 mt-3 pt-3">
              <div className="text-[10px] uppercase tracking-[0.15em] text-ink-400 font-semibold mb-2">Theme</div>
              <div className="flex gap-1.5">
                {(['calm', 'cool'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      setThemeVariant(v);
                      localStorage.setItem('contraction-tracker:theme', v);
                    }}
                    className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      themeVariant === v
                        ? v === 'calm'
                          ? 'bg-rose-300/20 text-rose-200 border border-rose-300/40'
                          : 'bg-blue-300/20 text-blue-200 border border-blue-300/40'
                        : 'bg-ink-100/5 text-ink-400 border border-ink-200/30 active:bg-ink-100/10'
                    }`}
                  >
                    {v === 'calm' ? '🌸 Calm' : '❄️ Cool'}
                  </button>
                ))}
              </div>
            </div>

            {/* Time format */}
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-[0.15em] text-ink-400 font-semibold mb-2">Time</div>
              <div className="flex gap-1.5">
                {([false, true] as const).map((v) => (
                  <button
                    key={String(v)}
                    onClick={() => {
                      setHour12(v);
                      setHour12Preferred(v);
                    }}
                    className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      hour12 === v
                        ? 'bg-rose-300/20 text-rose-200 border border-rose-300/40'
                        : 'bg-ink-100/5 text-ink-400 border border-ink-200/30 active:bg-ink-100/10'
                    }`}
                  >
                    {v ? '12-hour' : '24-hour'}
                  </button>
                ))}
              </div>
            </div>

            {/* Backup section */}
            <div className="border-t border-ink-200/20 mt-3 pt-3">
              <div className="text-[10px] uppercase tracking-[0.15em] text-ink-400 font-semibold mb-2">Backup</div>
              <div className="space-y-2">
                <button
                  onClick={handleExportBackup}
                  className="w-full text-left text-sm text-ink-200 bg-ink-100/5 active:bg-ink-100/10 border border-ink-200/30 rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4 text-sage-300" strokeWidth={1.75} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">Export backup</div>
                    <div className="text-[10px] text-ink-500">Download .json file</div>
                  </div>
                </button>
                <button
                  onClick={handleSendVia}
                  className="w-full text-left text-sm text-ink-200 bg-ink-100/5 active:bg-ink-100/10 border border-ink-200/30 rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors"
                >
                  <Share2 className="w-4 h-4 text-rose-300" strokeWidth={1.75} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">Send via…</div>
                    <div className="text-[10px] text-ink-500">AirDrop, message, email</div>
                  </div>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-left text-sm text-ink-200 bg-ink-100/5 active:bg-ink-100/10 border border-ink-200/30 rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4 text-sage-300" strokeWidth={1.75} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">Import from backup</div>
                    <div className="text-[10px] text-ink-500">Restore from .json file</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Version & update */}
            <div className="border-t border-ink-200/20 mt-3 pt-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-ink-400 font-semibold">App version</div>
                  <div className="text-[11px] text-ink-300 mt-0.5">Luna v{APP_VERSION}</div>
                </div>
              </div>
              <button
                onClick={() => handleAppUpdate()}
                className="w-full bg-rose-300 active:bg-rose-400 text-plum-950 rounded-xl py-2.5 text-sm font-semibold transition-colors"
              >
                Update to latest version
              </button>
              <div className="text-[9px] text-ink-600 mt-1.5 text-center">
                Clears old cache and loads the newest version. Your data is safe.
              </div>
            </div>
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
          <PeopleSheet onClose={() => setShowPeople(false)} finished={finished} />
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
          className="flex items-center gap-2 active:opacity-70"
          aria-label="Sessions"
        >
          <Heart className="w-5 h-5 text-rose-300 fill-rose-300/20" strokeWidth={1.5} />
          <h1 className="font-display text-xl font-medium tracking-tight text-ink-50">Luna</h1>
          <ChevronDown className="w-3.5 h-3.5 text-ink-400 mt-0.5" strokeWidth={2} />
          <span className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-medium mt-0.5">
            {activeSessionName}
          </span>
        </button>
        <div className="flex items-center gap-0.5">
          {/* Share with partner — always visible */}
          <button
            onClick={() => setShowShare(activeSessionId)}
            className="p-2 rounded-lg text-ink-300 active:text-rose-300 active:bg-rose-300/10 transition-colors"
            aria-label="Share with partner"
            title="Share with partner"
          >
            <Share2 className="w-4 h-4" strokeWidth={1.75} />
          </button>
          {/* Sound on/off */}
          <button
            onClick={handleMuteToggle}
            className={`p-2 rounded-lg transition-colors ${
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
            className="p-2 rounded-lg text-ink-300 active:text-rose-300 active:bg-ink-100/10 transition-colors"
            aria-label="Settings"
            title="Settings"
          >
            <Cog className="w-4 h-4" strokeWidth={1.75} />
          </button>
          {/* Voice control — mic for hands-free start/stop */}
          {isVoiceSupported() && (
            <button
              onClick={handleVoiceToggle}
              className={`p-2 rounded-lg transition-colors ${voiceActive ? 'text-rose-300 bg-rose-300/10 animate-pulse-subtle' : 'text-ink-300 active:text-rose-300'}`}
              aria-label={voiceActive ? 'Voice listening — tap to stop' : 'Voice control — tap to enable'}
              title={voiceActive ? 'Voice on' : 'Voice off'}
            >
              {voiceActive ? <Mic className="w-4 h-4" strokeWidth={1.75} /> : <MicOff className="w-4 h-4" strokeWidth={1.75} />}
            </button>
          )}
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

      {/* 5-1-1 "on track" indicator — shown when 3+ contractions match the
          pattern (≥45s) but the full 5-1-1 hasn't triggered yet. Helps users
          know they're approaching hospital-go time without alarmism. */}
      {showOnTrack && (
        <div className="flex-shrink-0 mx-5 mb-3 rounded-2xl border border-sage-300/40 bg-sage-300/10 px-4 py-3 flex items-start gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-full bg-sage-300/15 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-sage-300" strokeWidth={2} />
          </div>
          <div>
            <div className="text-sm font-semibold text-sage-200 font-display">Getting close</div>
            <div className="text-xs text-ink-300 mt-0.5 leading-relaxed">
              {onTrackCount} of {finished.filter((c) => new Date(c.start).getTime() >= now - 60*60*1000).length} contractions in the last hour are 45s or longer.
              Keep tracking — the 5-1-1 alert will fire when the pattern is clear.
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

      {/* Active labor indicator */}
      <ActiveLaborBanner contractions={contractions} now={now} />

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
                {document.pictureInPictureEnabled && (
                  <button
                    onClick={handleEnterPip}
                    className="ml-1 p-1 rounded text-rose-300/60 active:text-rose-300 active:bg-rose-300/10 transition-colors"
                    aria-label="Floating timer"
                    title="Picture-in-Picture"
                  >
                    <PictureInPicture2 className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                )}
              </div>
              <div className="font-display text-6xl font-light text-ink-50 tabular-nums leading-none">
                {formatDuration(currentElapsed)}
              </div>
              <div className="text-[11px] text-ink-400 mt-3 tracking-wide flex items-center gap-2">
                <span>Started at</span>
                <input
                  type="time"
                  step="1"
                  value={current.start ? `${String(new Date(current.start).getHours()).padStart(2,'0')}:${String(new Date(current.start).getMinutes()).padStart(2,'0')}:${String(new Date(current.start).getSeconds()).padStart(2,'0')}` : ''}
                  onChange={(e) => {
                    const parts = e.target.value.split(':');
                    if (parts.length < 2) return;
                    const d = new Date(current.start);
                    d.setHours(Number(parts[0]), Number(parts[1]));
                    if (parts[2]) d.setSeconds(Number(parts[2]));
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
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.2em] text-ink-400 font-semibold">Since last</div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleReadSummary}
                  className="text-ink-300 active:text-rose-300 active:bg-ink-100/10 px-2 py-1 rounded-lg flex items-center gap-1 text-[11px] transition-colors"
                  title="Read aloud"
                  aria-label="Read aloud"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Read</span>
                </button>
                <button
                  onClick={() => {
                    const last = finished[finished.length - 1];
                    if (!last) return;
                    const dur = durationSeconds(last, now);
                    if (dur >= 60) {
                      const ok = window.confirm(
                        `Delete the last contraction (${formatDuration(dur)})? You can undo from the toast.`,
                      );
                      if (!ok) return;
                    }
                    handleDelete(last.id);
                  }}
                  className="text-ink-300 active:text-rose-300 active:bg-ink-100/10 px-2 py-1 rounded-lg flex items-center gap-1 text-[11px] transition-colors"
                  title="Delete last contraction"
                  aria-label="Delete last contraction"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
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

        {/* Feature carousel — swipeable cards for quick access to every feature.
            Tapping a card opens the corresponding overlay sheet. Replaces the old
            individual inline pills + header icon clutter. */}
        <div className="mb-4 -mx-5 px-5 overflow-x-auto scrollbar-none">
          <div className="flex gap-2 pb-1">
            {/* Share */}
            <FeatureCard
              icon={<Share2 className="w-4 h-4" />}
              label="Share"
              sub={finished.length > 0 ? `${finished.length} contraction${finished.length===1?'':'s'}` : 'Invite partner'}
              onClick={() => setShowShare(activeSessionId)}
              accent="rose"
            />
            {/* Hospital bag */}
            <HospitalBagCard
              sessionId={activeSessionId}
              onClick={() => setShowChecklist(true)}
            />
            {/* Cervical exams */}
            <CervicalExamCard
              sessionId={activeSessionId}
              onClick={() => setShowHospital(true)}
            />
            {/* Trusted people */}
            <PeopleCard
              onClick={() => setShowPeople(true)}
            />
            {/* New session */}
            <FeatureCard
              icon={<Plus className="w-4 h-4" />}
              label="New session"
              sub="Start fresh"
              onClick={() => {
                const name = prompt('Name this session (e.g. Day 2):');
                if (name) {
                  const sess = createSession(name);
                  setActiveId(sess.id);
                  setSessions(getSessions());
                }
              }}
              accent="sage"
            />
            {/* Backup */}
            <FeatureCard
              icon={<Download className="w-4 h-4" />}
              label="Backup"
              sub="Export & restore"
              onClick={handleExportBackup}
              accent="sage"
            />
          </div>
        </div>

        {/* Friends banner — reduced; now handled by carousel */}
        {/* Hospital bag pill — reduced; now handled by carousel */}

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

        {/* Frequency chart */}
        {finished.length >= 2 && (
          <div className="mb-6 animate-fade-in">
            <FrequencyChart contractions={finished} now={now} />
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

            <ul className="space-y-3">
              {[...visibleFinished].reverse().map((c, idx) => {
                const dur = durationSeconds(c, now);
                const interval = idx < finished.length - 1 ? intervalSeconds(finished[finished.length - 2 - idx], c) : null;
                const isEditing = editingId === c.id;
                return (
                  <li
                    key={c.id}
                    className="rounded-2xl border border-ink-200/30 bg-gradient-to-br from-ink-100/[0.04] to-transparent px-4 py-5 overflow-hidden"
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
                          <div className="flex gap-1.5 flex-wrap">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                              <button
                                key={n}
                                onClick={() => setIntensityDraft(intensityDraft === String(n) ? '' : String(n))}
                                className={`w-10 h-10 rounded-full text-[13px] font-semibold transition-colors min-w-[40px] min-h-[40px] ${
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
                        {/* Quick-adjust end time — for when you stopped late */}
                        <div className="flex items-center gap-1.5 text-[10px] text-ink-500">
                          <span>Stop was late?</span>
                          {[-5, -10, -15, -30].map((sec) => (
                            <button
                              key={sec}
                              onClick={() => {
                                const target = contractions.find((c) => c.id === editingId);
                                if (!target || !target.end) return;
                                const d = new Date(target.end);
                                d.setSeconds(d.getSeconds() + sec);
                                setContractions((prev) =>
                                  prev.map((x) => x.id === editingId ? { ...x, end: d.toISOString() } : x),
                                );
                              }}
                              className="px-2 py-0.5 rounded-full border border-ink-300/30 text-ink-400 active:bg-rose-300/10 active:text-rose-300 active:border-rose-300/40 transition-colors"
                            >
                              {sec}s
                            </button>
                          ))}
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
                                className={`text-[11px] uppercase tracking-wider px-3 py-2 rounded-full font-semibold transition-colors flex items-center gap-1 ${
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
                        {/* Pain location picker */}
                        <PainLocationPicker
                          selected={painLocationsDraft}
                          onChange={setPainLocationsDraft}
                        />
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
                                step="1"
                                value={c.start ? `${String(new Date(c.start).getHours()).padStart(2,'0')}:${String(new Date(c.start).getMinutes()).padStart(2,'0')}:${String(new Date(c.start).getSeconds()).padStart(2,'0')}` : ''}
                                onChange={(e) => {
                                  const parts = e.target.value.split(':');
                                  if (parts.length < 2) return;
                                  const d = new Date(c.start);
                                  d.setHours(Number(parts[0]), Number(parts[1]));
                                  if (parts[2]) d.setSeconds(Number(parts[2]));
                                  setContractions((prev) =>
                                    prev.map((x) => x.id === c.id ? { ...x, start: d.toISOString() } : x),
                                  );
                                }}
                                className="font-display text-sm font-medium text-ink-50 bg-transparent border-none outline-none focus:underline focus:text-rose-300 w-[4rem] cursor-pointer"
                                aria-label="Edit start time"
                              />
                            </span>
                            <span className="font-display text-xl font-light text-rose-300 tabular-nums">
                              {formatDuration(dur)}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="text-[10px] text-ink-500">–</span>
                              <input
                                type="time"
                                step="1"
                                value={c.end ? `${String(new Date(c.end).getHours()).padStart(2,'0')}:${String(new Date(c.end).getMinutes()).padStart(2,'0')}:${String(new Date(c.end).getSeconds()).padStart(2,'0')}` : ''}
                                onChange={(e) => {
                                  if (!c.end) return;
                                  const parts = e.target.value.split(':');
                                  if (parts.length < 2) return;
                                  const d = new Date(c.end);
                                  d.setHours(Number(parts[0]), Number(parts[1]));
                                  if (parts[2]) d.setSeconds(Number(parts[2]));
                                  setContractions((prev) =>
                                    prev.map((x) => x.id === c.id ? { ...x, end: d.toISOString() } : x),
                                  );
                                }}
                                className="font-display text-sm font-medium text-ink-300 bg-transparent border-none outline-none focus:underline focus:text-rose-300 w-[4rem] cursor-pointer"
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
                              setTagsDraft(c.tags ?? []);
                              setPainLocationsDraft(c.painLocations ?? []);
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

        {/* Hospital sheet (cervical exams) — opens from the Stethoscope icon */}
        {showHospital && (
          <HospitalSheet sessionId={activeSessionId} onClose={() => setShowHospital(false)} />
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

// ---- Feature carousel card components ----

function FeatureCard({ icon, label, sub, onClick, accent }: {
  icon: React.ReactNode; label: string; sub: string;
  onClick: () => void; accent: 'rose' | 'sage' | 'ink';
}) {
  const accentBg = accent === 'rose' ? 'active:bg-rose-300/10 border-rose-300/20' : accent === 'sage' ? 'active:bg-sage-300/10 border-sage-300/20' : 'active:bg-ink-100/10 border-ink-200/30';
  const accentText = accent === 'rose' ? 'text-rose-300' : accent === 'sage' ? 'text-sage-300' : 'text-ink-300';
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 rounded-2xl border bg-ink-100/5 px-4 py-3 flex flex-col items-center gap-1.5 min-w-[100px] active:scale-95 transition-all ${accentBg}`}
    >
      <span className={accentText}>{icon}</span>
      <span className="text-[11px] font-medium text-ink-200">{label}</span>
      <span className="text-[9px] text-ink-500">{sub}</span>
    </button>
  );
}

function HospitalBagCard({ sessionId, onClick }: { sessionId: string; onClick: () => void }) {
  const [packed, setPacked] = useState(() => packedCount(getChecklist(sessionId)));
  const [total, setTotal] = useState(() => getChecklist(sessionId).length);
  // Re-check on mount and whenever sessionId changes
  useEffect(() => {
    const items = getChecklist(sessionId);
    setTotal(items.length);
    setPacked(packedCount(items));
  }, [sessionId]);
  return (
    <FeatureCard
      icon={<ClipboardList className="w-4 h-4" />}
      label="Hospital bag"
      sub={`${packed}/${total} packed`}
      onClick={onClick}
      accent={packed === total && total > 0 ? 'sage' : 'ink'}
    />
  );
}

function CervicalExamCard({ sessionId, onClick }: { sessionId: string; onClick: () => void }) {
  const count = useState(() => getExams(sessionId).length)[0];
  return (
    <FeatureCard
      icon={<Stethoscope className="w-4 h-4" />}
      label="Exams"
      sub={count > 0 ? `${count} logged` : 'Log exam'}
      onClick={onClick}
      accent="ink"
    />
  );
}

function PeopleCard({ onClick }: { onClick: () => void }) {
  const count = useState(() => getPeople().length)[0];
  return (
    <FeatureCard
      icon={<Users2 className="w-4 h-4" />}
      label="People"
      sub={count > 0 ? `${count} contact${count===1?'':'s'}` : 'Add contacts'}
      onClick={onClick}
      accent="ink"
    />
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

