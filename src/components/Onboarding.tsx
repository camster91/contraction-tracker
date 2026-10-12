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
    title: 'Keep or share your timing',
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
          <div className="text-sm text-ink-300 mt-1 leading-relaxed">
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
        <span className="text-sm text-ink-300" aria-live="polite">Tip {step + 1} of {STEPS.length}</span>
        <div className="flex items-center gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="text-sm text-ink-200 rounded-lg px-3 min-h-[44px] min-w-[44px]"
            >
              Back
            </button>
          )}
          {step < 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="text-sm bg-rose-300 active:bg-rose-400 text-plum-950 rounded-lg px-3 py-1.5 font-semibold transition-colors min-h-[44px]"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleDismiss}
              className="text-sm bg-rose-300 active:bg-rose-400 text-plum-950 rounded-lg px-3 py-1.5 font-semibold transition-colors min-h-[44px]"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
