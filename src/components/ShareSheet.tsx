// Share sheet — generate a short-lived link + QR code for a labor session,
// compose a one-tap status update that opens the system share sheet with
// the message pre-filled, revoke the link.

import { useMemo, useState } from 'react';
import { Copy, Share2, Shield, Trash2, X, MessageCircle, Check } from 'lucide-react';
import {
  type Share,
  createShare,
  getShares,
  isShareValid,
  revokeShare,
} from '../lib/sessions';
import { createShareOnRelay, pushContractionsToRelay } from '../lib/relay';
import type { Contraction } from '../lib/contractions';
import { formatElapsed } from '../lib/contractions';
import StatePicker from './StatePicker';
import BabyIsHereMount from './BabyIsHereMount';

type Props = {
  sessionId: string;
  contractions: Contraction[];
  onClose: () => void;
  onStateChange?: (state: 'prenatal' | 'labor' | 'postpartum' | 'archived') => void;
  onBabyIsHere?: (shareCode: string) => void;
};

function buildShareUrl(code: string): string {
  return `${window.location.origin}/?share=${code}`;
}

function buildUpdateText(contractions: Contraction[], sessionName: string): string {
  const finished = contractions.filter((c) => c.end).sort((a, b) => a.start.localeCompare(b.start));
  if (finished.length === 0) {
    return `Logging contractions for ${sessionName}. Will update when I have more to share.`;
  }
  const last = finished[finished.length - 1];
  const first = finished[0];
  const elapsedSec = Math.round((Date.now() - new Date(first.start).getTime()) / 1000);
  const elapsed = formatElapsed(elapsedSec);
  const lastDur = Math.round(
    (new Date(last.end || last.start).getTime() - new Date(last.start).getTime()) / 1000,
  );
  const lastMin = Math.floor(lastDur / 60);
  const lastSec = lastDur % 60;
  const lines = [
    `${sessionName} update:`,
    `${finished.length} contraction${finished.length === 1 ? '' : 's'} so far, over ${elapsed}.`,
    `Last: ${lastMin}:${lastSec.toString().padStart(2, '0')}.`,
  ];
  return lines.join(' ');
}

export default function ShareSheet({ sessionId, contractions, onClose, onStateChange, onBabyIsHere }: Props) {
  const [relayError, setRelayError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [shares, setShares] = useState<Share[]>(() => getShares());
  const [copied, setCopied] = useState<string | null>(null);
  const [shareMode, setShareMode] = useState<'partner' | 'friends'>('partner');
  const [shareState, setShareState] = useState<'prenatal' | 'labor' | 'postpartum' | 'archived'>('prenatal');
  const [prevState, setPrevState] = useState<typeof shareState | null>(null);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Resolve the session's display name from the sessions list
  const sessions = JSON.parse(localStorage.getItem('contraction-tracker:sessions') || '[]');
  const actualName = sessions.find((s: { id: string }) => s.id === sessionId)?.name ?? 'Olive session';

  const activeShares = useMemo(
    () => shares.filter((s) => s.sessionId === sessionId && isShareValid(s)),
    [shares, sessionId],
  );

  const handleCreate = async () => {
    setRelayError(null);
    setCreating(true);
    const pin = undefined; // PIN removed — simplicity over complexity
    createShare({ sessionId, ttlHours: 720, pin, mode: shareMode });
    setShares(getShares());
    // Also create on the relay server for multi-device sharing.
    // createShareOnRelay returns null on any failure (network, 5xx, etc) —
    // we surface a clear error instead of letting the user think the share
    // works when no one in another browser can actually open it.
    const relayResult = await createShareOnRelay({ sessionId, pin, ttlHours: 720, mode: shareMode, state: 'prenatal' });
    if (!relayResult) {
      setRelayError(
        'Could not reach the share server. Your link will work on this device only — viewers in other browsers will not see updates until the relay reconnects.',
      );
    } else {
      try {
        await pushContractionsToRelay(relayResult.code, contractions, null);
      } catch (err) {
        setRelayError('Share created, but initial sync to viewers failed. They may see no data until your next contraction is saved.');
      }
    }
    setCreating(false);
  };

  const handleRevoke = (id: string) => {
    if (!confirm('Revoke this link? The recipient will lose access immediately.')) return;
    revokeShare(id);
    setShares(getShares());
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(code));
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 2000);
    } catch {
      // Fallback: select the text in the input
    }
  };

  const handleShareLink = async (code: string) => {
    const url = buildShareUrl(code);
    if (navigator.share) {
      try {
        await navigator.share({ title: `${actualName} — labor tracker`, text: `Live labor updates`, url });
      } catch { /* user cancelled */ }
    } else {
      handleCopy(code);
    }
  };

  const handleSendUpdate = async () => {
    const text = buildUpdateText(contractions, actualName);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Labor update', text });
        return;
      } catch { /* user cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      alert('Update copied to clipboard. Paste it into a message.');
    } catch {
      alert(text);
    }
  };

  const handleStateChange = (st: 'prenatal' | 'labor' | 'postpartum' | 'archived') => {
    if (undoTimer) { clearTimeout(undoTimer); setUndoTimer(null); }
    setPrevState(shareState);
    setShareState(st);
    onStateChange?.(st);
    // Show undo toast for 5 seconds
    const timer = setTimeout(() => {
      setPrevState(null);
      setUndoTimer(null);
    }, 5000);
    setUndoTimer(timer);
  };

  const handleUndoState = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (prevState === null) return;
    if (undoTimer) { clearTimeout(undoTimer); setUndoTimer(null); }
    setShareState(prevState);
    onStateChange?.(prevState);
    setPrevState(null);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-ink-200/30 bg-plum-950/98  shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.6)] max-h-[85dvh] flex flex-col animate-slide-up">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-8 h-1 rounded-full bg-ink-200/40" />
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-ink-50 font-display">Share</div>
        <button
          onClick={onClose}
          className="p-1 text-ink-400 active:text-ink-200"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="text-[11px] text-ink-400 mb-3 leading-relaxed">
        Generate a link that your circle can open to follow along in real time.
        Create your forever link — it won't expire.
      </div>

      {/* Share mode — partner (full) or friends (read-only) */}
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-[0.15em] text-ink-400 font-semibold mb-1.5">Who is this for?</div>
        <div className="space-y-1">
          {[
            { value: 'partner', label: 'Partner — full access', desc: 'Sees all times, durations, and details' },
            { value: 'friends', label: 'Friends — view only', desc: 'Sees progress and pattern, not every detail' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setShareMode(opt.value as any)}
              className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition-colors ${
                shareMode === opt.value
                  ? 'border-rose-300/40 bg-rose-300/10 text-rose-200'
                  : 'border-ink-200/30 bg-ink-100/5 text-ink-300 active:bg-ink-100/10'
              }`}
            >
              <div className="font-medium">{opt.label}</div>
              <div className="text-[10px] text-ink-500">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* State picker */}
      <StatePicker value={shareState} onChange={handleStateChange} />

      {/* Undo toast — 5 seconds to revert a state change */}
      {prevState !== null && (
        <div className="mb-3 flex items-center gap-2 bg-ink-100/10 rounded-xl px-3 py-2 text-xs animate-fade-in">
          <span className="text-ink-300 flex-1">
            Changed to <span className="text-ink-200 font-medium">{shareState}</span>
          </span>
          <button
            onClick={handleUndoState}
            className="text-rose-300 font-medium active:text-rose-200"
          >
            Undo
          </button>
        </div>
      )}

      {/* Baby is here button */}
      <BabyIsHereMount
        share={activeShares[0]?.id ?? ''}
        onSuccess={() => {
          handleStateChange('postpartum');
          onBabyIsHere?.(activeShares[0]?.id ?? '');
        }}
      />

      <button
        onClick={handleCreate}
        disabled={creating}
        className="w-full bg-rose-300 active:bg-rose-400 disabled:bg-rose-300/60 disabled:text-plum-950/60 text-plum-950 rounded-xl py-2.5 text-sm font-semibold transition-colors mb-3"
      >
        {creating ? 'Creating…' : (activeShares.length > 0 ? 'Create another link' : 'Create share link')}
      </button>

      {/* Inline error if the relay create or push failed.
          Without this, the user sees "Create share link" succeed and assumes
          the link works — but it only works on this device until the relay
          reconnects. We tell them explicitly. */}
      {relayError && (
        <div className="mb-3 rounded-xl border border-amber-300/40 bg-amber-300/10 px-3 py-2.5 text-xs text-amber-100 leading-relaxed">
          {relayError}
        </div>
      )}

      {/* Send update — secondary action below the primary Create share button */}
      <button
        onClick={handleSendUpdate}
        className="w-full mb-3 text-left text-sm text-ink-100 bg-ink-100/5 active:bg-ink-100/10 border border-ink-200/30 rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors"
      >
        <MessageCircle className="w-4 h-4 text-ink-300" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs">Send update without a link</div>
          <div className="text-[10px] text-ink-500 truncate">
            "3 contractions so far, last was 1:15"
          </div>
        </div>
      </button>

      {/* Active links */}
      {activeShares.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-semibold">
            Active links
          </div>
          <div className="text-[10px] text-ink-500 mb-2">
            Send this link to your partner via text, WhatsApp, or any app. They tap it to follow along.
          </div>
          {activeShares.map((s) => {
            const isCopied = copied === s.id;
            return (
              <div
                key={s.id}
                className="rounded-xl border border-ink-200/30 bg-ink-100/5 p-3"
              >
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={buildShareUrl(s.id)}
                    className="flex-1 bg-transparent text-[11px] text-ink-200 focus:outline-none font-mono"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => handleCopy(s.id)}
                    className="p-1.5 text-ink-300 active:text-rose-300"
                    aria-label="Copy"
                    title="Copy"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-sage-300" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleShareLink(s.id)}
                    className="p-1.5 text-ink-300 active:text-rose-300"
                    aria-label="Share"
                    title="Share via…"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRevoke(s.id)}
                    className="p-1.5 text-ink-300 active:text-rose-300"
                    aria-label="Revoke"
                    title="Revoke"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-ink-500 mt-1.5">
                  {s.pin && (
                    <span className="flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5" />
                      PIN: {s.pin}
                    </span>
                  )}
                  {s.state && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium ${
                      s.state === 'prenatal' ? 'bg-ink-200/20 text-ink-300' :
                      s.state === 'labor' ? 'bg-rose-300/20 text-rose-300' :
                      s.state === 'postpartum' ? 'bg-sage-300/20 text-sage-300' :
                      'bg-ink-100/10 text-ink-500'
                    }`}>
                      {s.state}
                    </span>
                  )}
                </div>
                {s.lastOpenedAt && (
                  <div className="text-[10px] text-ink-500 mt-0.5">
                    Last opened {new Date(s.lastOpenedAt).toLocaleString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
        </div>
    </div>
  </>
  );
}
