// HistoryHeader — the Read / Share / .txt action buttons above the history list.

import { Volume2, Share2, Download } from 'lucide-react';

type Props = {
  onReadSummary: () => void;
  onShare: () => void;
  onDownload: () => void;
};

export default function HistoryHeader({ onReadSummary, onShare, onDownload }: Props) {
  return (
    <div className="flex items-center justify-between mb-2.5 ml-1 flex-wrap gap-2">
      <div className="text-[10px] uppercase tracking-[0.2em] text-ink-400 font-semibold">History</div>
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={onReadSummary}
          className="text-ink-300 active:text-rose-300 active:bg-ink-100/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs transition-colors"
          title="Read summary aloud"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Read</span>
        </button>
        <button
          onClick={onShare}
          className="text-ink-300 active:text-rose-300 active:bg-ink-100/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs transition-colors"
          aria-label="Share care summary"
          title="Share an objective timing summary with your care team"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Care summary</span>
        </button>
        <button
          onClick={onDownload}
          className="text-ink-300 active:text-rose-300 active:bg-ink-100/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>.txt</span>
        </button>
      </div>
    </div>
  );
}
