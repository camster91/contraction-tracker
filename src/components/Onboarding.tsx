// Onboarding — 2-step inline hint cards shown above the carousel for
// first-time users. Non-blocking (no backdrop blur). Manages its own
// internal step state.

import { useState } from 'react';
import { BrandIllustration } from './Brand';

type Props = {
  onDismiss: () => void;
};

const STEPS = [
  {
    illustration: 'timing' as const,
    title: 'Tap the button when a contraction starts',
    desc: 'Tap Start, then Stop when it passes. Timing works offline.',
  },
  {
    illustration: 'support' as const,
    title: 'Tap again when it passes',
    desc: 'Your records stay on this device. Add a note or share a summary when you choose.',
  },
] as const;

export default function Onboarding({ onDismiss }: Props) {
  const [step, setStep] = useState(0);

  const handleDismiss = () => {
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    onDismiss();
  };



  return (
    <div className="mb-4 rounded-2xl border border-rose-300/30 bg-rose-300/[0.06] px-4 py-3 animate-fade-in">
      <div className="flex items-start gap-3">
        <BrandIllustration name={STEPS[step].illustration} className="w-14 h-14" />
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
          className="text-sm text-ink-400 active:text-ink-200 px-2 py-1 min-h-[44px]"
          aria-label="Dismiss onboarding"
        >
          Not now
        </button>
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-1.5">
          {[0, 1].map((i) => (
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
        {step < 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="text-xs bg-rose-300 active:bg-rose-400 text-plum-950 rounded-lg px-3 py-1.5 font-semibold transition-colors min-h-[44px]"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleDismiss}
            className="text-xs bg-rose-300 active:bg-rose-400 text-plum-950 rounded-lg px-3 py-1.5 font-semibold transition-colors min-h-[44px]"
          >
            Got it
          </button>
        )}
      </div>
    </div>
  );
}