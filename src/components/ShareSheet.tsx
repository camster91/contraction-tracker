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

type Props = {
  sessionId: string;
  contractions: Contraction[];
  onClose: () => void;
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

export default function ShareSheet({ sessionId, contractions, onClose }: Props) {
  const [shares, setShares] = useState<Share[]>(() => getShares());
  const [copied, setCopied] = useState<string | null>(null);
  const [requirePin, setRequirePin] = useState(false);
  const [shareMode, setShareMode] = useState<'full' | 'stats' | 'track'>('full');

  // Resolve the session's display name from the sessions list
  const sessions = JSON.parse(localStorage.getItem('contraction-tracker:sessions') || '[]');
  const actualName = sessions.find((s: { id: string }) => s.id === sessionId)?.name ?? 'Luna session';

  const activeShares = useMemo(
    () => shares.filter((s) => s.sessionId === sessionId && isShareValid(s)),
    [shares, sessionId],
  );

  const handleCreate = async () => {
    const pin = requirePin ? String(Math.floor(1000 + Math.random() * 9000)) : undefined;
    createShare({ sessionId, ttlHours: 24, pin, mode: shareMode });
    setShares(getShares());
    setRequirePin(false);
    // Also create on the relay server for multi-device sharing
    const relayResult = await createShareOnRelay({ sessionId, pin, ttlHours: 24, mode: shareMode });
    if (relayResult) {
      // Push current contractions to the relay immediately
      await pushContractionsToRelay(relayResult.code, contractions, null);
    }
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

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-ink-200/30 bg-plum-950/98 backdrop-blur-xl shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.6)] max-h-[85dvh] flex flex-col animate-slide-up">
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
        Generate a link someone can open to follow along. Same-device for now;
        multi-device realtime sync would need a server.
      </div>

      {/* Share mode selector */}
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-[0.15em] text-ink-400 font-semibold mb-1.5">Share type</div>
        <div className="space-y-1">
          {[
            { value: 'full', label: 'Full details', desc: 'All times and stats visible' },
            { value: 'stats', label: 'Stats only', desc: 'Averages + pattern, no individual times' },
            { value: 'track', label: 'Partner tracking', desc: 'Can start/stop from their device' },
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

      {/* Send update (works without a share link) */}
      <button
        onClick={handleSendUpdate}
        className="w-full mb-3 text-left text-sm text-ink-100 bg-ink-100/5 active:bg-ink-100/10 border border-ink-200/30 rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors"
      >
        <MessageCircle className="w-4 h-4 text-rose-300" />
        <div className="flex-1 min-w-0">
          <div className="font-medium">Send update</div>
          <div className="text-[10px] text-ink-500 truncate">
            "X contractions so far, last was Y"
          </div>
        </div>
      </button>

      <div className="border-t border-ink-200/20 my-3" />

      <label className="flex items-center gap-2 text-xs text-ink-300 mb-2 cursor-pointer">
        <input
          type="checkbox"
          checked={requirePin}
          onChange={(e) => setRequirePin(e.target.checked)}
          className="accent-rose-300"
        />
        Require a 4-digit PIN
      </label>

      <button
        onClick={handleCreate}
        className="w-full bg-rose-300 active:bg-rose-400 text-plum-950 rounded-xl py-2.5 text-sm font-semibold transition-colors mb-3"
      >
        {activeShares.length > 0 ? 'Create another link' : 'Create share link'}
      </button>

      {/* Active links */}
      {activeShares.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-semibold">
            Active links
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
                  <span>expires {new Date(s.expiresAt).toLocaleString()}</span>
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
