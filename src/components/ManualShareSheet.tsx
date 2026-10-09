import { useRef, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { useModalDialog } from '../hooks/useModalDialog';
import { toast } from '../lib/toast';

type ManualShareSheetProps = {
  /** Text that should be shared, kept in a readonly field for explicit copy. */
  text: string;
  /** Short context for the sheet heading, e.g. "Care summary" or "Update for Alex". */
  title: string;
  onClose: () => void;
};

/**
 * Accessible fallback when a platform share sheet cannot be opened.
 *
 * The text is never copied automatically after a share failure. The person
 * can select it, copy it, or close the sheet without putting private care
 * details on the clipboard.
 */
export default function ManualShareSheet({ text, title, onClose }: ManualShareSheetProps) {
  const dialogRef = useModalDialog(onClose);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const selectAll = () => {
    textRef.current?.focus();
    textRef.current?.select();
    setStatus('Text selected. Use your device’s Copy command.');
  };

  const copy = async () => {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
      selectAll();
      setStatus('Copy is unavailable here. The text is selected for manual copying.');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
      onClose();
    } catch {
      selectAll();
      setStatus('Copy is unavailable here. The text is selected for manual copying.');
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-share-title"
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-[60] rounded-t-3xl border-t border-ink-200/30 bg-plum-950/98 shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.6)] max-h-[85dvh] flex flex-col animate-slide-up"
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-8 h-1 rounded-full bg-ink-200/40" />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3">
          <div className="min-w-0">
            <h2 id="manual-share-title" className="text-sm font-semibold text-ink-50 font-display">Share {title}</h2>
            <p className="text-xs text-ink-300 mt-1">Choose what to do with this text.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-lg text-ink-200 flex items-center justify-center"
            aria-label="Close share text"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-5 pb-6">
          <textarea
            ref={textRef}
            readOnly
            value={text}
            aria-label={`${title} text`}
            onFocus={(event) => event.currentTarget.select()}
            rows={7}
            className="w-full resize-y rounded-xl border border-ink-200/30 bg-ink-100/5 px-3 py-3 text-base leading-relaxed text-ink-100 focus:outline-none focus:ring-2 focus:ring-sage-300"
          />
          {status && (
            <p role="status" className="mt-2 text-sm text-ink-200 flex items-start gap-2">
              <Check className="w-4 h-4 text-sage-300 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>{status}</span>
            </p>
          )}
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={selectAll}
              className="min-h-11 flex-1 rounded-xl border border-ink-200/30 px-3 py-2 text-sm text-ink-200"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={copy}
              className="min-h-11 flex-1 rounded-xl bg-rose-300 px-3 py-2 text-sm font-semibold text-plum-950 flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" aria-hidden="true" />
              Copy
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
