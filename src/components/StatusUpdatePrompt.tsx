// StatusUpdatePrompt — bottom-sheet prompt replacing the old window.prompt()
// for posting status updates. Offers 4 quick presets + a custom text input.

import { useState } from 'react';
import { X } from 'lucide-react';

type Props = {
  share: string;
  onClose: () => void;
  onPost: (kind: string, content: string) => void;
};

const PRESETS = [
  'Heading to hospital',
  'At the hospital',
  'Admitted',
  'Baby is here 🎉',
] as const;

export default function StatusUpdatePrompt({ share: _share, onClose, onPost }: Props) {
  const [custom, setCustom] = useState('');

  const handlePreset = (text: string) => {
    onPost('status', text);
    onClose();
  };

  const handleCustom = () => {
    const trimmed = custom.trim();
    if (trimmed) {
      onPost('status', trimmed);
      onClose();
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-ink-200/30 bg-plum-950/98 shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.6)] flex flex-col animate-slide-up">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-8 h-1 rounded-full bg-ink-200/40" />
        </div>

        <div className="flex items-center justify-between px-5 pb-2">
          <div className="text-sm font-semibold text-ink-50 font-display">
            Post a status update
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ink-400 active:text-ink-200"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-4 space-y-2">
          {PRESETS.map((text) => (
            <button
              key={text}
              onClick={() => handlePreset(text)}
              className="w-full text-left px-3 py-2.5 rounded-xl border border-ink-200/30 bg-ink-100/5 active:bg-ink-100/10 text-sm text-ink-100 transition-colors"
            >
              {text}
            </button>
          ))}
        </div>

        <div className="border-t border-ink-200/20 mx-5" />

        <div className="px-5 py-3 space-y-3">
          <div className="text-[10px] uppercase tracking-[0.15em] text-ink-400 font-semibold">
            Or type a custom message
          </div>
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustom()}
            placeholder="e.g. Contractions are 5 min apart"
            className="w-full bg-ink-100/5 border border-ink-200/30 rounded-xl px-3 py-2.5 text-sm text-ink-50 placeholder:text-ink-500 focus:outline-none focus:border-rose-300/50"
            autoFocus
          />
          <button
            onClick={handleCustom}
            disabled={!custom.trim()}
            className="w-full bg-rose-300 active:bg-rose-400 disabled:bg-rose-300/60 disabled:text-plum-950/60 text-plum-950 rounded-xl py-2.5 text-sm font-semibold transition-colors"
          >
            Post
          </button>
        </div>

        {/* Safe area padding for phones with home indicator */}
        <div className="h-5" />
      </div>
    </>
  );
}
