// Smart "is this active labor?" detection banner.
// Shows a soft informational indicator when the user has 3+ contractions
// in the last 10 minutes. Not alarmist — just informational.

import { Activity } from 'lucide-react';

type Props = {
  contractions: { start: string; end: string | null }[];
  now?: number;
};

export default function ActiveLaborBanner({ contractions, now = Date.now() }: Props) {
  if (contractions.length < 3) return null;

  // Find contractions in the last 10 minutes
  const tenMinAgo = now - 10 * 60 * 1000;
  const recent = contractions.filter((c) => {
    return new Date(c.start).getTime() >= tenMinAgo;
  });

  if (recent.length < 3) return null;

  return (
    <div className="flex-shrink-0 mx-5 mb-3 rounded-2xl border border-sage-300/30 bg-sage-300/10 px-4 py-3 flex items-start gap-3 animate-fade-in">
      <div className="w-7 h-7 rounded-full bg-sage-300/15 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Activity className="w-3.5 h-3.5 text-sage-300" strokeWidth={2} />
      </div>
      <div>
        <div className="text-sm font-semibold text-sage-200 font-display">
          Possible active labor
        </div>
        <div className="text-xs text-ink-300 mt-0.5 leading-relaxed">
          {recent.length} contractions in the last 10 minutes. Consider calling your provider if you haven&apos;t already.
        </div>
      </div>
    </div>
  );
}