// ActivityToast — small bottom-of-screen toast that appears when a viewer
// posts in the activity feed on a share the host has active.
//
// v1.1: T2 — host sees viewer activity in real time on the main app.
//
// Stacks up to 3 visible at once. Each toast auto-dismisses after 4s.
// Tap → onTap callback (typically opens the share view).
//
// Compact: 48px avatar + author name + 1-line content preview + dismiss X.
// No bottom safe-area inset handling — the App.tsx container already adds
// padding-bottom for the tab bar / gesture area.

import { useEffect, useState } from 'react';
import { X, Heart, MessageCircle, Image as ImageIcon, Activity } from 'lucide-react';
import type { IncomingMessage } from '../lib/useShareActivity';

type ToastItem = IncomingMessage & { receivedAt: number };

type Props = {
  // The most recent message (or null). The toast consumes it and shows it.
  message: IncomingMessage | null;
  // Tap handler — typically navigates to the share view.
  onTap: (code: string) => void;
  // Auto-dismiss after this many ms.
  autoDismissMs?: number;
};

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

function Avatar({ name }: { name: string }) {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #e8957a, #c25a3f)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        color: '#120c10',
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}

function iconForKind(kind: IncomingMessage['kind']) {
  if (kind === 'reaction') return <Heart size={12} className="text-rose-300" />;
  if (kind === 'text') return <MessageCircle size={12} className="text-sage-300" />;
  if (kind === 'image') return <ImageIcon size={12} className="text-ink-300" />;
  return <Activity size={12} className="text-amber-300" />;
}

function preview(msg: IncomingMessage): string {
  if (msg.kind === 'reaction') return msg.content; // emoji
  if (msg.kind === 'text') return msg.content.length > 60 ? msg.content.slice(0, 60) + '…' : msg.content;
  if (msg.kind === 'image') return 'Sent a photo';
  return msg.content;
}

export default function ActivityToast({ message, onTap, autoDismissMs = 4000 }: Props) {
  const [stack, setStack] = useState<ToastItem[]>([]);

  // Push new message into the stack. Cap at 3.
  useEffect(() => {
    if (!message) return;
    setStack((prev) => {
      // Replace if same id already in stack (shouldn't happen — dedupe upstream)
      if (prev.find((p) => p.id === message.id)) return prev;
      const next = [...prev, { ...message, receivedAt: Date.now() }];
      // Cap at 3 visible
      return next.slice(-3);
    });
  }, [message]);

  // Auto-dismiss oldest after autoDismissMs.
  useEffect(() => {
    if (stack.length === 0) return;
    const oldest = stack[0];
    const remaining = Math.max(0, autoDismissMs - (Date.now() - oldest.receivedAt));
    if (remaining <= 0) {
      setStack((prev) => prev.filter((p) => p.id !== oldest.id));
      return;
    }
    const id = setTimeout(() => {
      setStack((prev) => prev.filter((p) => p.id !== oldest.id));
    }, remaining);
    return () => clearTimeout(id);
  }, [stack, autoDismissMs]);

  if (stack.length === 0) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2 items-center pointer-events-none"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}
      role="status"
      aria-live="polite"
    >
      {stack.map((t, i) => (
        <button
          key={t.id}
          onClick={() => {
            onTap(t.shareId);
            setStack((prev) => prev.filter((p) => p.id !== t.id));
          }}
          className="pointer-events-auto flex items-center gap-2.5 bg-plum-950/95 border border-ink-200/30 rounded-full pl-1.5 pr-4 py-1.5 shadow-lg shadow-black/40 max-w-[min(90vw,360px)] active:scale-[0.98] transition-transform"
          style={{ animation: `slide-up-toast 240ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 60}ms backwards` }}
        >
          <Avatar name={t.authorName} />
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-ink-50 truncate">{t.authorName}</span>
              {iconForKind(t.kind)}
            </div>
            <div className="text-[11px] text-ink-300 truncate">{preview(t)}</div>
          </div>
          <span
            role="button"
            aria-label="Dismiss"
            onClick={(e) => {
              e.stopPropagation();
              setStack((prev) => prev.filter((p) => p.id !== t.id));
            }}
            className="text-ink-500 active:text-ink-300 p-0.5"
          >
            <X size={12} />
          </span>
        </button>
      ))}
      <style>{`
        @keyframes slide-up-toast {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
