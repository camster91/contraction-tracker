import { Capacitor } from '@capacitor/core';
import { exportTextFile } from './lib/exportFile';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Plus,
  Trash2,
  Download,
  AlertTriangle,
  Pencil,
  X,
  Check,
  Shield,
  Volume2,
  VolumeX,
  Undo2,
  Tag,
  ClipboardList,
  PictureInPicture2,
  ChevronDown,
  Users2,
  Cog,
  Stethoscope,
  Clock,
} from 'lucide-react';
import {
  type Contraction,
  COMMON_TAGS,
  allTags,
  buildCareSummary,
  buildSummary,
  durationSeconds,
  summarizeRecentContractions,
  formatClock,
  formatDuration,
  formatElapsed,
  formatRelative,
  getTags,
  intervalSeconds,
  isCarePlanPattern,
  isHour12Preferred,
  secondsSinceLastFinish,
  setHour12Preferred,
} from './lib/contractions';
import { load, save, commitLocalStorageBatch, uid, isQuotaExceeded, clearQuotaExceeded } from './lib/storage';
import { autoBackup, autoBackupJourney, loadAutoBackup, saveCurrentToIdb, clearCurrentFromIdb, loadCurrentBackup } from './lib/idb';
import {
  buildBackup,
  downloadBackup,
  readBackupFile,
  mergeBackup,
  migrateBackup,
  rotateBackup,
  validateBackup,
} from './lib/backup';
import { initSync, broadcastContractions, broadcastCurrent } from './lib/sync';
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
import { disableWakeLock, enableWakeLock, installWakeLockVisibilityHandler, isWakeLockHeld } from './lib/wakelock';
import {
  getMuteSchedule,
  getCarePlan,
  normalizeCarePlan,
  isBigText,
  isInQuietHours,
  setBigText,
  setMuteSchedule,
  setCarePlan,
  type CarePlan,
  type MuteSchedule,
} from './lib/settings';
import { useUndo } from './lib/undo';
import { stopListening } from './lib/voice';
import { syncNativeTimerNotification } from './lib/nativeTimer';
import ManualContractionSheet from './components/ManualContractionSheet';
import { withClockTime, withEndOffset, withStartOffset } from './lib/contractionTime';
import SessionsSheet from './components/SessionsSheet';
import ActiveTimerControl from './components/ActiveTimerControl';
import PeopleSheet from './components/PeopleSheet';
import ChecklistSheet from './components/ChecklistSheet';
import SettingsSheet from './components/SettingsSheet';
import HospitalSheet from './components/HospitalSheet';
import ViewSessionModal from './components/ViewSessionModal';
import ActiveLaborBanner from './components/ActiveLaborBanner';
import PainLocationPicker from './components/PainLocationPicker';
import ToastHost from './components/ToastHost';
import { toast } from './lib/toast';
import {
  contractionsInSession,
  getSessions,
  getActiveSessionId,
  getPeople,
  migrateContractionsToSessions,
  type Session,
  type Person,
} from './lib/sessions';
import { getChecklist, packedCount, type ChecklistItem } from './lib/checklist';
import { getExams, type CervicalExam } from './lib/hospital';
import Onboarding from './components/Onboarding';
import { BrandWordmark } from './components/Brand';
import TagFilter from './components/TagFilter';
import HistoryHeader from './components/HistoryHeader';
import TodayPanel from './components/TodayPanel';
import JourneySheet from './components/JourneySheet';
import {
  getJourney,
  mergeJourney,
  saveJourney,
  updateJourneyPhase,
  type JourneyDocument,
  type JourneyPhase,
} from './lib/journey';

const STORAGE_KEY = 'contraction-tracker:v1';
const SESSION_KEY = 'contraction-tracker:current';
// Resolved at build time from package.json via vite.config.ts (define).
// vite/client types this as string | undefined; the fallback to '0.0.0'
// is a paranoia guard against an unset build environment. In practice
// every real build has VITE_APP_VERSION set.
const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '0.0.0';
const MUTED_KEY = 'contraction-tracker:muted';
const BACKUP_REMINDER_KEY = 'contraction-tracker:backup-dismissed';

type Stored = {
  contractions: Contraction[];
  savedAt?: string;
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
  const [initialHistory] = useState(() => {
    const stored = load<Stored>(STORAGE_KEY, { contractions: [] });
    // Validate: ensure contractions is an array, each has at least id + start
    if (!Array.isArray(stored.contractions)) {
      return { contractions: [] as Contraction[], damaged: true };
    }
    const valid = stored.contractions.filter((c: any) => c && typeof c.id === 'string' && typeof c.start === 'string');
    return { contractions: valid, damaged: valid.length < stored.contractions.length };
  });
  const [contractions, setContractions] = useState<Contraction[]>(initialHistory.contractions);
  const [current, setCurrent] = useState<Contraction | null>(() => load(SESSION_KEY, null));
  const [recoveryLoaded, setRecoveryLoaded] = useState(false);
  const [now, setNow] = useState(Date.now());
  const timerButtonRef = useRef<HTMLButtonElement>(null);
  const previousTimer = useRef(current);
  useEffect(() => {
    if (Boolean(previousTimer.current) !== Boolean(current)) {
      const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
      const dialogAction = dialog?.querySelector<HTMLButtonElement>('button');
      (dialogAction ?? timerButtonRef.current)?.focus();
    }
    previousTimer.current = current;
  }, [current]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [timingDraft, setTimingDraft] = useState<Contraction | null>(null);
  const [intensityDraft, setIntensityDraft] = useState<string>('');
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [showBackupInfo, setShowBackupInfo] = useState(false);
  const [muted, setMutedState] = useState<boolean>(() => load<boolean>(MUTED_KEY, false));
  const [bigText, setBigTextState] = useState<boolean>(() => isBigText());
  const [muteSchedule, setMuteScheduleState] = useState<MuteSchedule>(() => getMuteSchedule());
  const [startCorrection, setStartCorrection] = useState<{ id: string; start: string } | null>(null);
  const [carePlan, setCarePlanState] = useState<CarePlan>(() => getCarePlan());
  const [journey, setJourney] = useState<JourneyDocument>(() => getJourney());
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [sessions, setSessions] = useState<Session[]>(() => getSessions());
  const [activeSessionId, setActiveId] = useState<string>(() => getActiveSessionId());


  // Viewing an ended session read-only (without switching active session)
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);

  // Hospital bag checklist sheet
  const [showChecklist, setShowChecklist] = useState(false);

  // Hospital sheet (cervical exams)
  const [showHospital, setShowHospital] = useState(false);
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [showJourney, setShowJourney] = useState(false);

  // Pain location draft (edit panel)
  const [painLocationsDraft, setPainLocationsDraft] = useState<string[]>([]);

  // Preserve existing stored choices; calm is Olive Night, cool is Olive Day.
  const [themeVariant, setThemeVariant] = useState<'calm' | 'cool'>(() => {
    return (localStorage.getItem('contraction-tracker:theme') as 'calm' | 'cool') || 'calm';
  });

  useEffect(() => {
    const day = themeVariant === 'cool';
    document.documentElement.dataset.appearance = day ? 'day' : 'night';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', day ? '#F5F1E7' : '#26382C');
    if (Capacitor.isNativePlatform()) {
      void import('@capacitor/status-bar').then(async ({ StatusBar, Style }) => {
        await StatusBar.setStyle({ style: day ? Style.Light : Style.Dark });
        if (Capacitor.getPlatform() === 'android') await StatusBar.setBackgroundColor({ color: day ? '#F5F1E7' : '#26382C' });
      }).catch(() => { /* In-app controls remain available without the status bar plugin. */ });
    }
  }, [themeVariant]);

  // 12-hour time format toggle. Defaults to 24h.
  const [hour12, setHour12] = useState<boolean>(() => isHour12Preferred());
  // Bump a counter when this changes so consumers re-read the preference.
  // (formatClock reads localStorage on every call, so a simple state change
  // is enough — React re-renders and all the formatted clocks update.)

  // Data integrity toast — shown when corrupted data was detected and recovered
  const [dataDamagedToast, setDataDamagedToast] = useState(initialHistory.damaged);
  const [quotaToast, setQuotaToast] = useState(false);

  // Pending restore: when IDB has a saved current timer that localStorage doesn't have,
  // this holds it so we can show the "Resume?" prompt at the top of the screen.
  const [pendingRestore, setPendingRestore] = useState<Contraction | null>(null);
  const [pendingRestoreAt, setPendingRestoreAt] = useState<string | null>(null);

  const [backupError, setBackupError] = useState<string | null>(null);

  // Status update prompt removed in v1.0.1 (replaced by the inline
  // composer + Baby is here button, see commit history). The old
  // StatusUpdatePrompt component still exists in src/components/
  // for now but is no longer mounted from App.tsx.
  // Hidden file input for importing backups
  const fileInputRef = useRef<HTMLInputElement>(null);
  const journeyOpenerRef = useRef<HTMLButtonElement>(null);

  // Backup reminder — show if not dismissed recently and there is data to lose
  const [, setDismissedBannerAt] = useState<number | null>(() => {
    const raw = localStorage.getItem(BACKUP_REMINDER_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  // Auto-backup already runs. Never cover the Start button during labor.
  const showBackupBanner = false;

  // Onboarding tooltip steps: null = dismissed, 0/1/2 = step
  const [onboardingStep, setOnboardingStep] = useState<number | null>(() => {
    const seen = localStorage.getItem('contraction-tracker:onboarding-seen');
    return seen ? null : 0;
  });

  const undo = useUndo();
  const alertAnnouncedRef = useRef<number>(0);
  // Separate timestamp for re-alert tracking (10-minute repeat interval)
  const lastAlertAtRef = useRef<number>(0);
  const lastAnnouncedMinuteRef = useRef<number>(0);

  // Check for data integrity issues surfaced by validateStoredData on load.
  // If the primary was corrupted but shadow restored, show the recovery toast.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const raw = sessionStorage.getItem('olive:data-damaged');
      if (raw) {
        sessionStorage.removeItem('olive:data-damaged');
        setDataDamagedToast(true);
        // Store the id in the closure so the cleanup can clear it
        // if the user navigates away within the 6s window. Without
        // the cleanup, setState fires on an unmounted component —
        // React 18+ ignores silently but it's a footgun for future
        // maintainers.
        timer = setTimeout(() => setDataDamagedToast(false), 6000);
      }
    } catch { /* ignore */ }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Quota exceeded check — runs every time contractions or current change.
  // If a save failed due to localStorage being full, surface a persistent
  // warning until the user takes action (export a backup, free space).
  useEffect(() => {
    if (isQuotaExceeded()) {
      setQuotaToast(true);
    }
  }, [contractions, current, recoveryLoaded]);

  // Clear quota flag when user dismisses the toast or successfully exports.
  const handleDismissQuota = () => {
    clearQuotaExceeded();
    setQuotaToast(false);
  };

  // Auto-discard stale in-progress timer. If a "current" contraction has been
  // running for more than 12 hours, it's almost certainly a forgotten timer
  // from days ago (app left open, phone put in a drawer, etc.). Surface a
  // 4h amber warning as before, but at 12h silently discard it and offer an
  // undo from the toast stack.
  //
  // The dep array used to be [current && current.start] (non-idiomatic
  // but correct: triggers when current becomes truthy or when its start
  // changes). The `lastSeenStartRef` makes the intent explicit: re-run
  // the effect only when the start time of the current timer differs
  // from what we last inspected. Same semantics, more readable.
  //
  // The dep array is [current] intentionally — `contractions` and `undo`
  // are captured at effect-fire time, which is when `current` changes
  // (the only meaningful trigger for this logic). Re-running on
  // `contractions` would cause the effect to fire on every contraction
  // add/remove, which is wasteful and would re-evaluate the stale timer
  // check for unchanged timers. `undo.push` is a stable reference from
  // `useUndo` (push is wrapped in useCallback with empty deps).
  const lastSeenStartRef = useRef<string | null>(null);
  useEffect(() => {
    if (!current || current.end) {
      // No active timer. Clear the ref so a future timer's start
      // re-triggers the check.
      lastSeenStartRef.current = null;
      return;
    }
    if (lastSeenStartRef.current === current.start) return; // already handled
    lastSeenStartRef.current = current.start;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // Read recovery copies before any effects mirror the initial local state.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const local = load<Stored>(STORAGE_KEY, { contractions: [] });
        const [backup, timer] = await Promise.all([
          loadAutoBackup<Contraction>(), loadCurrentBackup<Contraction>(),
        ]);
        if (!mounted) return;
        if (backup && Array.isArray(backup.contractions) &&
            (local.contractions.length === 0 ||
             (Date.parse(backup.savedAt ?? '') > Date.parse(local.savedAt ?? '1970-01-01')))) {
          const merged = new Map(local.contractions.map((c) => [c.id, c]));
          for (const c of backup.contractions) {
            if (c && typeof c.id === 'string' && Number.isFinite(Date.parse(c.start))) merged.set(c.id, c);
          }
          setContractions([...merged.values()].sort((a, b) => a.start.localeCompare(b.start)));
          if (merged.size > local.contractions.length) setDataDamagedToast(true);
          if (backup.savedAt) setSavedAt(new Date(backup.savedAt));
        }
        const candidate = timer?.current ?? backup?.current;
        if (!load(SESSION_KEY, null) && candidate && !candidate.end &&
            typeof candidate.id === 'string' && Number.isFinite(Date.parse(candidate.start)) &&
            Date.parse(candidate.start) <= Date.now()) {
          setPendingRestore(candidate);
          setPendingRestoreAt(timer?.savedAt ?? backup?.savedAt ?? null);
        }
      } catch { /* Local storage remains available when IndexedDB is unavailable. */ }
      finally { if (mounted) setRecoveryLoaded(true); }
    })();
    return () => { mounted = false; };
  }, []);

  // Backup current timer to IndexedDB every 5s while it is running.
  // This guards against localStorage wipe (iOS tab kill, quota pressure).
  useEffect(() => {
    if (!recoveryLoaded || pendingRestore) return;
    if (!current || current.end) {
      clearCurrentFromIdb().catch(() => {});
      return;
    }
    const id = setInterval(() => {
      saveCurrentToIdb(current).catch(() => {});
    }, 5_000);
    return () => clearInterval(id);
  }, [current, recoveryLoaded, pendingRestore]);

  // BroadcastChannel sync — keep other tabs up to date when data changes
  useEffect(() => {
    initSync(
      (incoming) => setContractions(incoming),
      (incoming) => setCurrent(incoming),
    );
  }, []);

  // Save to localStorage + mirror to IndexedDB on every change.
  useEffect(() => {
    if (!recoveryLoaded) return;
    save(STORAGE_KEY, { contractions, savedAt: new Date().toISOString() });
    autoBackup(contractions, current).then((ok) => {
      if (ok) setSavedAt(new Date());
    });
    // The broadcast function itself dedupes via the hash LRU (see
    // lib/sync.ts) — no need for an isReceiving() guard at the call
    // site. The old queueMicrotask-based counter was broken (it
    // decremented before React's useEffect ran) so the guard never
    // actually fired; it was dead code.
    broadcastContractions(contractions);
  }, [contractions, current, recoveryLoaded]);
  useEffect(() => {
    if (!saveJourney(journey)) toast.error('Could not save your journey. Export a backup before closing Olive.');
    autoBackupJourney(journey).catch(() => {});
  }, [journey]);

  useEffect(() => {
    if (!recoveryLoaded) return;
    save(SESSION_KEY, current);
    autoBackup(contractions, current).then((ok) => {
      if (ok) setSavedAt(new Date());
    });
    broadcastCurrent(current);
  }, [current, contractions, recoveryLoaded]);

  useEffect(() => {
    const running = current && !current.end ? current.start : null;
    void syncNativeTimerNotification(running);
  }, [current]);

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
    setCurrent({ id: uid(), start: new Date().toISOString(), end: null, intensity: null, sessionId: activeSessionId, source: 'timer' });
    chimeStart();
    enableWakeLock();
    // Tactile feedback — vital when phone is in a pillow or screen is dim
    try { navigator.vibrate?.(80); } catch { /* unsupported */ }
  };

  const handleStop = () => {
    if (!current || current.end) return;
    const finished: Contraction = { ...current, end: new Date().toISOString() };
    setContractions((prev) => [...prev, finished]);
    setCurrent(null);
    disableWakeLock();
    chimeStop();
    // Tactile feedback — distinct double-pulse for stop so the user can
    // feel the difference between start and stop without looking.
    try { navigator.vibrate?.([60, 40, 60]); } catch { /* unsupported */ }
    // Voice readout of the contraction we just finished
    const dur = durationSeconds(finished);
    speak(`That was ${formatDurationSpoken(dur)}.`);
    // Do not open intensity/pain/tags after Stop — next Start must stay one tap away.
    // Save the state *before* this contraction was added so undo can remove it
    undo.push({
      kind: 'stop',
      label: `Saved contraction (${formatDuration(dur)})`,
      contractions: contractions,
      current: null,
    });
  };

  const shortenLast = (seconds: number) => {
    const last = [...contractions].reverse().find((c) => c.end);
    if (!last?.end) return;
    const changed = withEndOffset(last, -seconds);
    if (!changed) { toast.error('That adjustment would create an invalid duration.'); return; }
    setContractions((prev) => prev.map((c) => (c.id === last.id ? { ...c, ...changed } : c)));
  };

  const startRef = useRef(handleStart);
  const stopRef = useRef(handleStop);
  startRef.current = handleStart;
  stopRef.current = handleStop;

  useEffect(() => {
    let cancelled = false;
    let remove: (() => void) | undefined;
    const run = (url: string) => {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'olive:') return;
        const action = parsed.host || parsed.pathname.replace(/^\//, '');
        if (action === 'start') startRef.current();
        if (action === 'stop') stopRef.current();
      } catch {
        /* not an olive link */
      }
    };
    void import('@capacitor/app').then(async ({ App }) => {
      if (cancelled) return;
      const sub = await App.addListener('appUrlOpen', (event) => run(event.url));
      remove = () => { void sub.remove(); };
      if (cancelled) { remove(); return; }
      const launch = await App.getLaunchUrl();
      if (!cancelled && launch?.url) run(launch.url);
    }).catch(() => {});
    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);

  // PiP video element is created in handleEnterPip (kept inline; no need
  // for a ref because the cleanup happens in a useEffect-free closure).

  const handleEnterPip = async () => {
    if (!document.pictureInPictureEnabled) return;
    let rafId: number | null = null;
    let video: HTMLVideoElement | null = null;
    const cleanup = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      try { video?.srcObject && (video.srcObject as MediaStream).getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
      video = null;
    };
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
      // Live-render the timer into the canvas while PiP is open.
      // Display adapts to the current state so the window is never blank:
      //   - Active contraction: huge MM:SS countdown, rose tint
      //   - Between contractions: "since last" gap (the most important number)
      //   - Saved care-plan reminder: amber background, reminder text
      const draw = () => {
        if (!ctx) return;
        const inProgress = current && !current.end;
        const carePlanMatch = isCarePlanPattern(contractions, carePlan, Date.now());
        // Background — amber when the saved reminder matches, otherwise dark plum
        ctx.fillStyle = carePlanMatch ? '#3a2410' : '#26382C';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Top status row
        ctx.fillStyle = carePlanMatch ? '#fbbf24' : '#E8AD8B';
        ctx.font = '500 14px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          carePlanMatch ? 'CARE-PLAN REMINDER' : (inProgress ? 'CONTRACTION' : 'SINCE LAST'),
          20, 28,
        );
        // Big number — different per state
        ctx.fillStyle = carePlanMatch ? '#fef3c7' : '#F5F1E7';
        ctx.font = '64px Fraunces, Georgia, serif';
        ctx.textAlign = 'center';
        let bigText = '0:00';
        if (inProgress) {
          bigText = formatDuration(durationSeconds(current!, Date.now()));
        } else {
          const gap = secondsSinceLastFinish(contractions, Date.now());
          if (gap !== null) bigText = formatDuration(gap);
        }
        ctx.fillText(bigText, canvas.width / 2, 84);
        // Subtitle for the since-last case
        if (!inProgress && !carePlanMatch) {
          const finished = contractions.filter((c) => c.end);
          if (finished.length > 0) {
            ctx.fillStyle = '#B8C5A2';
            ctx.font = '500 11px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${finished.length} contraction${finished.length === 1 ? '' : 's'} so far`, canvas.width / 2, 105);
          }
        }
        rafId = requestAnimationFrame(draw);
      };
      draw();
      // Create a video from canvas stream
      const stream = canvas.captureStream(30);
      video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      await video.requestPictureInPicture();
      // Stop the rAF loop and free the stream once PiP closes.
      video.addEventListener('leavepictureinpicture', cleanup, { once: true });
    } catch {
      cleanup();
    }
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    // Number('abc') returns NaN, and Math.max(1, NaN) === NaN. That NaN
    // would propagate into localStorage and silently break later code
    // that does `c.intensity > 5`. Number.isFinite gates the parse.
    const n = Number(intensityDraft);
    const intensity =
      intensityDraft && Number.isFinite(n) ? Math.max(1, Math.min(10, n)) : null;
    const note = noteDraft.trim();
    // De-dupe tags and strip empty
    const cleanTags = Array.from(new Set(tagsDraft.filter(Boolean)));
    setContractions((prev) =>
      prev.map((c) => (c.id === editingId
        ? {
            ...c,
            start: timingDraft?.id === c.id ? timingDraft.start : c.start,
            end: timingDraft?.id === c.id ? timingDraft.end : c.end,
            intensity,
            note: note || undefined,
            tags: cleanTags.length ? cleanTags : undefined,
            painLocations: painLocationsDraft.length ? painLocationsDraft : undefined,
          }
        : c)),
    );
    setEditingId(null);
    setTimingDraft(null);
    setIntensityDraft('');
    setNoteDraft('');
    setTagsDraft([]);
    setPainLocationsDraft([]);
  };
  const handleCancelEdit = () => {
    // Recording is already saved by Stop. Cancel only abandons the edit draft.
    setEditingId(null);
    setTimingDraft(null);
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
    setTimingDraft(null);
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
    const text = buildCareSummary(contractions, carePlan, now);
    if (Capacitor.isNativePlatform()) {
      try { await exportTextFile(text, 'olive-care-summary.txt', 'text/plain', 'Olive care summary'); }
      catch { toast.error('Could not share the care summary. Please try again.'); }
      return;
    }
    const file = new File([text], `olive-care-summary-${new Date().toISOString().split('T')[0]}.txt`, { type: 'text/plain' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Olive care summary', text });
        return;
      } catch {
        /* user cancelled */
      }
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Olive care summary', text });
        return;
      } catch {
        /* cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Summary copied to clipboard');
    } catch {
      // Last-resort fallback: the user has no clipboard, no share
      // sheet. Surface the text inline rather than blocking the
      // page with an alert. Long summaries wrap in a scrollable
      // pre so this stays usable.
      toast.info(text.length > 200 ? text.slice(0, 200) + '…' : text, { duration: 10_000 });
    }
  };

  const handleDownload = async () => {
    try { await exportTextFile(buildSummary(contractions), `contractions-${new Date().toISOString().slice(0, 10)}.txt`, 'text/plain', 'Olive care summary'); }
    catch { toast.error('Could not export the care summary. Please try again.'); }
  };

  // ---- Backup export ----
  const handleExportBackup = async () => {
    const sessions = getSessions();
    const people = getPeople();
    // Dynamically import to avoid circular deps and use proper ESM types
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
      exams,
      checklists,
      journey,
    });
    try { await downloadBackup(data); rotateBackup(data); }
    catch { toast.error('Could not export the backup. Please try again.'); }
  };

  // ---- Backup import ----
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await readBackupFile(file);
      if (!validateBackup(parsed)) {
        setBackupError('This file is not a valid Olive backup.');
        return;
      }
      const migrated = migrateBackup(parsed, new Date().toISOString(), journey.profile.id);
      // Build existing maps using proper types. Previously these
      // were Map<string, { id: string }> with `as never[]` casts on
      // the write-back. The casts hid real type errors — if the merged
      // data shape was wrong, TS couldn't catch it. Using Person/
      // CervicalExam/ChecklistItem means TS will check both the read
      // and the write.
      const allPeople = getPeople();
      const existingContractions = new Map<string, Contraction>(contractions.map((c) => [c.id, c]));
      const existingSessions = new Map<string, Session>(sessions.map((s) => [s.id, s]));
      const existingPeople = new Map<string, Person>(allPeople.map((p) => [p.id, p]));
      const existingExams = new Map<string, Map<string, CervicalExam>>();
      const existingChecklists = new Map<string, Map<string, ChecklistItem>>();

      for (const s of sessions) {
        existingExams.set(s.id, new Map(getExams(s.id).map((x) => [x.id, x])));
      }
      for (const s of sessions) {
        existingChecklists.set(s.id, new Map(getChecklist(s.id).map((i) => [i.id, i])));
      }

      const result = mergeBackup(migrated, {
        contractions: existingContractions,
        sessions: existingSessions,
        people: existingPeople,
        exams: existingExams,
        checklists: existingChecklists,
      });

      const nextContractions = [...existingContractions.values()];
      const nextSessions = [...existingSessions.values()];
      const nextPeople = [...existingPeople.values()];
      const nextJourney = mergeJourney(journey, migrated.journey);
      const entries = [
        { key: STORAGE_KEY, value: JSON.stringify({ contractions: nextContractions }), shadow: true },
        { key: 'contraction-tracker:sessions', value: JSON.stringify(nextSessions), shadow: true },
        { key: 'contraction-tracker:people', value: JSON.stringify(nextPeople), shadow: true },
        { key: 'olive:journey:v1', value: JSON.stringify(nextJourney), shadow: true },
      ];
      for (const [sid, exams] of existingExams) entries.push({ key: `contraction-tracker:cervical-exams:${sid}`, value: JSON.stringify([...exams.values()]), shadow: true });
      for (const [sid, items] of existingChecklists) entries.push({ key: `contraction-tracker:checklist:${sid}`, value: JSON.stringify([...items.values()]), shadow: true });
      if (!commitLocalStorageBatch(entries)) throw new Error('Storage could not save this backup. Your previous data has been retained.');
      setContractions(nextContractions);
      setSessions(nextSessions);
      setJourney(nextJourney);
      const importedTimer = migrated.current as Contraction | null;
      if (!current && importedTimer && typeof importedTimer.id === 'string' && !importedTimer.end &&
          Number.isFinite(Date.parse(importedTimer.start)) && Date.parse(importedTimer.start) <= Date.now()) {
        setPendingRestore(importedTimer);
        setPendingRestoreAt(migrated.savedAt);
      }
      setBackupError(null);
      toast.success(
        `Imported ${result.contractions} contractions, ${result.sessions} session(s), ${result.people} contacts, ${result.exams} exams.`,
        { duration: 5000 },
      );
    } catch (err) {
      setBackupError('Failed to import: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ---- Send via share (Web Share API with file) ----
  const handleSendVia = async () => {
    const sessions = getSessions();
    const people = getPeople();
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
      exams,
      checklists,
      journey,
    });
    if (Capacitor.isNativePlatform()) {
      try { await downloadBackup(data); }
      catch { toast.error('Could not share the backup. Please try again.'); }
      return;
    }
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const date = new Date().toISOString().split('T')[0];
    const file = new File([blob], `olive-backup-${date}.json`, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Labor backup', text: 'Here is my contraction log' });
        return;
      } catch { /* cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(json);
      toast.success('Backup copied to clipboard. Paste it into a message to send.', { duration: 6000 });
    } catch {
      toast.error('Could not share the backup file.', { duration: 6000 });
    }
  };

  const finished = useMemo(
    () => contractions.filter((c) => c.end).sort((a, b) => a.start.localeCompare(b.start)),
    [contractions],
  );

  // One-time migration: stamp old contractions (no sessionId) with the primary
  // session. Idempotent — only writes if any are missing the field.
  //
  // We used to also call setSessions(getSessions()) here, "to make sure
  // the primary session exists in the sessions list". But that's a
  // no-op: the useState initializer on line ~174 already loaded
  // sessions via getSessions(), and no edits can happen between the
  // first render and the mount-effect. The extra call was dead code
  // and would silently overwrite any in-memory session edits if
  // they ever did land in this 0-tick window. Removed.
  useEffect(() => {
    const migrated = migrateContractionsToSessions(contractions);
    if (migrated !== contractions) {
      setContractions(migrated);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const showAlert = isCarePlanPattern(contractions, carePlan, now);

  // Care-plan progress: count recent contractions near the saved duration.

  const currentElapsed = current && !current.end ? durationSeconds(current, now) : 0;
  const secondsSinceFinish = secondsSinceLastFinish(contractions, now);
  const hasRecentTiming = secondsSinceFinish !== null && secondsSinceFinish < 3600;
  const laborView = current !== null || journey.profile.phase === 'labor' || hasRecentTiming;
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

  // Snooze state for 5-1-1 reminder: when set, reminders are suppressed until this timestamp
  const [snoozedUntil, setSnoozedUntil] = useState<number>(0);

  // Voice the 5-1-1 alert once when it transitions from off → on,
  // and re-fire every 10 minutes while the pattern persists.
  useEffect(() => {
    if (!showAlert) return;
    const nowMs = Date.now();
    // Snoozed: suppress until snooze expires
    if (snoozedUntil > nowMs) return;
    // Re-fire interval: 10 minutes
    if (nowMs - lastAlertAtRef.current < 10 * 60 * 1000) return;
    lastAlertAtRef.current = nowMs;
    chimeAlert();
    const elapsedMin = lastAlertAtRef.current > 0
      ? Math.round((nowMs - alertAnnouncedRef.current) / 60_000)
      : 0;
    if (elapsedMin > 1) {
      speak(`5 1 1 still active, ${elapsedMin} minutes since the last alert.`, { force: true });
    } else {
      speak(`Your saved ${carePlan.intervalMinutes} ${Math.round(carePlan.durationSeconds / 60)} ${carePlan.windowMinutes} reminder pattern is showing. Follow the plan from your care team.`, { force: true });
    }
  }, [showAlert, snoozedUntil, carePlan]);

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
    <div data-timer-active={!!current} className="olive-app flex flex-col h-dvh text-ink-50 max-w-md mx-auto w-full">
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

      {/* Quota exceeded toast — shown when localStorage is full and data is at risk */}
      {quotaToast && (
        <div
          className="fixed inset-x-0 top-6 z-50 flex justify-center pointer-events-none"
          role="alert"
          aria-live="assertive"
        >
          <div className="pointer-events-auto mx-4 flex items-start gap-3 bg-rose-300/15 border border-rose-300/40 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] max-w-sm animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-300 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-rose-200">Storage full</div>
              <div className="text-xs text-ink-300 mt-0.5">
                Contractions may not be saved. Export a backup to free space.
              </div>
            </div>
            <button
              onClick={handleDismissQuota}
              className="p-1 text-ink-400 active:text-ink-200 flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Timer restore prompt — shown when IDB has an in-progress timer but localStorage doesn't */}
      {pendingRestore && (
        <div
          className="flex-shrink-0 mx-5 mt-4 rounded-2xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 flex items-start gap-3 animate-fade-in"
        >
          <div className="w-8 h-8 rounded-full bg-amber-300/15 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-amber-300" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-amber-200 font-display">In-progress timer found</div>
            <div className="text-xs text-ink-300 mt-0.5 leading-relaxed">
              {pendingRestoreAt ? `Saved at ${new Date(pendingRestoreAt).toLocaleTimeString()}. ` : ''}
              Resume tracking from where you left off?
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  setCurrent(pendingRestore);
                  clearCurrentFromIdb().catch(() => {});
                  setPendingRestore(null);
                  setPendingRestoreAt(null);
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-300/20 text-amber-200 font-semibold active:bg-amber-300/30 transition-colors"
              >
                Resume
              </button>
              <button
                onClick={() => {
                  clearCurrentFromIdb().catch(() => {});
                  setPendingRestore(null);
                  setPendingRestoreAt(null);
                }}
                className="text-xs text-ink-400 hover:text-ink-200 active:text-ink-100 transition-colors px-2 py-1.5"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for backup import */}
      {backupError && (
        <div role="alert" className="fixed bottom-20 inset-x-5 z-50 mx-auto max-w-sm rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-xs text-red-200 animate-fade-in shadow-[0_4px_24px_-8px_rgba(248,113,113,0.3)] flex items-center gap-2">
          <span className="flex-1">{backupError}</span>
          <button onClick={() => setBackupError(null)} className="text-red-300 font-medium">Dismiss</button>
        </div>
      )}
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
      {showManual && (
        <ManualContractionSheet
          onClose={() => setShowManual(false)}
          onSave={(start, end) => {
            setContractions((prev) =>
              [...prev, { id: uid(), start, end, intensity: null, sessionId: activeSessionId, source: 'manual' as const }].sort((a, b) => a.start.localeCompare(b.start)),
            );
            setShowManual(false);
          }}
        />
      )}

      {showSettings && (
        <SettingsSheet
          bigText={bigText}
          setBigTextState={setBigTextState}
          muteSchedule={muteSchedule}
          setMuteScheduleState={setMuteScheduleState}
          carePlan={carePlan}
          onCarePlanChange={(value) => {
            const normalized = normalizeCarePlan(value);
            setCarePlanState(normalized);
            setCarePlan(normalized);
          }}
          themeVariant={themeVariant}
          setThemeVariant={(v) => {
            setThemeVariant(v);
            localStorage.setItem('contraction-tracker:theme', v);
          }}
          hour12={hour12}
          setHour12={(v) => {
            setHour12(v);
            setHour12Preferred(v);
          }}
          handleExportBackup={handleExportBackup}
          handleSendVia={handleSendVia}
          fileInputRef={fileInputRef}
          appVersion={APP_VERSION}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Sessions sheet — drops from the Olive wordmark */}
      {showJourney && (
        <JourneySheet
          journey={journey}
          onJourneyChange={setJourney}
          onPhaseChange={(nextPhase: JourneyPhase) => {
            setJourney((currentJourney) => updateJourneyPhase(currentJourney, nextPhase));
          }}
          onClose={() => {
            setShowJourney(false);
            requestAnimationFrame(() => journeyOpenerRef.current?.focus());
          }}
        />
      )}

      {showSessions && !showPeople && (
          <SessionsSheet
            contractions={contractions}
            activeSessionId={activeSessionId}
            onActiveChange={(id) => {
              setActiveId(id);
              setShowSessions(false);
            }}
            onClose={() => setShowSessions(false)}
            onViewSession={(s) => {
              setViewingSessionId(s.id);
              setShowSessions(false);
            }}
          />
      )}

      {/* People sheet — closes both sheets when dismissed */}
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

      {/* Header */}
      <header className="flex-shrink-0 px-5 pt-5 pb-3 flex flex-wrap gap-2 items-center justify-between relative">
        <div className="flex items-center gap-3">
        <h1 aria-label="Olive" className="flex items-center"><BrandWordmark /></h1>
        <button
          onClick={(event) => {
            // Safari touch clicks do not focus buttons automatically. Capture a
            // real opener so the modal can return focus after it closes.
            event.currentTarget.focus();
            setShowSessions((s) => !s);
            setShowSettings(false);
            setShowBackupInfo(false);
          }}
          className="min-h-11 flex items-center gap-2 active:opacity-70"
          aria-label="Sessions"
          aria-haspopup="dialog"
          aria-expanded={showSessions}
        >
          <span className="text-xs text-ink-200 font-medium">Sessions</span>
          <ChevronDown className="w-3.5 h-3.5 text-ink-400" strokeWidth={2} />
        </button>
        </div>
        <div className="flex items-center gap-0.5">
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
            className="min-h-11 min-w-11 p-2 rounded-lg text-ink-300 active:text-rose-300 active:bg-ink-100/10 transition-colors"
            aria-label="Settings"
            title="Settings"
          >
            <Cog className="w-4 h-4" strokeWidth={1.75} />
          </button>
          {/* Voice is off the labor screen: Web Speech inside Capacitor is unreliable at 3am. */}
        </div>

        {/* Tooltip — drops down from the saved indicator */}
        {showBackupInfo && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setShowBackupInfo(false)}
              aria-hidden="true"
            />
            <div className="absolute right-5 top-full mt-1 z-40 w-72 rounded-2xl border border-sage-300/30 bg-plum-950/95 backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] px-4 py-3.5 animate-fade-in">
              <div className="flex items-start gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-full bg-sage-300/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield className="w-3.5 h-3.5 text-sage-300" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink-50 font-display">
                    Saved on this phone
                  </div>
                  <p className="text-[11px] text-ink-300 mt-1 leading-relaxed">
                    Every contraction is saved automatically. Even if you
                    close the app or lose internet, your history stays.
                  </p>
                  {savedAt && (
                    <div className="text-[10px] text-ink-500 mt-2 font-medium">
                      Last saved {formatRelative(savedAt, now)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { handleExportBackup(); setShowBackupInfo(false); }}
                  className="flex-1 text-xs bg-sage-300/20 active:bg-sage-300/30 text-sage-300 rounded-lg px-3 py-2 font-medium transition-colors"
                >
                  Export backup
                </button>
                <button
                  onClick={() => { fileInputRef.current?.click(); setShowBackupInfo(false); }}
                  className="flex-1 text-xs bg-ink-100/10 active:bg-ink-100/20 text-ink-300 rounded-lg px-3 py-2 font-medium transition-colors"
                >
                  Import backup
                </button>
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
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-rose-200 font-display">Saved care-plan reminder</div>
            <div className="text-xs text-ink-300 mt-0.5 leading-relaxed">
              The timing now matches your saved reminder: every {carePlan.intervalMinutes} minutes, lasting at least {carePlan.durationSeconds} seconds, for {carePlan.windowMinutes} minutes. This is not a diagnosis. Follow the plan from {carePlan.providerName || 'your care team'}.
            </div>
            {carePlan.providerPhone && (
              <a
                href={`tel:${carePlan.providerPhone.replace(/[^+\d]/g, '')}`}
                className="mt-2 inline-flex min-h-11 items-center whitespace-nowrap rounded-xl bg-rose-300 px-4 py-2 text-xs font-semibold text-plum-950"
              >
                Call {carePlan.providerName || 'care provider'}
              </a>
            )}
            {/* Stop reminding — snooze for 24 hours */}
            <button
              onClick={() => setSnoozedUntil(Date.now() + 24 * 60 * 60 * 1000)}
              className="mt-2 text-xs text-ink-400 hover:text-ink-200 active:text-ink-100 transition-colors"
            >
              Stop reminding
            </button>
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

      {/* Backup reminder banner — soft nudge if no local backup has been
          exported recently. The "Back up now" CTA triggers the actual
          file-download backup. Hidden during active timing and while
          editing a contraction so it doesn't obstruct those flows. */}
      {showBackupBanner && !current && !editingId && (
        <div className="flex-shrink-0 mx-5 mb-3 rounded-2xl border border-sage-300/30 bg-sage-300/10 px-4 py-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-sage-300/15 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-sage-300" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-ink-100 font-display">Save a backup</div>
              <div className="text-xs text-ink-300 mt-0.5 leading-relaxed">
                Download a .json file with your full contraction history. Keep it somewhere safe.
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.setItem(BACKUP_REMINDER_KEY, JSON.stringify(Date.now()));
                setDismissedBannerAt(Date.now());
              }}
              className="p-1 text-ink-400 active:text-ink-200 flex-shrink-0"
              aria-label="Dismiss backup reminder"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={() => {
                // Run the real export, then mark the banner as handled so it
                // doesn't reappear on the next visit. handleExportBackup is
                // synchronous (it triggers a file download), so the user
                // sees the file dialog immediately.
                handleExportBackup();
                localStorage.setItem(BACKUP_REMINDER_KEY, JSON.stringify(Date.now()));
                setDismissedBannerAt(Date.now());
              }}
              className="flex-1 text-xs font-semibold bg-sage-300/20 active:bg-sage-300/30 text-sage-100 rounded-lg px-3 py-2 transition-colors min-h-[44px]"
            >
              Back up now
            </button>
            <button
              onClick={() => {
                localStorage.setItem(BACKUP_REMINDER_KEY, JSON.stringify(Date.now()));
                setDismissedBannerAt(Date.now());
              }}
              className="text-xs text-ink-400 active:text-ink-200 rounded-lg px-3 py-2 min-h-[44px] border border-ink-200/20"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-5 pb-8 w-full">
        {/* Hero CTA */}
        <div className="pt-2 pb-6">
          {!current ? (
            <button
              ref={timerButtonRef}
              onClick={handleStart}
              className="w-full min-h-[200px] rounded-3xl bg-gradient-to-br from-rose-300 via-rose-400 to-rose-500 text-plum-950 active:scale-[0.99] transition-transform duration-150 flex flex-col items-center justify-center px-6 py-8"
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
            <div className="w-full">
              <ActiveTimerControl elapsed={currentElapsed} onStop={handleStop} buttonRef={timerButtonRef} />
              <div className="flex flex-col items-center mt-3">
              <span role="timer" aria-label={`Elapsed contraction time: ${formatDurationSpoken(currentElapsed)}`} className="sr-only">{formatDuration(currentElapsed)}</span>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-rose-300 animate-pulse-live" />
                <div className="text-[10px] uppercase tracking-[0.25em] text-rose-300 font-semibold">
                  <span role="status">In progress</span>
                </div>
                {document.pictureInPictureEnabled && !document.pictureInPictureElement && (
                  <button
                    onClick={handleEnterPip}
                    className="ml-1 p-1 rounded text-rose-300/60 active:text-rose-300 active:bg-rose-300/10 transition-colors"
                    aria-label="Open floating timer"
                    title="Open floating timer (stays visible while you use other apps)"
                  >
                    <PictureInPicture2 className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                )}
                {document.pictureInPictureElement && (
                  <button
                    onClick={handleEnterPip}
                    className="ml-1 p-1 rounded text-rose-300/60 active:text-rose-300 active:bg-rose-300/10 transition-colors"
                    aria-label="Close floating timer"
                    title="Close floating timer"
                  >
                    <X className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                )}
              </div>
              <div className="text-xs text-ink-300 mt-3 text-center">
                <span>Started at {formatClock(current.start)}</span>
                <details className="mt-1">
                  <summary className="min-h-11 cursor-pointer flex items-center justify-center text-ink-300">Adjust start time</summary>
                <input
                  type="time"
                  step="1"
                  value={current.start ? `${String(new Date(current.start).getHours()).padStart(2,'0')}:${String(new Date(current.start).getMinutes()).padStart(2,'0')}:${String(new Date(current.start).getSeconds()).padStart(2,'0')}` : ''}
                  onChange={(e) => {
                    const changed = withClockTime(current, 'start', e.target.value);
                    if (!changed) { toast.error('Choose a valid start time within the last four hours.'); return; }
                    setStartCorrection({ id: current.id, start: current.start });
                    setCurrent({ ...current, start: changed.start });
                  }}
                  className="bg-transparent text-ink-400 border-none outline-none focus:underline focus:text-rose-300 cursor-pointer"
                  aria-label="Edit start time"
                />
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {[10, 30, 60].map((seconds) => <button key={seconds} type="button" className="min-h-11 rounded-xl border border-ink-200/30 px-3 text-sm text-ink-200" onClick={() => {
                    const changed = withStartOffset(current, -seconds);
                    if (!changed) { toast.error('That adjustment would exceed four hours.'); return; }
                    setStartCorrection({ id: current.id, start: current.start });
                    setCurrent({ ...current, start: changed.start });
                  }}>Started {seconds}s earlier</button>)}
                  {startCorrection?.id === current.id && <button type="button" className="min-h-11 px-3 text-sm text-sage-300" onClick={() => { setCurrent({ ...current, start: startCorrection.start }); setStartCorrection(null); }}>Undo start adjustment</button>}
                </div>
                </details>
              </div>
              <div className="text-[10px] text-sage-300/80 mt-1.5 tracking-wide flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isWakeLockHeld() ? 'bg-sage-300/70' : 'bg-amber-300/70'}`} />
                <span>{isWakeLockHeld() ? 'Screen will stay on' : 'Screen may dim — tap to keep awake'}</span>
              </div>
              </div>
            </div>
          )}
        </div>

        <nav aria-label="Care access" className="grid grid-cols-2 gap-2 mb-4">
          {carePlan.providerPhone ? <a href={`tel:${carePlan.providerPhone.replace(/[^+\d]/g, '')}`} className="min-h-11 rounded-xl border border-sage-300/40 px-3 py-3 text-sm text-sage-300 text-center break-words">Call {carePlan.providerName || 'care team'}</a> : <button type="button" onClick={() => setShowSettings(true)} className="min-h-11 rounded-xl border border-ink-200/30 px-3 py-3 text-sm text-ink-200">Set care-team contact</button>}
          <button type="button" onClick={() => setShowPeople(true)} className="min-h-11 rounded-xl border border-ink-200/30 px-3 py-3 text-sm text-ink-200">Care contacts</button>
        </nav>

        {/* "Since last" hero stat — biggest reading on the page during active
            labor, between contractions. Hidden while a contraction is in
            progress (the in-progress card takes that role) and for the
            first few seconds of the very first contraction. */}
        {!current && finished.length > 0 && secondsSinceFinish !== null && (
          <div className="mb-4 rounded-2xl border border-ink-200/30 bg-gradient-to-br from-ink-100/[0.04] to-transparent px-4 py-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.2em] text-ink-400 font-semibold">{hasRecentTiming ? 'Since last' : 'Last recorded'}</div>
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
                    // No confirmation prompt — the existing undo toast (see
                    // handleDelete + the useUndo stack at the bottom of the
                    // screen) gives the user 5 seconds to tap Undo and
                    // reverse the action. window.confirm was added in case
                    // the undo toast failed silently, but the native dialog
                    // is a worse experience than the toast (blocks the page,
                    // can't be styled, and on iOS PWAs can be flaky).
                    const last = finished[finished.length - 1];
                    if (!last) return;
                    handleDelete(last.id);
                  }}
                  className="text-ink-300 active:text-rose-300 active:bg-ink-100/10 px-2 py-1 rounded-lg flex items-center gap-1 text-[11px] transition-colors"
                  title="Delete last contraction"
                  aria-label="Delete last contraction"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete last</span>
                </button>
              </div>
            </div>
            <div className="font-display text-4xl font-light text-ink-50 tabular-nums mt-1 leading-none">
              {hasRecentTiming ? formatDuration(secondsSinceFinish) : formatRelative(new Date(finished[finished.length - 1].end!), now)}
            </div>
            <div className="text-[10px] text-ink-500 mt-1.5">
              {finished.length === 1
                ? 'First one recorded. Keep tracking and follow the instructions from your care team.'
                : `${pluralContraction(finished.length)} logged · started ${formatElapsed(totalLogElapsedSec)} ago`}
            </div>
            {hasRecentTiming && <div className="flex items-center gap-1.5 mt-3 text-xs text-ink-300">
              <span>Stopped late?</span>
              {[10, 30].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => shortenLast(sec)}
                  className="px-2 py-1 rounded-full border border-ink-300/30 text-ink-300"
                >
                  −{sec}s
                </button>
              ))}
            </div>}
          </div>
        )}

        {laborView && finished.length > 0 && <div className="mb-4"><RecentTimingSummary contractions={finished} now={now} /></div>}

        {/* Onboarding — 3 inline hint cards for first-time users */}
        {onboardingStep !== null && finished.length === 0 && !current && (
          <Onboarding onDismiss={() => setOnboardingStep(null)} />
        )}

        {!current && !laborView && (finished.length > 0 || onboardingStep === null) && (
          <TodayPanel compact={false} journey={journey} onOpen={() => setShowJourney(true)} buttonRef={journeyOpenerRef} />
        )}

        {!current && laborView && <button type="button" onClick={() => setShowJourney(true)} ref={journeyOpenerRef} aria-label="Open birth journey" className="mb-4 min-h-11 w-full rounded-xl border border-ink-200/30 px-4 text-sm text-ink-200">Care details & preparation</button>}

        {/* Care tools remain available between contractions. */}
        {!current && <div className="mb-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowMoreTools((visible) => !visible)}
              aria-expanded={showMoreTools}
              aria-controls="olive-more-tools"
              aria-label={showMoreTools ? 'Hide more tools' : 'More tools'}
              className="col-span-2 rounded-2xl border border-ink-200/30 bg-ink-100/5 px-4 py-3 flex items-center justify-center gap-2 min-h-11 text-ink-300 active:bg-ink-100/10 transition-colors"
            >
              <Plus className={`w-4 h-4 transition-transform ${showMoreTools ? 'rotate-45' : ''}`} />
              <span className="text-[11px] font-medium">{showMoreTools ? 'Fewer tools' : 'More tools'}</span>
            </button>
          </div>
          {showMoreTools && (
            <div id="olive-more-tools" className="grid grid-cols-2 gap-2 animate-fade-in">
              <HospitalBagCard sessionId={activeSessionId} onClick={() => setShowChecklist(true)} />
              <CervicalExamCard sessionId={activeSessionId} onClick={() => setShowHospital(true)} />
              <PeopleCard onClick={() => setShowPeople(true)} />
              <FeatureCard
                icon={<Plus className="w-4 h-4" />}
                label="New session"
                sub="Start fresh"
                onClick={() => {
                  setShowSessions(true);
                }}
                accent="sage"
              />
              <FeatureCard
                icon={<Download className="w-4 h-4" />}
                label="Backup"
                sub="Export & restore"
                onClick={() => setShowBackupInfo(true)}
                accent="sage"
              />
            </div>
          )}
        </div>}

        {/* Friends banner — reduced; now handled by carousel */}
        {/* Hospital bag pill — reduced; now handled by carousel */}

        {!current && (
          <button
            type="button"
            aria-label="Add missed contraction"
            onClick={() => setShowManual(true)}
            className="mb-4 inline-flex items-center gap-1.5 text-[11px] text-ink-400 active:text-rose-300 rounded-full border border-ink-200/30 bg-ink-100/5 px-3 py-1.5 min-h-[44px] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
            Forgot to tap? Add it
          </button>
        )}

        {/* History list */}
        {finished.length > 0 && (
          <div className="mb-4">
            {!laborView && <RecentTimingSummary contractions={finished} now={now} />}
            <HistoryHeader
              onReadSummary={handleReadSummary}
              onShare={handleShare}
              onDownload={handleDownload}
            />

            {/* Tag filter chips — only shown when there are tagged contractions */}
            <TagFilter
              knownTags={knownTags}
              finishedCount={finished.length}
              tagFilter={tagFilter}
              onSetTagFilter={setTagFilter}
            />
            <ul className="space-y-3">
              {[...visibleFinished].reverse().map((c) => {
                const dur = durationSeconds(c, now);
                const chronologicalIndex = finished.findIndex((item) => item.id === c.id);
                const interval = chronologicalIndex > 0 ? intervalSeconds(finished[chronologicalIndex - 1], c) : null;
                const isEditing = editingId === c.id;
                const editable = isEditing && timingDraft?.id === c.id ? timingDraft : c;
                return (
                  <li
                    key={c.id}
                    className="rounded-2xl border border-ink-200/30 bg-gradient-to-br from-ink-100/[0.04] to-transparent px-4 py-5 overflow-hidden"
                  >
                    {isEditing ? (
                      <div className="space-y-2.5 animate-fade-in">
                        <div className="grid grid-cols-2 gap-3">
                          <label className="text-xs text-ink-300">
                            Start time
                            <div className="mt-1 min-h-11 flex items-center">
                              <input
                                type="time"
                                step="1"
                                value={editable.start ? `${String(new Date(editable.start).getHours()).padStart(2,'0')}:${String(new Date(editable.start).getMinutes()).padStart(2,'0')}:${String(new Date(editable.start).getSeconds()).padStart(2,'0')}` : ''}
                                onChange={(e) => {
                                  const changed = withClockTime(editable, 'start', e.target.value);
                                  if (!changed) { toast.error('Start must be before the end, within four hours, and not in the future.'); return; }
                                  setTimingDraft({ ...editable, ...changed });
                                }}
                                className="font-display text-sm font-medium text-ink-50 bg-transparent border-none outline-none focus:underline focus:text-rose-300 w-[6.5rem] pr-0 tabular-nums cursor-pointer"
                                aria-label="Edit start time"
                              />
                            </div>
                          </label>
                          <label className="text-xs text-ink-300">
                            End time
                            <div className="mt-1 min-h-11 flex items-center">
                              <input
                                type="time"
                                step="1"
                                value={editable.end ? `${String(new Date(editable.end).getHours()).padStart(2,'0')}:${String(new Date(editable.end).getMinutes()).padStart(2,'0')}:${String(new Date(editable.end).getSeconds()).padStart(2,'0')}` : ''}
                                onChange={(e) => {
                                  const changed = withClockTime(editable, 'end', e.target.value);
                                  if (!changed) { toast.error('End must be after the start, within four hours, and not in the future.'); return; }
                                  setTimingDraft({ ...editable, ...changed });
                                }}
                                className="font-display text-sm font-medium text-ink-300 bg-transparent border-none outline-none focus:underline focus:text-rose-300 w-[6.5rem] pr-0 tabular-nums cursor-pointer"
                                aria-label="Edit end time"
                              />
                            </div>
                          </label>
                        </div>

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
                                    ? 'bg-rose-300 text-plum-950 ring-2 ring-rose-200 ring-offset-2 ring-offset-plum-950'
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
                                const target = timingDraft;
                                if (!target || !target.end) return;
                                const changed = withEndOffset(target, sec);
                                if (!changed) { toast.error('That adjustment would create an invalid duration.'); return; }
                                setTimingDraft({ ...target, ...changed });
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
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            {c.source === 'manual' && <span className="text-xs text-ink-300">Manual</span>}
                            <span className="text-sm text-ink-200 tabular-nums">{formatClock(c.start)} – {formatClock(c.end!)}</span>
                            <span className="text-sm text-ink-300">Duration <strong className="font-display text-xl font-medium text-rose-300 tabular-nums">{formatDuration(dur)}</strong></span>
                          </div>
                          <div className="text-xs text-ink-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            {c.intensity ? (
                              <span>intensity {c.intensity}/10</span>
                            ) : null}
                            {interval !== null && (
                              <span>Spacing {formatDuration(interval)} · start to start</span>
                            )}
                            {c.note && <span className="truncate">— {c.note}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 ml-2">
                          <button
                            onClick={() => {
                              setEditingId(c.id);
                              setTimingDraft({ ...c });
                              setIntensityDraft(c.intensity?.toString() ?? '');
                              setNoteDraft(c.note ?? '');
                              setTagsDraft(c.tags ?? []);
                              setPainLocationsDraft(c.painLocations ?? []);
                            }}
                            className="min-w-11 min-h-11 p-2 text-ink-300 active:text-rose-300 transition-colors"
                            aria-label="Edit"
                          >
                            <Pencil className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="min-w-11 min-h-11 p-2 text-ink-300 active:text-rose-300 transition-colors"
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
        {finished.length === 0 && !current && onboardingStep === null && (
          <div className="text-center pt-4 pb-2 animate-fade-in">
            <div
              className="cursor-pointer"
              onClick={handleStart}
              role="button"
              aria-label="Tap to start a contraction"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleStart();
                }
              }}
            >
              <div className="font-display text-2xl font-light text-ink-200 tracking-tight">
                When you're ready.
              </div>
              <p className="text-sm text-ink-400 mt-2 leading-relaxed max-w-xs mx-auto">
                Tap the big button when a contraction begins.
              </p>
            </div>
            {/* Pre-open the floating timer so it stays visible while using
                other apps during labor. One tap, then forget about it. */}
            {document.pictureInPictureEnabled && !document.pictureInPictureElement && (
              <button
                onClick={handleEnterPip}
                className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-ink-400 active:text-rose-300 border border-ink-200/20 rounded-full px-3 py-1.5 min-h-[32px] transition-colors"
              >
                <PictureInPicture2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                Open floating timer
              </button>
            )}
            {!document.pictureInPictureEnabled && (
              <p className="mt-2 text-[10px] text-ink-500 text-center">
                Keep the app open — your screen won't sleep while timing.
              </p>
            )}
            {document.pictureInPictureElement && (
              <button
                onClick={handleEnterPip}
                className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-rose-300 border border-rose-300/30 rounded-full px-3 py-1.5 min-h-[32px] transition-colors"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                Close floating timer
              </button>
            )}
          </div>
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

        {/* Global toast host — renders any active toast from the
            toast store. Mounted last so it sits above other fixed
            elements (Undo, DataRestored, QuotaExceeded). */}
        <ToastHost />
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
      aria-label={`${label}: ${sub}`}
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

function RecentTimingSummary({ contractions, now }: { contractions: Contraction[]; now: number }) {
  const summary = summarizeRecentContractions(contractions, now);
  return <section aria-label="Recent timing" className="mb-4 rounded-2xl border border-sage-300/25 bg-sage-300/5 px-4 py-4">
    <h2 className="text-sm font-semibold text-ink-200">Last hour</h2>
    <p className="text-xs text-ink-300 mt-1">{summary.count} completed · all sessions</p>
    {summary.count > 0 && <dl className="grid grid-cols-2 gap-3 mt-3">
      <div><dt className="text-xs text-ink-300">Average duration</dt><dd className="text-xl font-display text-rose-300 mt-1">{formatDuration(summary.averageDuration!)}</dd></div>
      <div><dt className="text-xs text-ink-300">Average spacing</dt><dd className="text-xl font-display text-sage-300 mt-1">{summary.averageSpacing === null ? '—' : formatDuration(summary.averageSpacing)}</dd></div>
    </dl>}
    <p className="text-xs text-ink-300 mt-3">Spacing is measured start to start.{summary.count === 1 ? ' Add another contraction to see spacing.' : ''}</p>
  </section>;
}
