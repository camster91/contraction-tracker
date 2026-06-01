// Hospital Bag Checklist Sheet component
import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { getChecklist, toggleChecklistItem, packedCount, type ChecklistItem } from '../lib/checklist';

type Props = {
  sessionId: string;
  onClose: () => void;
};

export default function ChecklistSheet({ sessionId, onClose }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>(() => getChecklist(sessionId));

  const handleToggle = (itemId: string) => {
    toggleChecklistItem(sessionId, itemId);
    setItems(getChecklist(sessionId));
  };

  const packed = packedCount(items);
  const total = items.length;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-ink-200/30 bg-plum-950/98 backdrop-blur-xl shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.6)] max-h-[85dvh] flex flex-col animate-slide-up">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-8 h-1 rounded-full bg-ink-200/40" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sage-300/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-sage-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div>
              <div className="text-base font-semibold text-ink-50 font-display">Hospital Bag</div>
              <div className="text-[11px] text-ink-400 mt-0.5">{packed} of {total} packed</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-ink-400 active:text-ink-200 rounded-xl active:bg-ink-100/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mx-5 mb-3 h-1.5 rounded-full bg-ink-100/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-sage-300 transition-all duration-300"
            style={{ width: `${total > 0 ? (packed / total) * 100 : 0}%` }}
          />
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-1.5">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleToggle(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                item.packed
                  ? 'border-sage-300/30 bg-sage-300/10'
                  : 'border-ink-200/30 bg-ink-100/5 active:bg-ink-100/10'
              }`}
            >
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                item.packed ? 'bg-sage-300 border-sage-300' : 'border-ink-300/50'
              }`}>
                {item.packed && <Check className="w-3 h-3 text-plum-950" strokeWidth={3} />}
              </div>
              <span className={`text-sm flex-1 text-left ${
                item.packed ? 'text-ink-300 line-through' : 'text-ink-50'
              }`}>
                {item.text}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}