// Onboarding — 3-step inline hint cards shown above the carousel for
// first-time users. Non-blocking (no backdrop blur). Manages its own
// internal step state.

import { useState } from 'react';
import { Play, Square, Share2 } from 'lucide-react';

type Props = {
  onDismiss: () => void;
};

const STEPS = [
  {
    icon: Play,
    title: 'Tap the button when a contraction starts',
    desc: 'Your screen will stay awake so you can see the timer.',
  },
  {
    icon: Square,
    title: 'Tap again when it passes',
    desc: 'Mark how strong it felt, or add a note if you want.',
  },
  {
    icon: Share2,
    title: 'Send a link to your partner',
    desc: 'They can follow along in real time from their phone.',
  },
] as const;

export default function Onboarding({ onDismiss }: Props) {
  const [step, setStep] = useState(0);

  const handleDismiss = () => {
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    onDismiss();
  };

  const Icon = STEPS[step].icon;

  return (
    <div className="mb-4 rounded-2xl border border-rose-300/30 bg-rose-300/[0.06] px-4 py-3 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-rose-300/20 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-rose-300" style={step === 0 || step === 1 ? { fill: 'currentColor' } : undefined} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink-100 font-display">
            {STEPS[step].title}
          </div>
          <div className="text-xs text-ink-300 mt-1 leading-relaxed">
            {STEPS[step].desc}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-[11px] text-ink-400 active:text-ink-200 px-2 py-1 min-h-[32px]"
          aria-label="Dismiss onboarding"
        >
          Not now
        </button>
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className="group w-6 h-6 flex items-center justify-center rounded-full"
              aria-label={`Go to step ${i + 1}`}
            >
              <span
                aria-hidden="true"
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-rose-300' : 'w-1.5 bg-ink-400/40 group-active:bg-ink-400/60'
                }`}
              />
            </button>
          ))}
        </div>
        {step < 2 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="text-xs bg-rose-300 active:bg-rose-400 text-plum-950 rounded-lg px-3 py-1.5 font-semibold transition-colors min-h-[32px]"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleDismiss}
            className="text-xs bg-rose-300 active:bg-rose-400 text-plum-950 rounded-lg px-3 py-1.5 font-semibold transition-colors min-h-[32px]"
          >
            Got it
          </button>
        )}
      </div>
    </div>
  );
}
