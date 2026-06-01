// Pure contraction math — no React, no DOM. Easy to reason about, easy to test.

export type Contraction = {
  id: string;
  /** ISO timestamp when the contraction started */
  start: string;
  /** ISO timestamp when the contraction ended, or null if still in progress */
  end: string | null;
  /** optional intensity 1-10 */
  intensity?: number | null;
  /** optional note */
  note?: string;
};

export function durationSeconds(c: Contraction, now: number = Date.now()): number {
  const end = c.end ? new Date(c.end).getTime() : now;
  return Math.max(0, Math.round((end - new Date(c.start).getTime()) / 1000));
}

/** Seconds between this contraction's start and the previous one's start. */
export function intervalSeconds(prev: Contraction, curr: Contraction): number {
  return Math.max(
    0,
    Math.round((new Date(curr.start).getTime() - new Date(prev.start).getTime()) / 1000),
  );
}

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatRelative(past: Date, now: number = Date.now()): string {
  const diffMs = now - past.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min${min === 1 ? '' : 's'} ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.round(hr / 24);
  return `${day} day${day === 1 ? '' : 's'} ago`;
}

/** The 5-1-1 rule: contractions ~1 minute long, ~5 minutes apart, for ~1 hour.
 *  Returns true if the most recent hour of contractions roughly matches. */
export function isFiveOneOne(contractions: Contraction[], now: number = Date.now()): boolean {
  if (contractions.length < 3) return false;
  // Only finished contractions count
  const finished = contractions.filter((c) => c.end).sort((a, b) => a.start.localeCompare(b.start));
  if (finished.length < 3) return false;

  const oneHourAgo = now - 60 * 60 * 1000;
  const recent = finished.filter((c) => new Date(c.start).getTime() >= oneHourAgo);
  if (recent.length < 3) return false;

  // Average duration across recent: each >= 45s is a good signal
  const avgDuration = recent.reduce((acc, c) => acc + durationSeconds(c, now), 0) / recent.length;
  // Average gap between starts
  const gaps: number[] = [];
  for (let i = 1; i < recent.length; i++) gaps.push(intervalSeconds(recent[i - 1], recent[i]));
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

  return avgDuration >= 45 && avgGap <= 5 * 60 + 30; // ~5 min
}

/** Build a midwife-friendly summary of the most recent hour of contractions. */
export function buildSummary(contractions: Contraction[], now: number = Date.now()): string {
  const finished = contractions.filter((c) => c.end).sort((a, b) => a.start.localeCompare(b.start));
  if (finished.length === 0) return 'No contractions recorded yet.';

  const first = finished[0];
  const last = finished[finished.length - 1];
  const totalElapsedMin = Math.round((new Date(last.start).getTime() - new Date(first.start).getTime()) / 60000);
  const durations = finished.map((c) => durationSeconds(c, now));
  const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);

  const lines: string[] = [];
  lines.push(`Contraction log — ${new Date().toLocaleString()}`);
  lines.push(`Total: ${finished.length} contractions over ${totalElapsedMin} min`);
  lines.push(`Average duration: ${avgDuration}s`);

  if (finished.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < finished.length; i++) gaps.push(intervalSeconds(finished[i - 1], finished[i]));
    const avgGap = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    lines.push(`Average interval: ${Math.floor(avgGap / 60)}m ${avgGap % 60}s`);
  }

  lines.push('');
  lines.push('Individual contractions:');
  for (const c of finished) {
    const dur = durationSeconds(c, now);
    const intensity = c.intensity ? `  intensity ${c.intensity}/10` : '';
    const note = c.note ? `  — ${c.note}` : '';
    lines.push(`  ${formatClock(c.start)}  ${formatDuration(dur)}${intensity}${note}`);
  }

  return lines.join('\n');
}
