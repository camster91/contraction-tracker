// Read-only share view rendered at `/?share=CODE`.
// v3 — state-aware with activity feed.
//
// Audience: the host's "circle" — partner, parents, siblings,
// doula, OB/GYN. The copy is written for the non-medical
// members of the circle (parents, siblings): clinical terms
// like "active labor" are softened to "things are starting",
// "contractions so far" is softened to "first signs recorded"
// etc. Medical users still get the numerical data below.

import { useEffect, useMemo, useState } from 'react';
import { Heart, Shield, AlertTriangle, Clock } from 'lucide-react';
// pdf-lib is loaded on demand inside handleDownloadMemoryBook() (was a
// top-level import before, but that forced every share-viewer viewer — the
// highest-traffic URL — to pay the ~250KB gzipped cost on first paint, even
// though only archived shares ever trigger the PDF path). Vite will code-split
// the dynamic import into a separate chunk that the read-only viewer never
// fetches unless they hit "Download PDF" on an archived share.
type PdfLib = typeof import('pdf-lib');
let pdfLibPromise: Promise<PdfLib> | null = null;
function loadPdfLib(): Promise<PdfLib> {
  if (!pdfLibPromise) pdfLibPromise = import('pdf-lib');
  return pdfLibPromise;
}
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
} from '../lib/sessions';
import {
  getShareFromRelay,
  pullContractionsFromRelay,
  markShareOpenedOnRelay,
  getShareStats,
  postContractionEventToRelay,
  validatePinOnRelay,
  type ShareStats,
  RELAY_URL,
} from '../lib/relay';
import { getOrCreateClientId } from '../lib/identity';
import { toast } from '../lib/toast';
import ActivityFeed from './ActivityFeed';

export default function ShareView({ code }: { code: string }) {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const [pinNetworkError, setPinNetworkError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [share, setShare] = useState<any>(null);
  const [stateChangedAt, setStateChangedAt] = useState<string | null>(null);
  const [shareMode, setShareMode] = useState<'full' | 'stats' | 'track'>('full');
  const [stats, setStats] = useState<ShareStats | null>(null);
  const [contractions, setContractions] = useState<any[]>([]);
  const [currentContraction, setCurrentContraction] = useState<{ start: number; author: string | null } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // T4: The viewer can author start/stop events on the relay when:
  //   - shareMode is 'full' or 'track' (not 'stats' — friends are read-only)
  //   - the viewer is not the original creator of the share
  //   - the share state allows writes (not in 'archived' or postpartum >24h)
  // The host is identified by a localStorage marker set when they CREATE
  // a share, not by clientId — a partner who is in the room when the host
  // creates the share on their phone should still be able to time.
  const isHost = useMemo(() => {
    try {
      return localStorage.getItem(`olive:share-owner:${code}`) === '1';
    } catch {
      return false;
    }
  }, [code]);
  const canAuthorEvents = shareMode !== 'stats' && !isHost;
  const [eventInFlight, setEventInFlight] = useState(false);
  const [lastEventError, setLastEventError] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      // Sanitize the code up front. Valid codes are 6 chars from a 30-char
      // alphabet (lowercase a-z minus ambiguous + digits 2-9). Reject anything
      // else so a malformed URL doesn't waste a relay call and so we can show
      // a precise "This doesn't look like an Olive share link" error.
      // Six-character codes remain valid for existing links. New relay links
      // use 12 characters to make capability guessing impractical.
      const codePattern = /^(?:[a-z2-9]{6}|[a-z2-9]{12})$/;
      if (!code || !codePattern.test(code)) {
        if (mounted) {
          setError('This doesn\u2019t look like an Olive share link. Check the URL and try again.');
          setChecked(true);
        }
        return;
      }

      try {
        // Try relay first
        const relayShare = await getShareFromRelay(code);
        if (mounted && relayShare) {
          const relayData = await pullContractionsFromRelay(code);
          if (relayData?.contractions?.length) {
            setContractions(relayData.contractions);
          }
          if (!relayShare.hasPin) {
            setUnlocked(true);
            markShareOpenedOnRelay(code).catch(() => {});
          }
          // Distinguish expired shares from "not found" for a clearer error.
          if (relayShare.expiresAt && Date.now() > new Date(relayShare.expiresAt).getTime()) {
            setError('This share link has expired. Ask for a new one.');
            setChecked(true);
            return;
          }
          setShare({
            id: code,
            sessionId: relayShare.sessionId,
            state: relayShare.state || 'prenatal',
            expiresAt: relayShare.expiresAt,
            revoked: false,
            createdAt: relayShare.createdAt,
            pin: relayShare.hasPin ? '••••' : undefined,
            lastOpenedAt: relayShare.lastOpenedAt,
            mode: relayShare.mode || 'full',
          });
          const mode = relayShare.mode || 'full';
          setShareMode(mode);
          setStateChangedAt(relayShare.stateChangedAt || null);
          setChecked(true);
          // If stats mode, fetch aggregate now and skip the contractions pull.
          if (mode === 'stats') {
            getShareStats(code).then(setStats).catch(() => {});
          }
          return;
        }
      } catch {
        // Relay unavailable — fall through to localStorage
      }

      try {
        const s = getShare(code);
        if (mounted) {
          if (s && s.expiresAt && Date.now() > new Date(s.expiresAt).getTime()) {
            setError('This share link has expired. Ask for a new one.');
            setChecked(true);
            return;
          }
          if (s && s.revoked) {
            setError('This share link was revoked. Ask for a new one.');
            setChecked(true);
            return;
          }
          setShare(s);
          setChecked(true);
          if (s && isShareValid(s) && !s.pin) {
            setUnlocked(true);
            markShareOpened(s.id);
          }
        }
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || 'Failed to load');
          setChecked(true);
        }
      }
    })();
    return () => { mounted = false; };
  }, [code]);

  // Live tick
  useEffect(() => {
    if (!unlocked) return;
    const id = setInterval(() => { setNow(Date.now()); }, 1000);
    return () => clearInterval(id);
  }, [unlocked]);

  // Read localStorage contractions
  useEffect(() => {
    if (!unlocked || !share) return;
    try {
      const stored = localStorage.getItem('contraction-tracker:v1');
      if (!stored) return;
      const data = JSON.parse(stored);
      const all = data?.contractions || [];
      setContractions(all.filter((c: any) => sessionIdOf(c) === (share.sessionId || 'primary')));
    } catch { /* ignore */ }
  }, [unlocked, share]);

  // SSE live updates — replaces 1s polling when the relay supports it.
  // Falls back to adaptive polling (1s during contraction, 15s otherwise)
  // if EventSource fails to connect. This is the single fix that lets 20
  // viewers watch a labor without hammering the relay with 1200 req/min.
  //
  // v1.1: in 'stats' mode, we subscribe to SSE only to detect state changes
  // (e.g. labor → postpartum) and re-fetch /stats on every update. We never
  // pull /contractions because the relay 403s that path for stats shares.
  useEffect(() => {
    if (!unlocked || !share) return;
    if (shareMode === 'stats') {
      // Stats mode: poll the /stats endpoint on the same adaptive cadence.
      let pollTimer2: ReturnType<typeof setTimeout> | null = null;
      const tick = async () => {
        try {
          const s = await getShareStats(code);
          if (s) setStats(s);
        } catch { /* ignore */ }
        pollTimer2 = setTimeout(tick, 5000);
      };
      tick();
      return () => { if (pollTimer2) clearTimeout(pollTimer2); };
    }
    const url = `${RELAY_URL}/api/shares/${code}/stream`;
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    // Reconnect backoff — caps at 30s so a sustained outage doesn't
    // thundering-herd the relay (the original bug: EventSource auto-reconnects
    // on a near-instant loop, 20 viewers = 20 simultaneous reconnects).
    let reconnectAttempts = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let fellBackToPolling = false;
    const startPolling = () => {
      if (pollTimer || fellBackToPolling) return;
      fellBackToPolling = true;
      // Stop the EventSource entirely so it doesn't keep retrying in the
      // background while we're polling. Single polling loop = single source
      // of truth for the relay's load.
      try { es?.close(); } catch { /* ignore */ }
      es = null;
      const tick = async () => {
        let latest: any = null;
        try {
          latest = await pullContractionsFromRelay(code);
          if (latest?.contractions) {
            setContractions(latest.contractions);
          }
          if (latest) {
            setCurrentContraction(latest.current || null);
          }
        } catch { /* ignore */ }
        // Adaptive: 1s while a contraction is in progress, 15s otherwise
        const next = latest && latest.current ? 1000 : 15000;
        pollTimer = setTimeout(tick, next);
      };
      tick();
    };
    const stopPolling = () => {
      if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
    };
    const connectSSE = () => {
      try {
        es = new EventSource(url);
        es.onopen = () => {
          reconnectAttempts = 0;
          stopPolling();
        };
        es.onmessage = async (e: MessageEvent) => {
          try {
            const payload = JSON.parse(e.data);
            if (payload.type === 'snapshot' || payload.type === 'update' || payload.type === 'event') {
              if (payload.contractions) setContractions(payload.contractions);
              if ('current' in payload) setCurrentContraction(payload.current || null);
              // Re-fetch the latest from /contractions so we get the canonical state
              // (the SSE message only carries a count + updatedAt for the update type;
              // the event type carries the full derived snapshot but we re-pull anyway
              // to keep this code path uniform and resilient to message-shape drift).
              try {
                const fresh: any = await pullContractionsFromRelay(code);
                if (fresh?.contractions) setContractions(fresh.contractions);
                if (fresh) setCurrentContraction(fresh.current || null);
              } catch { /* ignore */ }
            } else if (payload.type === 'revoked') {
              setShare((s: any) => s ? { ...s, revoked: true } : s);
            }
          } catch { /* ignore malformed event */ }
        };
        es.onerror = () => {
          // EventSource auto-reconnects on a tight loop. Schedule a backoff
          // ourselves and, after 3 failed retries, fall back to polling so
          // 20 viewers don't all reconnect in lockstep.
          if (fellBackToPolling) return;
          reconnectAttempts += 1;
          if (reconnectAttempts >= 3) {
            startPolling();
            return;
          }
          // Close the auto-reconnecting EventSource, then reopen after backoff.
          try { es?.close(); } catch { /* ignore */ }
          es = null;
          if (reconnectTimer) clearTimeout(reconnectTimer);
          const delay = Math.min(30_000, 1000 * 2 ** reconnectAttempts);
          reconnectTimer = setTimeout(connectSSE, delay);
        };
      } catch {
        // Browser doesn't support EventSource (very rare) — fall back
        startPolling();
      }
    };
    connectSSE();
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try { es?.close(); } catch { /* ignore */ }
      stopPolling();
    };
    // shareMode is a dep so the connection flips between SSE (full/track)
    // and the stats-only polling loop when the host upgrades the share.
    // The cleanup above closes the EventSource before the next run.
  }, [unlocked, share, code, shareMode]);

  // ---- Derived ----
  const shareState = share?.state || 'prenatal';
  const finished = useMemo(
    () => contractions.filter((c: any) => c.end).sort((a: any, b: any) => a.start.localeCompare(b.start)),
    [contractions],
  );
  const lastFinished = finished[finished.length - 1];
  const firstFinished = finished[0];
  const totalElapsedSec = firstFinished
    ? Math.round((now - new Date(firstFinished.start).getTime()) / 1000)
    : 0;
  const sinceFinish = secondsSinceLastFinish(contractions, now);
  const showAlert = isFiveOneOne(contractions, now);
  // ---- Memory book PDF (archived shares) ----
  // Generates a single-page PDF in the browser. Loads pdf-lib on first use
  // (see loadPdfLib above) so the read-only viewer doesn't carry the lib
  // in its critical-path bundle.
  const [pdfBusy, setPdfBusy] = useState(false);
  const handleDownloadMemoryBook = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
      const doc = await PDFDocument.create();
      // Letter-size: 612 x 792 pt
      const page = doc.addPage([612, 792]);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const ink = rgb(0.07, 0.05, 0.06);
      const muted = rgb(0.5, 0.4, 0.4);
      let y = 760;
      // Title
      page.drawText('Olive', { x: 50, y, size: 28, font: fontBold, color: ink });
      y -= 24;
      page.drawText('Labor memory book', { x: 50, y, size: 14, font, color: muted });
      y -= 18;
      page.drawText(`Share ${code}  ·  ${new Date().toLocaleString()}`, { x: 50, y, size: 9, font, color: muted });
      y -= 30;
      // Stats summary
      const total = finished.length;
      const dur = (c: any) => Math.round((new Date(c.end).getTime() - new Date(c.start).getTime()) / 1000);
      const durs = finished.map(dur);
      const longest = durs.length ? Math.max(...durs) : 0;
      const shortest = durs.length ? Math.min(...durs) : 0;
      const firstStart = finished[0] ? new Date(finished[0].start).getTime() : 0;
      const lastEnd = finished[finished.length - 1] ? new Date(finished[finished.length - 1].end).getTime() : 0;
      const spanMin = firstStart && lastEnd ? Math.round((lastEnd - firstStart) / 60000) : 0;
      const gaps: number[] = [];
      for (let i = 1; i < finished.length; i++) {
        gaps.push(Math.round((new Date(finished[i].start).getTime() - new Date(finished[i - 1].start).getTime()) / 1000));
      }
      const avgGap = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0;
      page.drawText('Summary', { x: 50, y, size: 12, font: fontBold, color: ink });
      y -= 16;
      const stats = [
        `Total contractions: ${total}`,
        `Longest: ${Math.floor(longest / 60)}m ${(longest % 60).toString().padStart(2, '0')}s`,
        `Shortest: ${Math.floor(shortest / 60)}m ${(shortest % 60).toString().padStart(2, '0')}s`,
        `Total active time: ${spanMin} minutes`,
        `Average gap: ${avgGap ? Math.floor(avgGap / 60) + 'm ' + (avgGap % 60) + 's' : '—'}`,
      ];
      for (const s of stats) {
        page.drawText(s, { x: 60, y, size: 10, font, color: ink });
        y -= 14;
      }
      y -= 16;
      // Contractions list
      page.drawText('Contractions', { x: 50, y, size: 12, font: fontBold, color: ink });
      y -= 16;
      for (let i = 0; i < Math.min(finished.length, 30); i++) {
        const c = finished[i];
        const d = dur(c);
        const time = new Date(c.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const durStr = `${Math.floor(d / 60)}:${(d % 60).toString().padStart(2, '0')}`;
        const intensity = c.intensity ? `  intensity ${c.intensity}/10` : '';
        const tags = (c.tags || []).join(', ');
        const suffix = tags ? `  [${tags}]` : '';
        const line = `${String(i + 1).padStart(2, ' ')}. ${time}  ${durStr}${intensity}${suffix}`;
        page.drawText(line, { x: 60, y, size: 9, font, color: ink });
        y -= 12;
        if (y < 60) break;
      }
      y -= 10;
      page.drawText('Generated by Olive · contractions.ashbi.ca', { x: 50, y: 30, size: 8, font, color: muted });
      const bytes = await doc.save();
      // pdf-lib returns Uint8Array. Cast to BlobPart for the TS Blob ctor.
      // (TS 5.6+ disallows direct Uint8Array<ArrayBufferLike> assignment
      // because of the SharedArrayBuffer union case, but at runtime
      // pdf-lib always uses a plain ArrayBuffer.)
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `olive-memory-${code}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('PDF generation failed: ' + (e as Error).message, { duration: 8000 });
    } finally {
      setPdfBusy(false);
    }
  };

  // T4: send a start or stop event to the relay. The button label flips
  // based on currentContraction. We don't trust the button's own state —
  // we read the latest from the relay and use it to confirm what the next
  // event should be. If a partner already started a contraction while we
  // were on the page, our local view is stale and the relay is the truth.
  const handleSendEvent = async () => {
    if (eventInFlight) return;
    setEventInFlight(true);
    setLastEventError(null);
    const clientId = getOrCreateClientId();
    const next = currentContraction ? 'stop' : 'start';
    try {
      const res = await postContractionEventToRelay(code, {
        type: next,
        authorClientId: clientId,
      });
      if (!res) {
        setLastEventError('Could not reach the relay. Try again.');
        return;
      }
      // Optimistic local update so the button flips instantly. The SSE
      // re-pull will reconcile if the relay says otherwise.
      setCurrentContraction(res.current);
      setContractions(res.contractions);
    } catch (e) {
      setLastEventError('Network error. Try again.');
    } finally {
      setEventInFlight(false);
    }
  };

  // ---- 24h postpartum read-only check ----
  // Once a share has been in 'postpartum' state for 24h+, the feed goes
  // read-only. This keeps the wall stable and signals the "memory book"
  // mode to viewers without manual action from the host.
  const postpartumAgeMs = stateChangedAt && shareState === 'postpartum'
    ? Date.now() - new Date(stateChangedAt).getTime()
    : 0;
  const isReadOnly = shareState === 'archived' || (shareState === 'postpartum' && postpartumAgeMs > 24 * 60 * 60 * 1000);

  // ---- Inline styles (no Tailwind, guaranteed to work) ----
  const pageBg = '#120c10';
  const textMain = '#faf6f4';
  const textMuted = '#b89184';
  const rose = '#e8957a';
  const borderColor = 'rgba(168,184,159,0.3)';
  const cardBg = 'rgba(255,255,255,0.03)';

  // ---- Loading / error states ----
  if (!checked) {
    return (
      <div style={{ minHeight: '100dvh', background: pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: textMuted, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100dvh', background: pageBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, color: textMuted, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ fontSize: 18, color: rose, marginBottom: 8 }}>Something went wrong</div>
        <div style={{ fontSize: 13, textAlign: 'center' }}>{error}</div>
      </div>
    );
  }

  if (!share) {
    return (
      <div style={{ minHeight: '100dvh', background: pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Shield size={24} color={textMuted} />
          </div>
          <div style={{ fontSize: 20, color: textMain, marginBottom: 4, fontFamily: 'Fraunces, Georgia, serif' }}>Link unavailable</div>
          <div style={{ fontSize: 13, color: textMuted }}>This share link is no longer valid. Ask for a new one.</div>
        </div>
      </div>
    );
  }

  // PIN gate
  // The PIN is verified against the relay, not locally. The local `share.pin`
  // is the masked '••••' placeholder from the share summary, so a client-side
  // string compare would always fail. We hit `validatePinOnRelay` and only
  // set `unlocked` on a real OK. This means the relay is the source of
  // truth and a bad guess doesn't open the share — even if the user opens
  // devtools and patches `share.pin`.
  const attemptUnlock = async () => {
    if (pinBusy || pinInput.length < 4) return;
    setPinBusy(true);
    setPinError(false);
    setPinNetworkError(false);
    const result = await validatePinOnRelay(code, pinInput);
    setPinBusy(false);
    if (result.ok) {
      setUnlocked(true);
      markShareOpened(code);
    } else if (result.reason === 'pin') {
      setPinError(true);
    } else {
      setPinNetworkError(true);
    }
  };

  if (share.pin && !unlocked) {
    return (
      <div style={{ minHeight: '100dvh', background: pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 320 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Shield size={24} color={rose} />
          </div>
          <div style={{ fontSize: 20, color: textMain, marginBottom: 4, textAlign: 'center', fontFamily: 'Fraunces, Georgia, serif' }}>Enter PIN</div>
          <div style={{ fontSize: 12, color: textMuted, marginBottom: 16, textAlign: 'center' }}>Ask the person in labor for the 4-digit code.</div>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={4}
            value={pinInput}
            onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(false); setPinNetworkError(false); }}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '14px 16px', textAlign: 'center', fontSize: 24, fontFamily: 'Fraunces, Georgia, serif', letterSpacing: 8, color: textMain, outline: 'none', boxSizing: 'border-box' }}
            placeholder="• • • •"
            autoFocus
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && pinInput.length === 4 && !pinBusy) {
                e.preventDefault();
                await attemptUnlock();
              }
            }}
          />
          {pinError && <div style={{ fontSize: 12, color: rose, textAlign: 'center', marginTop: 8 }}>Wrong PIN. Try again.</div>}
          {pinNetworkError && <div style={{ fontSize: 12, color: rose, textAlign: 'center', marginTop: 8 }}>Couldn’t reach the relay. Check your connection and try again.</div>}
          <button
            onClick={attemptUnlock}
            disabled={pinInput.length < 4 || pinBusy}
            style={{ width: '100%', marginTop: 12, background: rose, border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 600, color: pageBg, cursor: pinBusy ? 'wait' : 'pointer', opacity: pinInput.length < 4 || pinBusy ? 0.4 : 1 }}
          >{pinBusy ? 'Checking…' : 'Unlock'}</button>
        </div>
      </div>
    );
  }

  // ---- Main read-only view ----
  return (
    <div style={{ minHeight: '100dvh', background: pageBg, color: textMain, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 448, margin: '0 auto', padding: '24px 20px 40px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Heart size={20} color={rose} style={{ opacity: 0.8 }} />
          <span style={{ fontSize: 20, fontFamily: 'Fraunces, Georgia, serif' }}>Olive</span>
          <span style={{ fontSize: 10, color: textMuted, textTransform: 'uppercase', letterSpacing: 2, marginTop: 2 }}>Labor tracker</span>
        </div>
        {/* Time-remaining on this share link — partners need to know
            so they're not surprised when it stops updating after a week. */}
        {share.expiresAt && (() => {
          const ms = new Date(share.expiresAt).getTime() - Date.now();
          if (ms <= 0) return null; // already expired
          const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
          return (
            <div style={{ fontSize: 10, color: textMuted, marginBottom: 16, paddingLeft: 30 }}>
              This link works for {days} more day{days !== 1 ? 's' : ''}.
            </div>
          );
        })()}

        {/* State banner. v3.1 — copy softened for non-medical circle
            members (parents, siblings). The clinical state names
            stay in the data layer; here we use plain-language
            "things are starting" / "first signs recorded" so a
            parent who has never seen a labor app before knows
            what they're looking at. */}
        {shareState === 'prenatal' && (
          <div style={{ borderRadius: 14, border: '1px solid rgba(232,149,122,0.25)', background: 'rgba(232,149,122,0.08)', padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8a6f64', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, color: '#e8957a', fontWeight: 600 }}>All quiet for now</div>
              <div style={{ fontSize: 10, color: '#8a6f64', marginTop: 2 }}>We'll let you know when something happens</div>
            </div>
          </div>
        )}
        {shareState === 'labor' && (
          <div style={{ borderRadius: 14, border: '1px solid rgba(232,149,122,0.4)', background: 'rgba(232,149,122,0.12)', padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e8957a', flexShrink: 0, animation: 'pulse 2s infinite' }} />
            <div>
              <div style={{ fontSize: 12, color: '#e8957a', fontWeight: 600 }}>Things are starting</div>
              <div style={{ fontSize: 10, color: '#b89184', marginTop: 2 }}>{finished.length === 0 ? 'No contractions recorded yet — but she\'s getting ready' : `${finished.length} contraction${finished.length !== 1 ? 's' : ''} so far`}</div>
            </div>
          </div>
        )}
        {shareState === 'postpartum' && (
          <div style={{ borderRadius: 14, border: '1px solid rgba(142,175,132,0.4)', background: 'rgba(142,175,132,0.1)', padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 16 }}>🎉</div>
            <div>
              <div style={{ fontSize: 12, color: '#a8bf8a', fontWeight: 600 }}>Baby is here — welcome!</div>
              <div style={{ fontSize: 10, color: '#8a9f7a', marginTop: 2 }}>Share the moment, post updates</div>
            </div>
          </div>
        )}
        {shareState === 'archived' && (
          <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 16 }}>📖</div>
            <div>
              <div style={{ fontSize: 12, color: '#8a6f64', fontWeight: 600 }}>This labor has ended</div>
              <div style={{ fontSize: 10, color: '#6a5f54', marginTop: 2 }}>Read-only keepsake · <a href="#" onClick={(e) => { e.preventDefault(); handleDownloadMemoryBook(); }} style={{ color: '#b89184' }}>Download PDF</a></div>
            </div>
          </div>
        )}

        {/* v1.1: Stats mode — render the aggregate card, hide the per-contraction UI */}
        {shareMode === 'stats' && stats && (
          <div style={{ borderRadius: 20, border: `1px solid ${borderColor}`, background: cardBg, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: textMuted, fontWeight: 600, marginBottom: 12 }}>
              Progress
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: textMuted, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>Contractions</div>
                <div style={{ fontSize: 36, fontFamily: 'Fraunces, Georgia, serif', fontWeight: 300, lineHeight: 1, marginTop: 4 }}>{stats.totalContractions}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: textMuted, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>Avg interval</div>
                <div style={{ fontSize: 36, fontFamily: 'Fraunces, Georgia, serif', fontWeight: 300, lineHeight: 1, marginTop: 4 }}>
                  {stats.averageIntervalSec ? formatDuration(stats.averageIntervalSec) : '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: textMuted, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>Avg duration</div>
                <div style={{ fontSize: 24, fontFamily: 'Fraunces, Georgia, serif', fontWeight: 300, lineHeight: 1, marginTop: 4 }}>
                  {stats.averageDurationSec ? formatDuration(stats.averageDurationSec) : '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: textMuted, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>Active time</div>
                <div style={{ fontSize: 24, fontFamily: 'Fraunces, Georgia, serif', fontWeight: 300, lineHeight: 1, marginTop: 4 }}>
                  {stats.totalActiveSec ? formatElapsed(stats.totalActiveSec) : '—'}
                </div>
              </div>
            </div>
            {stats.fiveOneOne && (
              <div style={{ borderRadius: 12, border: `1px solid ${rose}55`, background: `${rose}1a`, padding: 10, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <AlertTriangle size={14} color={rose} />
                <div style={{ fontSize: 12, color: rose, fontWeight: 600 }}>5-1-1 pattern detected</div>
              </div>
            )}
            <div style={{ fontSize: 10, color: textMuted, lineHeight: 1.5, borderTop: `1px solid ${borderColor}`, paddingTop: 12 }}>
              You're seeing the summary view. Individual contraction times aren't shared in this link.
            </div>
          </div>
        )}

        {/* 5-1-1 alert */}
        {showAlert && (
          <div style={{ borderRadius: 16, border: `1px solid ${rose}44`, background: `${rose}15`, padding: 12, display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16 }}>
            <AlertTriangle size={16} color={rose} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: rose, fontFamily: 'Fraunces, Georgia, serif' }}>5-1-1 pattern</div>
              <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>It might be time to go to the hospital.</div>
            </div>
          </div>
        )}

        {/* T4: Partner / viewer Start/Stop button.
            Renders only when the viewer is not the host and the share
            allows writes. In stats mode (friends) the button is hidden —
            the relay 403s anyway. In postpartum/archived the wall is a
            keepsake, not a live timer. */}
        {canAuthorEvents && !isReadOnly && (
          <div style={{ borderRadius: 20, border: `1px solid ${currentContraction ? rose : borderColor}`, background: cardBg, padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: textMuted, fontWeight: 600 }}>
                Time this contraction
              </div>
              {currentContraction && (
                <div style={{ fontSize: 11, color: rose, fontWeight: 600 }}>
                  In progress
                </div>
              )}
            </div>
            {currentContraction ? (
              <>
                <div style={{ fontSize: 48, fontFamily: 'Fraunces, Georgia, serif', fontWeight: 300, lineHeight: 1, marginTop: 4, color: rose }}>
                  {formatElapsed(Math.floor((now - currentContraction.start) / 1000))}
                </div>
                {currentContraction.author && (
                  <div style={{ fontSize: 10, color: textMuted, marginTop: 4 }}>
                    Started by {currentContraction.author === getOrCreateClientId() ? 'you' : 'partner'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSendEvent}
                  disabled={eventInFlight}
                  style={{
                    marginTop: 14,
                    width: '100%',
                    background: rose,
                    color: 'white',
                    border: 'none',
                    borderRadius: 14,
                    padding: '14px 16px',
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: eventInFlight ? 'wait' : 'pointer',
                    opacity: eventInFlight ? 0.6 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {eventInFlight ? 'Saving…' : 'Stop contraction'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleSendEvent}
                disabled={eventInFlight}
                style={{
                  width: '100%',
                  background: rose,
                  color: 'white',
                  border: 'none',
                  borderRadius: 14,
                  padding: '16px 16px',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: eventInFlight ? 'wait' : 'pointer',
                  opacity: eventInFlight ? 0.6 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {eventInFlight ? 'Saving…' : 'Start contraction'}
              </button>
            )}
            {lastEventError && (
              <div style={{ fontSize: 11, color: rose, marginTop: 8 }}>
                {lastEventError}
              </div>
            )}
          </div>
        )}
        <div style={{ height: 32 }} />

        {/* v1.1: Hide the per-contraction UI in stats mode — the stats card above replaces it */}
        {shareMode !== 'stats' && (
          <div style={{ borderRadius: 20, border: `1px solid ${borderColor}`, background: cardBg, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: textMuted, fontWeight: 600 }}>Since last</div>
            <div style={{ fontSize: 48, fontFamily: 'Fraunces, Georgia, serif', fontWeight: 300, marginTop: 4, lineHeight: 1 }}>
              {sinceFinish !== null ? formatDuration(sinceFinish) : '—'}
            </div>
            <div style={{ fontSize: 11, color: textMuted, marginTop: 8 }}>
              {finished.length} {finished.length === 1 ? 'contraction' : 'contractions'} · {totalElapsedSec > 0 ? `started ${formatElapsed(totalElapsedSec)} ago` : 'just started'}
            </div>
          </div>
        )}

        {/* Last / gap cards */}
        {lastFinished && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div style={{ borderRadius: 16, border: `1px solid ${borderColor}`, background: cardBg, padding: 14 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: textMuted, fontWeight: 600 }}>Last</div>
              <div style={{ fontSize: 28, fontFamily: 'Fraunces, Georgia, serif', fontWeight: 300, marginTop: 4 }}>{formatDuration(durationSeconds(lastFinished, now))}</div>
              <div style={{ fontSize: 10, color: textMuted, marginTop: 4 }}>at {formatClock(lastFinished.start)}</div>
            </div>
            <div style={{ borderRadius: 16, border: `1px solid ${borderColor}`, background: cardBg, padding: 14 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: textMuted, fontWeight: 600 }}>Last gap</div>
              <div style={{ fontSize: 28, fontFamily: 'Fraunces, Georgia, serif', fontWeight: 300, marginTop: 4 }}>
                {(() => {
                  const prev = finished[finished.length - 2];
                  return prev ? formatDuration(intervalSeconds(prev, lastFinished)) : '—';
                })()}
              </div>
              <div style={{ fontSize: 10, color: textMuted, marginTop: 4 }}>since previous</div>
            </div>
          </div>
        )}

        {/* History — hidden in friends view-only mode */}
        {share?.mode !== 'friends' && finished.length > 0 && (
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: textMuted, fontWeight: 600, marginBottom: 10, marginLeft: 4 }}>History</div>
            {[...finished].reverse().slice(0, 12).map((c: any) => {
              const dur = durationSeconds(c, now);
              return (
                <div key={c.id} style={{ borderRadius: 16, border: `1px solid ${borderColor}`, background: cardBg, padding: '12px 16px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 16, fontWeight: 500 }}>{formatClock(c.start)}</span>
                    <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 18, fontWeight: 300, color: rose }}>{formatDuration(dur)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {finished.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: textMuted }}>
            <Clock size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            Waiting for the first contraction…
          </div>
        )}

        {/* Activity feed — always shown after contractions display */}
        {(shareState === 'prenatal' || shareState === 'postpartum' || shareState === 'archived' || finished.length > 0) && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: textMuted, fontWeight: 600, marginBottom: 14, paddingLeft: 4 }}>Activity</div>
            <ActivityFeed code={code} shareState={shareState} readOnly={isReadOnly} />
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: 10, color: 'rgba(184,145,132,0.4)', marginTop: 30 }}>
          Read-only view · expires {new Date(share.expiresAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
