// Read-only share view rendered at `/?share=CODE`.
// v3 — state-aware with activity feed.

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
} from '../lib/sessions';
import {
  getShareFromRelay,
  pullContractionsFromRelay,
  markShareOpenedOnRelay,
  RELAY_URL,
} from '../lib/relay';
import ActivityFeed from './ActivityFeed';

export default function ShareView({ code }: { code: string }) {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [share, setShare] = useState<any>(null);
  const [contractions, setContractions] = useState<any[]>([]);
  const [now, setNow] = useState(Date.now());
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackTimer, setTrackTimer] = useState<any>(null);
  const [trackNow, setTrackNow] = useState(Date.now());

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      // Sanitize the code up front. Valid codes are 6 chars from a 30-char
      // alphabet (lowercase a-z minus ambiguous + digits 2-9). Reject anything
      // else so a malformed URL doesn't waste a relay call and so we can show
      // a precise "This doesn't look like a Luna share link" error.
      const codePattern = /^[a-z2-9]{6}$/;
      if (!code || !codePattern.test(code)) {
        if (mounted) {
          setError('This doesn\u2019t look like a Luna share link. Check the URL and try again.');
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
          });
          setChecked(true);
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
    const id = setInterval(() => { setNow(Date.now()); setTrackNow(Date.now()); }, 1000);
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
  useEffect(() => {
    if (!unlocked || !share) return;
    const url = `${RELAY_URL}/api/shares/${code}/stream`;
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let sseWorking = false;
    const startPolling = () => {
      if (pollTimer) return;
      const tick = async () => {
        let latest: any = null;
        try {
          latest = await pullContractionsFromRelay(code);
          if (latest?.contractions) {
            setContractions(latest.contractions);
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
    try {
      es = new EventSource(url);
      es.onopen = () => {
        sseWorking = true;
        stopPolling();
      };
      es.onmessage = async (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'snapshot' || payload.type === 'update') {
            if (payload.contractions) setContractions(payload.contractions);
            // Re-fetch the latest from /contractions so we get the canonical state
            // (the SSE message only carries a count + updatedAt for the update type)
            try {
              const fresh: any = await pullContractionsFromRelay(code);
              if (fresh?.contractions) setContractions(fresh.contractions);
            } catch { /* ignore */ }
          } else if (payload.type === 'revoked') {
            setShare((s: any) => s ? { ...s, revoked: true } : s);
          }
        } catch { /* ignore malformed event */ }
      };
      es.onerror = () => {
        // EventSource auto-reconnects; if we never connected, fall back to polling
        if (!sseWorking) {
          es?.close();
          es = null;
          startPolling();
        }
      };
    } catch {
      // Browser doesn't support EventSource (very rare) — fall back
      startPolling();
    }
    return () => {
      es?.close();
      stopPolling();
    };
  }, [unlocked, share, code]);

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
  const trackMode = share?.mode === 'track';
  const statsMode = share?.mode === 'stats';
  const trackElapsed = trackTimer && !trackTimer.end
    ? Math.max(0, Math.round((trackNow - new Date(trackTimer.start).getTime()) / 1000))
    : 0;
  const handleTrackStart = async () => {
    if (trackTimer && !trackTimer.end) return; // already running
    const c = { id: 't' + Date.now().toString(36), start: new Date().toISOString(), end: null, intensity: null };
    setTrackTimer(c);
    try {
      const all = [...contractions, c];
      setContractions(all);
      const { pushContractionsToRelay } = await import('../lib/relay');
      await pushContractionsToRelay(code, all, c);
    } catch {}
  };
  const handleTrackStop = async () => {
    if (!trackTimer || trackTimer.end) return;
    const finished = { ...trackTimer, end: new Date().toISOString() };
    setTrackTimer(finished);
    try {
      const all = contractions.map((x: any) => x.id === finished.id ? finished : x);
      setContractions(all);
      const { pushContractionsToRelay } = await import('../lib/relay');
      await pushContractionsToRelay(code, all, null);
    } catch {}
    setTrackTimer(null);
  };

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
            onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(false); }}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '14px 16px', textAlign: 'center', fontSize: 24, fontFamily: 'Fraunces, Georgia, serif', letterSpacing: 8, color: textMain, outline: 'none', boxSizing: 'border-box' }}
            placeholder="• • • •"
            autoFocus
          />
          {pinError && <div style={{ fontSize: 12, color: rose, textAlign: 'center', marginTop: 8 }}>Wrong PIN. Try again.</div>}
          <button
            onClick={() => {
              if (pinInput === share.pin) {
                setUnlocked(true);
                markShareOpened(code);
              } else {
                setPinError(true);
              }
            }}
            disabled={pinInput.length < 4}
            style={{ width: '100%', marginTop: 12, background: rose, border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 600, color: pageBg, cursor: 'pointer', opacity: pinInput.length < 4 ? 0.4 : 1 }}
          >Unlock</button>
        </div>
      </div>
    );
  }

  // ---- Main read-only view ----
  return (
    <div style={{ minHeight: '100dvh', background: pageBg, color: textMain, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 448, margin: '0 auto', padding: '24px 20px 40px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Heart size={20} color={rose} style={{ opacity: 0.8 }} />
          <span style={{ fontSize: 20, fontFamily: 'Fraunces, Georgia, serif' }}>Luna</span>
          <span style={{ fontSize: 10, color: textMuted, textTransform: 'uppercase', letterSpacing: 2, marginTop: 2 }}>Labor tracker</span>
        </div>

        {/* State banner */}
        {shareState === 'prenatal' && (
          <div style={{ borderRadius: 14, border: '1px solid rgba(232,149,122,0.25)', background: 'rgba(232,149,122,0.08)', padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8a6f64', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, color: '#e8957a', fontWeight: 600 }}>Waiting for labor to begin</div>
              <div style={{ fontSize: 10, color: '#8a6f64', marginTop: 2 }}>Share this link with your circle — they'll see updates in real time</div>
            </div>
          </div>
        )}
        {shareState === 'labor' && (
          <div style={{ borderRadius: 14, border: '1px solid rgba(232,149,122,0.4)', background: 'rgba(232,149,122,0.12)', padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e8957a', flexShrink: 0, animation: 'pulse 2s infinite' }} />
            <div>
              <div style={{ fontSize: 12, color: '#e8957a', fontWeight: 600 }}>Active labor</div>
              <div style={{ fontSize: 10, color: '#b89184', marginTop: 2 }}>{finished.length} contraction{finished.length !== 1 ? 's' : ''} so far</div>
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
              <div style={{ fontSize: 10, color: '#6a5f54', marginTop: 2 }}>Read-only keepsake · <a href="#" style={{ color: '#b89184' }}>Download PDF</a></div>
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

        {/* Partner tracking button — only in track mode */}
        {trackMode && (
          <div style={{ marginBottom: 16 }}>
            {!trackTimer ? (
              <button
                onClick={handleTrackStart}
                style={{
                  width: '100%', minHeight: 120, borderRadius: 20,
                  background: 'linear-gradient(135deg, #e8957a, #d97459, #c25a3f)',
                  border: 'none', color: '#120c10', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600,
                }}
              >
                <div style={{ fontSize: 48, lineHeight: 1 }}>▶</div>
                <div style={{ fontSize: 20, marginTop: 4, fontFamily: 'Fraunces, Georgia, serif' }}>Start</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4, textTransform: 'uppercase', letterSpacing: 2 }}>Tap when it begins</div>
              </button>
            ) : (
              <div style={{ borderRadius: 20, border: '1px solid rgba(232,149,122,0.4)', background: 'rgba(232,149,122,0.08)', padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 3, color: '#e8957a', fontWeight: 600, marginBottom: 8 }}>
                  ● In progress
                </div>
                <div style={{ fontSize: 64, fontFamily: 'Fraunces, Georgia, serif', fontWeight: 300, lineHeight: 1 }}>
                  {String(Math.floor(trackElapsed / 60)).padStart(2, '0')}:{String(trackElapsed % 60).padStart(2, '0')}
                </div>
                <button
                  onClick={handleTrackStop}
                  style={{
                    marginTop: 16, background: '#faf6f4', color: '#120c10', border: 'none',
                    borderRadius: 24, padding: '10px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                >■ Stop</button>
              </div>
            )}
          </div>
        )}

        {/* Hero stat */}

        <div style={{ borderRadius: 20, border: `1px solid ${borderColor}`, background: cardBg, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: textMuted, fontWeight: 600 }}>Since last</div>
          <div style={{ fontSize: 48, fontFamily: 'Fraunces, Georgia, serif', fontWeight: 300, marginTop: 4, lineHeight: 1 }}>
            {sinceFinish !== null ? formatDuration(sinceFinish) : '—'}
          </div>
          <div style={{ fontSize: 11, color: textMuted, marginTop: 8 }}>
            {finished.length} {finished.length === 1 ? 'contraction' : 'contractions'} · {totalElapsedSec > 0 ? `started ${formatElapsed(totalElapsedSec)} ago` : 'just started'}
          </div>
        </div>

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

        {/* History — hidden in stats mode */}
        {!statsMode && finished.length > 0 && (
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
            <ActivityFeed code={code} shareState={shareState} />
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: 10, color: 'rgba(184,145,132,0.4)', marginTop: 30 }}>
          Read-only view · expires {new Date(share.expiresAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
