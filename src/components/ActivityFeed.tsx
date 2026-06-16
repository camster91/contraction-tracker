// ActivityFeed — live memory wall for share viewers and hosts.
// Subscribes to SSE for real-time message delivery.

import { useEffect, useRef, useState } from 'react';
// Mic was imported for the (unfinished) T6 voice-memo recording feature but
// the recorder UI was never wired up. Pause/Play are still used by the inline
// voice-memo player when the relay returns a 'voice' message kind.
import { Pause, Play } from 'lucide-react';
import { RELAY_URL } from '../lib/relay';
import { getMessages, postMessage, type Message } from '../lib/feed';

type Props = {
  code: string;
  shareState: string;
  viewerName?: string;
  // isHost removed (2026-06-15) — the readOnly prop below is the
  // single source of truth for the partner-vs-host behavior. The
  // previous isHost prop was a stub declared but never read; keeping
  // it would have been a trap for future contributors. Host = the
  // app's own user (readOnly=false); partner = the recipient of
  // /?share=CODE (readOnly=true, set by ShareView).
  readOnly?: boolean;
};

function formatRelative(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 30) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(isoString).toLocaleDateString();
}

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
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #e8957a, #c25a3f)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
        color: '#120c10',
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}

function MessageRow({ msg }: { msg: Message }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <Avatar name={msg.authorName} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#faf6f4' }}>{msg.authorName}</span>
          <span style={{ fontSize: 10, color: '#8a6f64' }}>{formatRelative(msg.createdAt)}</span>
        </div>
        {msg.kind === 'reaction' && (
          <div style={{ fontSize: 24, lineHeight: 1 }}>{msg.content}</div>
        )}
        {msg.kind === 'text' && (
          <div style={{ fontSize: 13, color: '#e0d0c8', lineHeight: 1.5 }}>{msg.content}</div>
        )}
        {msg.kind === 'image' && (
          <img
            src={msg.content}
            alt="Shared moment"
            style={{ maxHeight: 200, borderRadius: 12, display: 'block', marginTop: 2 }}
          />
        )}
        {msg.kind === 'voice' && (
          // T6: inline voice memo player. Pure HTML <audio> with
          // controls=0 plus a custom Play/Pause button — looks consistent
          // with the rest of the app's chrome. The content is the
          // base64-encoded audio (data URL prefix added here).
          <VoiceMemoPlayer src={`data:audio/webm;base64,${msg.content}`} />
        )}
        {msg.kind === 'status' && (
          <div
            style={{
              fontSize: 12,
              color: '#faf6f4',
              background: 'rgba(232,149,122,0.12)',
              border: '1px solid rgba(232,149,122,0.3)',
              borderRadius: 10,
              padding: '8px 12px',
              lineHeight: 1.5,
              marginTop: 2,
            }}
          >
            {msg.content}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ActivityFeed({ code, shareState, viewerName, readOnly = false }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [nameInput, setNameInput] = useState(viewerName || '');
  const [sending, setSending] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [compressing, setCompressing] = useState(false);
  // T6 voice-memo recording state was removed (unused): the recorder UI was
  // never wired up after the relay added the 'voice' message kind. When this
  // comes back, hook a MediaRecorder + start/stop handlers here.
  const clientId = useRef(Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
  const bottomRef = useRef<HTMLDivElement>(null);

  const savedName = localStorage.getItem(`olive:viewer-name:${code}`);
  const effectiveName = nameInput.trim() || savedName || '';

  useEffect(() => {
    if (!effectiveName) {
      setShowNamePrompt(true);
      return;
    }
    setShowNamePrompt(false);
    // Fetch initial messages
    getMessages(code).then(setMessages).catch(() => {});
  }, [code, effectiveName]);

  // SSE subscription
  useEffect(() => {
    if (!effectiveName) return;
    const url = `${RELAY_URL}/api/shares/${code}/stream`;
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let sseWorking = false;

    const startPolling = () => {
      if (pollTimer) return;
      const tick = async () => {
        try {
          const msgs = await getMessages(code);
          setMessages(msgs);
        } catch { /* ignore */ }
        pollTimer = setTimeout(tick, 15000);
      };
      tick();
    };

    const stopPolling = () => {
      if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
    };

    try {
      es = new EventSource(url);
      es.onopen = () => { sseWorking = true; stopPolling(); };
      es.onmessage = async (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'message') {
            setMessages((prev) => {
              if (prev.find((m) => m.id === payload.message.id)) return prev;
              return [...prev, payload.message];
            });
          }
        } catch { /* ignore */ }
      };
      es.onerror = () => {
        if (!sseWorking) { es?.close(); es = null; startPolling(); }
      };
    } catch {
      startPolling();
    }
    return () => { es?.close(); stopPolling(); };
  }, [code, effectiveName]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const post = async (kind: 'reaction' | 'text' | 'image' | 'status', content: string) => {
    if (!effectiveName) return;
    setSending(true);
    try {
      // postMessage throws on failure now (was: returned null). The
      // try/catch below is finally wired — see feed.ts comment.
      const msg = await postMessage(code, kind, content, nameInput.trim(), clientId.current);
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    } catch { /* ignore */ }
    setSending(false);
  };

  const handleSendText = () => {
    const text = textInput.trim();
    if (!text) return;
    setTextInput('');
    post('text', text);
  };

  const handleReaction = (emoji: string) => {
    post('reaction', emoji);
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const base64 = await resizeImage(file);
      await post('image', base64);
    } catch { /* ignore */ }
    setCompressing(false);
    e.target.value = '';
  };

  // The 24h postpartum read-only check is now passed in from the parent
  // (ShareView) via the readOnly prop, since it has access to stateChangedAt.
  const isReadOnly = readOnly || shareState === 'archived';

  if (showNamePrompt) {
    return (
      <div style={{ padding: '20px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: '#faf6f4', fontFamily: 'Fraunces, Georgia, serif', marginBottom: 4 }}>
            Sign in
          </div>
          <div style={{ fontSize: 12, color: '#8a6f64' }}>
            Just so messages have a name attached
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your name"
            maxLength={40}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 14,
              color: '#faf6f4',
              outline: 'none',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' && nameInput.trim()) { localStorage.setItem(`olive:viewer-name:${code}`, nameInput.trim()); setShowNamePrompt(false); } }}
          />
          <button
            onClick={() => {
              if (nameInput.trim()) {
                localStorage.setItem(`olive:viewer-name:${code}`, nameInput.trim());
                setShowNamePrompt(false);
              }
            }}
            style={{
              background: '#e8957a',
              border: 'none',
              borderRadius: 12,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: '#120c10',
              cursor: 'pointer',
            }}
          >
            Join
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Read-only banner */}
      {isReadOnly && (
        <div style={{
          fontSize: 11,
          color: '#8a6f64',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10,
          padding: '8px 12px',
          marginBottom: 12,
          textAlign: 'center',
        }}>
          This labor has been archived. The feed is read-only.
        </div>
      )}

      {/* Messages list */}
      {messages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#8a6f64', fontSize: 12 }}>
          No messages yet — say hi when you arrive.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Today / Earlier divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: 10, color: '#8a6f64', textTransform: 'uppercase', letterSpacing: 2 }}>Today</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>
          {messages.map((msg) => (
            <MessageRow key={msg.id} msg={msg} />
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input row — hidden if read-only */}
      {!isReadOnly && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Send a message…"
              maxLength={2000}
              disabled={sending}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 24,
                padding: '10px 16px',
                fontSize: 13,
                color: '#faf6f4',
                outline: 'none',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            />
            <button
              onClick={handleSendText}
              disabled={sending || !textInput.trim()}
              style={{
                background: '#e8957a',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: sending ? 'default' : 'pointer',
                opacity: sending || !textInput.trim() ? 0.5 : 1,
                fontSize: 16,
                color: '#120c10',
              }}
            >
              ↑
            </button>
          </div>
          {/* Quick reactions + image */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {['❤️', '👊', '💪'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                disabled={sending}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 20,
                  padding: '6px 12px',
                  fontSize: 18,
                  cursor: sending ? 'default' : 'pointer',
                  opacity: sending ? 0.5 : 1,
                  transition: 'transform 0.1s',
                }}
              >
                {emoji}
              </button>
            ))}
            <label
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 20,
                padding: '6px 10px',
                fontSize: 11,
                color: '#b89184',
                cursor: 'pointer',
              }}
            >
              📷
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImagePick}
                disabled={sending}
                style={{ display: 'none' }}
              />
            </label>
            {compressing && (
              <span style={{ fontSize: 10, color: '#8a6f64' }}>Compressing…</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Voice memo player ----

function VoiceMemoPlayer({ src }: { src: string }) {
  // T6: the audio element is uncontrolled — we just toggle play/pause
  // and re-render the icon. Duration is read once on play (when metadata
  // loads) and shown next to the button.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
      <button
        onClick={() => {
          if (!audioRef.current) {
            const a = new Audio(src);
            a.preload = 'metadata';
            a.onloadedmetadata = () => setDuration(Math.round(a.duration));
            a.onended = () => setPlaying(false);
            audioRef.current = a;
          }
          if (playing) {
            audioRef.current.pause();
            setPlaying(false);
          } else {
            audioRef.current.play().catch(() => {});
            setPlaying(true);
          }
        }}
        aria-label={playing ? 'Pause voice memo' : 'Play voice memo'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: 'rgba(232,149,122,0.15)',
          border: '1px solid rgba(232,149,122,0.3)',
          borderRadius: 20,
          color: '#e8957a',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        <span>Voice memo{duration ? ` · ${duration}s` : ''}</span>
      </button>
    </div>
  );
}

// ---- Image resizing helper ----

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) {
            height = Math.round((height / width) * MAX);
            width = MAX;
          } else {
            width = Math.round((width / height) * MAX);
            height = MAX;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('no canvas')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}