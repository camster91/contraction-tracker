// BabyIsHereModal — celebratory modal when the host marks "Baby is here".
// Collects birth stats (weight, length, time, name) and posts a status
// message to the activity feed before transitioning the share to postpartum.

import { useState } from 'react';
import { X } from 'lucide-react';
import { postMessage } from '../lib/feed';
import { setShareState, getHostName } from '../lib/sessions';
import { setShareStateOnRelay } from '../lib/relay';

type Props = {
  code: string;
  onClose: () => void;
  onBabyPosted: () => void;
};

export default function BabyIsHereModal({ code, onClose, onBabyPosted }: Props) {
  const [name, setName] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [lengthIn, setLengthIn] = useState('');
  const [lengthCm, setLengthCm] = useState('');
  const [birthTime, setBirthTime] = useState(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now.toISOString().slice(0, 16);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please enter a name — even a nickname works!");
      return;
    }
    setSaving(true);
    setError(null);

    const parts: string[] = [`${name.trim()} is here! 🎉`];
    if (weightLbs || weightKg) {
      const w = weightLbs ? `${weightLbs} lb` : '';
      const k = weightKg ? `${weightKg} kg` : '';
      parts.push(w && k ? `${weightLbs} lb / ${weightKg} kg` : w || k);
    }
    if (lengthIn || lengthCm) {
      const l = lengthIn ? `${lengthIn} in` : '';
      const c = lengthCm ? `${lengthCm} cm` : '';
      parts.push(l && c ? `${lengthIn} in / ${lengthCm} cm` : l || c);
    }
    if (birthTime) {
      const d = new Date(birthTime);
      parts.push(`Born ${d.toLocaleString()}`);
    }

    const message = parts.join(' · ');

    try {
      // Post the celebration to the partner's activity feed first.
      // If this fails, don't transition state — the host can re-tap.
      // The authorName is the host's display name from local
      // storage (default 'Host') so the partner sees "Bianca"
      // instead of "Host" if the host has set their name.
      await postMessage(code, 'status', message, getHostName(), undefined);
    } catch {
      setError("Couldn't reach the share server. Tap Save to retry.");
      setSaving(false);
      return;
    }
    // Celebration posted — transition the share to 'postpartum' both
    // locally and on the relay. The host's button hides (the showBaby
    // flag in App.tsx gates on state !== 'postpartum'); the partner
    // view also sees the state change. Without this, the Baby
    // button would stay visible after the celebration and the host
    // could re-tap it, posting duplicate "X is here!" messages.
    setShareState(code, 'postpartum');
    setShareStateOnRelay(code, 'postpartum').catch(() => { /* best-effort — local mirror is the source of truth */ });
    setSaving(false);
    onBabyPosted();
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-ink-200/30 bg-plum-950/98 shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.6)] max-h-[90dvh] flex flex-col animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="baby-modal-title"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-8 h-1 rounded-full bg-ink-200/40" />
        </div>

        <div className="flex items-center justify-between px-5 pb-2">
          <div className="text-sm font-semibold text-ink-50 font-display" id="baby-modal-title">
            🎉 Baby is here!
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ink-400 active:text-ink-200"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
          <p className="text-[11px] text-ink-400 leading-relaxed">
            Share the happy news with your circle. All fields are optional — name is required.
          </p>
          {/* Privacy disclosure. Per the v1.0.1 audit: the newborn's
              name + weight + length + birth time are posted to the
              share server and persisted there. Anyone with the
              share link can read them. The host should be the one
              deciding what's shared — say it explicitly. (Long-term
              fix: split the "celebration" message from the structured
              birth-stats fields; out of scope for this commit.) */}
          <p className="text-[10px] text-ink-500 leading-relaxed italic">
            What you enter here will be visible to anyone with the share link and stored on the share server. Tap Cancel to dismiss without sharing.
          </p>

          {error && (
            <div className="rounded-xl border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
              {error}
            </div>
          )}

          {/* Baby name */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] text-ink-400 font-semibold mb-1">
              Baby's name <span className="text-rose-300">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rowan"
              // Cap to a reasonable baby-name length (60 chars covers
              // any real name + nicknames). Without a cap, a runaway
              // tab could post a 100KB name to the relay.
              maxLength={60}
              className="w-full bg-ink-100/5 border border-ink-200/30 rounded-xl px-3 py-2.5 text-sm text-ink-50 placeholder:text-ink-500 focus:outline-none focus:border-rose-300/50"
              autoFocus
            />
          </div>

          {/* Birth time */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] text-ink-400 font-semibold mb-1">
              Birth time
            </label>
            <input
              type="datetime-local"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              className="w-full bg-ink-100/5 border border-ink-200/30 rounded-xl px-3 py-2.5 text-sm text-ink-50 focus:outline-none focus:border-rose-300/50"
            />
          </div>

          {/* Weight */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] text-ink-400 font-semibold mb-1">
              Weight
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(e.target.value)}
                  placeholder="lb"
                  className="w-full bg-ink-100/5 border border-ink-200/30 rounded-xl px-3 py-2.5 text-sm text-ink-50 placeholder:text-ink-500 focus:outline-none focus:border-rose-300/50"
                />
                <div className="text-[9px] text-ink-500 mt-1 text-center">pounds</div>
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="kg"
                  className="w-full bg-ink-100/5 border border-ink-200/30 rounded-xl px-3 py-2.5 text-sm text-ink-50 placeholder:text-ink-500 focus:outline-none focus:border-rose-300/50"
                />
                <div className="text-[9px] text-ink-500 mt-1 text-center">kilograms</div>
              </div>
            </div>
          </div>

          {/* Length */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] text-ink-400 font-semibold mb-1">
              Length
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  value={lengthIn}
                  onChange={(e) => setLengthIn(e.target.value)}
                  placeholder="in"
                  className="w-full bg-ink-100/5 border border-ink-200/30 rounded-xl px-3 py-2.5 text-sm text-ink-50 placeholder:text-ink-500 focus:outline-none focus:border-rose-300/50"
                />
                <div className="text-[9px] text-ink-500 mt-1 text-center">inches</div>
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  value={lengthCm}
                  onChange={(e) => setLengthCm(e.target.value)}
                  placeholder="cm"
                  className="w-full bg-ink-100/5 border border-ink-200/30 rounded-xl px-3 py-2.5 text-sm text-ink-50 placeholder:text-ink-500 focus:outline-none focus:border-rose-300/50"
                />
                <div className="text-[9px] text-ink-500 mt-1 text-center">centimeters</div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-sage-300 active:bg-sage-400 disabled:bg-sage-300/60 disabled:text-plum-950/60 text-plum-950 rounded-xl py-3 text-sm font-semibold transition-colors"
          >
            {saving ? 'Posting…' : 'Share with circle'}
          </button>

          <button
            onClick={onClose}
            className="w-full text-center text-xs text-ink-400 active:text-ink-200 py-1"
          >
            Not yet — cancel
          </button>
        </div>
      </div>
    </>
  );
}