// Read-only share view rendered at `/?share=CODE`.
// v2 — bulletproof version with no abstractions, inline styles, and error handling.

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
} from '../lib/relay';

export default function ShareView({ code }: { code: string }) {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [share, setShare] = useState<any>(null);
  const [contractions, setContractions] = useState<any[]>([]);
  const [now, setNow] = useState(Date.now());
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
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
          setShare({
            id: code,
            sessionId: relayShare.sessionId,
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
    const id = setInterval(() => setNow(Date.now()), 5000);
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

  // ---- Derived ----
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

        {/* History */}
        {finished.length > 0 && (
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

        <div style={{ textAlign: 'center', fontSize: 10, color: 'rgba(184,145,132,0.4)', marginTop: 30 }}>
          Read-only view · expires {new Date(share.expiresAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
