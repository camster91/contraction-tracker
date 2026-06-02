// Frequency chart — line chart showing contraction intervals over time.
// Shows the last ~3 hours. Each dot = a contraction; the line connects them
// to show how interval is trending. Uses the same visual style as Timeline.tsx.

import type { Contraction } from '../lib/contractions';
import { durationSeconds, intervalSeconds, formatClock, isHour12Preferred } from '../lib/contractions';

type Props = {
  contractions: Contraction[];
  now?: number;
};

export default function FrequencyChart({ contractions, now = Date.now() }: Props) {
  if (contractions.length < 2) return null;

  const finished = [...contractions].filter((c) => c.end).sort((a, b) => a.start.localeCompare(b.start));
  if (finished.length < 2) return null;

  // Compute intervals between each contraction
  const points: { x: number; y: number; label: string; dur: number }[] = [];
  for (let i = 1; i < finished.length; i++) {
    const gap = intervalSeconds(finished[i - 1], finished[i]);
    const dur = durationSeconds(finished[i], now);
    points.push({
      x: new Date(finished[i].start).getTime(),
      y: gap,
      label: formatClock(finished[i].start),
      dur,
    });
  }

  const minX = new Date(finished[0].start).getTime();
  const maxX = Math.max(new Date(finished[finished.length - 1].start).getTime(), now);
  const span = Math.max(1, maxX - minX);

  // Y: gap in seconds. 0–600s (10 min) is the useful range
  const maxY = Math.max(600, ...points.map((p) => p.y)) * 1.1;
  const minY = 0;

  const toX = (ms: number) => ((ms - minX) / span) * 100;
  const toY = (s: number) => 100 - ((s - minY) / (maxY - minY)) * 100;

  // Build SVG path
  const pathPoints = points.map((p, i) => {
    const x = toX(p.x);
    const y = toY(p.y);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Area fill under the line
  const areaPoints = [
    `M ${toX(points[0].x)} ${100}`,
    ...points.map((p) => `L ${toX(p.x)} ${toY(p.y)}`),
    `L ${toX(points[points.length - 1].x)} ${100}`,
    'Z',
  ].join(' ');

  // X axis time ticks
  const tickCount = Math.min(points.length, 5);
  const tickStep = span / tickCount;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => minX + i * tickStep);

  return (
    <div className="rounded-2xl border border-ink-200/30 bg-gradient-to-br from-ink-100/[0.04] to-transparent px-3 py-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-ink-400 font-semibold mb-3 ml-1">
        Frequency
      </div>

      <div className="relative h-32">
        {/* Y axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-[9px] text-ink-500 text-right pr-1.5">
          <span>{Math.round(maxY / 60)}m</span>
          <span>{Math.round(maxY / 2 / 60)}m</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="absolute inset-x-10 top-0 bottom-4">
          {/* Horizontal grid lines */}
          <div className="absolute left-0 right-0 top-[33%] border-t border-ink-200/10" />
          <div className="absolute left-0 right-0 top-[66%] border-t border-ink-200/10" />
          <div className="absolute left-0 right-0 top-0 border-t border-ink-200/10" />

          {/* Area fill */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d={areaPoints} fill="rgba(232,149,122,0.08)" />
            <path d={pathPoints} fill="none" stroke="rgba(232,149,122,0.6)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
          </svg>

          {/* Data points */}
          {points.map((p, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-rose-300 shadow-[0_0_6px_rgba(232,149,122,0.5)]"
              style={{
                left: `calc(${toX(p.x)}% - 4px)`,
                top: `calc(${toY(p.y)}% - 4px)`,
              }}
              title={`${p.label} · ${Math.round(p.y / 60)}m ${Math.round(p.y % 60)}s gap`}
            />
          ))}
        </div>
      </div>

      {/* X axis time labels */}
      <div className="relative h-4 mt-1 ml-10 mr-2">
        {ticks.map((t, i) => {
          const xPct = ((t - minX) / span) * 100;
          if (xPct < 0 || xPct > 100) return null;
          return (
            <div
              key={i}
              className="absolute top-0 text-[9px] text-ink-500 tracking-wider font-medium -translate-x-1/2"
              style={{ left: `${xPct}%` }}
            >
              {new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: isHour12Preferred() })}
            </div>
          );
        })}
      </div>

      <div className="text-[9px] text-ink-500 mt-1 ml-10">
        Interval between contraction starts
      </div>
    </div>
  );
}