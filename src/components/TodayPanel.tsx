import { ChevronRight, Heart } from 'lucide-react';
import type { RefObject } from 'react';
import type { JourneyDocument } from '../lib/journey';
import { journeyMessages } from '../messages/en';

export default function TodayPanel({ journey, onOpen, buttonRef, compact = false }: {
  compact?: boolean;
  journey: JourneyDocument;
  onOpen: () => void;
  buttonRef?: RefObject<HTMLButtonElement | null>;
}) {
  const message = journeyMessages[journey.profile.phase];
  const openItems = journey.responsibilities.filter((item) => !item.completedAt).length
    + journey.questions.filter((item) => !item.askedAt).length
    + journey.entries.filter((item) => !item.completedAt).length;

  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={onOpen}
      aria-label="Open birth journey"
      className="w-full mb-4 rounded-2xl border border-sage-300/25 bg-gradient-to-br from-sage-300/10 to-transparent px-4 py-4 text-left active:bg-sage-300/15 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-sage-300/15 flex items-center justify-center flex-shrink-0">
          <Heart className="w-4 h-4 text-sage-300" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-sage-300 font-semibold">{compact ? 'Birth journey' : message.eyebrow}</div>
          <div className="font-display text-lg text-ink-50 mt-0.5">{compact ? 'Care details & preparation' : message.title}</div>
          <div className="text-xs text-ink-300 leading-relaxed mt-1">{compact ? 'Your care card, questions and shared tasks' : message.detail}</div>
          {!compact && <div className="text-xs text-ink-300 mt-2">
            {openItems > 0 ? `${openItems} open item${openItems === 1 ? '' : 's'}` : 'Private on this device'}
          </div>}
        </div>
        <ChevronRight className="w-4 h-4 text-ink-400 mt-3 flex-shrink-0" />
      </div>
    </button>
  );
}
