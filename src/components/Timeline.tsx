import type { Contraction } from '../lib/contractions';
import { durationSeconds, formatClock } from '../lib/contractions';

type Props = {
  contractions: Contraction[];
  now?: number;
};

/**
 * Visualizes contractions as a wave — each contraction is a vertical bar whose
 * height represents duration, and the spacing represents the gap to the next.
 * Shows the last ~3 hours so the pattern is readable on a phone screen.
 */
export default function Timeline({ contractions, now = Date.now() }: Props) {
  if (contractions.length < 2) return null;

  const last = contractions[contractions.length - 1];
  const first = contractions[0];

  // Anchor the window: from 1h before the first contraction to 30 min after the last
  // (so the most recent one isn't pinned to the right edge).
  const endAnchor = Math.max(
    new Date(last.start).getTime() + 30 * 60 * 1000,
    now,
  );
  const startAnchor = Math.min(
    new Date(first.start).getTime() - 30 * 60 * 1000,
    endAnchor - 3 * 60 * 60 * 1000,
  );
  const totalSpan = Math.max(1, endAnchor - startAnchor);

  const maxDur = Math.max(
    60,
    ...contractions.map((c) => durationSeconds(c, now)),
  );

  const ticks: { t: number; label?: string }[] = [];
  const tickInterval = chooseTickInterval(totalSpan);
  const firstTick = Math.ceil(startAnchor / tickInterval) * tickInterval;
  for (let t = firstTick; t <= endAnchor; t += tickInterval) {
    const d = new Date(t);
    ticks.push({ t, label: formatTickLabel(d) });
  }

  return (
    <div className="rounded-2xl border border-ink-200/30 bg-gradient-to-br from-ink-100/[0.04] to-transparent px-3 py-4">
      <div className="relative h-24">
        {/* Bars */}
        {contractions.map((c) => {
          const startMs = new Date(c.start).getTime();
          const xPct = ((startMs - startAnchor) / totalSpan) * 100;
          const dur = durationSeconds(c, now);
          const heightPct = (dur / maxDur) * 100;
          const intensity = c.intensity ?? 5;
          // Stronger contractions = more saturated
          const opacity = 0.35 + (intensity / 10) * 0.5;
          return (
            <div
              key={c.id}
              className="absolute bottom-0 w-1.5 rounded-full bg-gradient-to-t from-rose-500 to-rose-200"
              style={{
                left: `calc(${xPct}% - 3px)`,
                height: `${Math.max(8, heightPct)}%`,
                opacity,
              }}
              title={`${formatClock(c.start)} · ${dur}s`}
            />
          );
        })}

        {/* "Now" line */}
        {now >= startAnchor && now <= endAnchor && (
          <div
            className="absolute top-0 bottom-0 w-px bg-ink-300/40"
            style={{ left: `${((now - startAnchor) / totalSpan) * 100}%` }}
          >
            <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-rose-300 shadow-[0_0_8px_rgba(232,149,122,0.6)]" />
          </div>
        )}
      </div>

      {/* Time axis */}
      <div className="relative h-4 mt-1">
        {ticks.map((tick, i) => {
          const xPct = ((tick.t - startAnchor) / totalSpan) * 100;
          if (xPct < 0 || xPct > 100) return null;
          return (
            <div
              key={i}
              className="absolute top-0 text-[9px] text-ink-500 tracking-wider font-medium -translate-x-1/2"
              style={{ left: `${xPct}%` }}
            >
              {tick.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function chooseTickInterval(spanMs: number): number {
  const hour = 3600 * 1000;
  if (spanMs <= 2 * hour) return 15 * 60 * 1000;
  if (spanMs <= 6 * hour) return 30 * 60 * 1000;
  return hour;
}

function formatTickLabel(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}
