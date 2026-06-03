// Pure contraction math — no React, no DOM. Easy to reason about, easy to test.
//
// DATA MODEL: backward-compatible additive evolution only.
//   - All new fields are optional with safe defaults.
//   - Old data (no new fields) reads cleanly with `?? defaultValue`.
//   - New code never renames or removes existing fields.

export const COMMON_TAGS = [
  'back labor',
  'pressure',
  'nausea',
  'shaky',
  'cramping',
  'breathless',
] as const;

export const PAIN_LOCATIONS = [
  'head',
  'upper back',
  'lower back',
  'abdomen',
  'hips',
  'thighs',
  'upper back (front)',
  'lower back (back)',
] as const;

export type CommonTag = typeof COMMON_TAGS[number];
export type PainLocation = typeof PAIN_LOCATIONS[number];

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
  /** optional tags (added in v1.6) — quick categorical labels. Defaults to []. */
  tags?: string[];
  /** optional sessionId (added in v1.7) — which labor session this belongs to. Defaults to primary. */
  sessionId?: string;
  /** optional painLocations (added in v1.10) — body regions where pain was felt. Defaults to []. */
  painLocations?: string[];
  /** optional voiceMemo (added in v1.10) — base64-encoded audio, 30s max. */
  voiceMemo?: string;
  /** optional photo (added in v1.10) — base64 thumbnail, 200x200. */
  photo?: string;
};

/** Read the tags for a contraction, defaulting to empty array. */
export function getTags(c: Contraction): string[] {
  return Array.isArray(c.tags) ? c.tags : [];
}

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
  const capped = Math.min(totalSeconds, 9 * 3600 + 59 * 60 + 59); // cap at 9:59:59
  const m = Math.floor(capped / 60);
  const s = capped % 60;
  if (capped >= 3600) {
    const h = Math.floor(capped / 3600);
    const rm = Math.floor((capped % 3600) / 60);
    const rs = capped % 60;
    return `${h}:${rm.toString().padStart(2, '0')}:${rs.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  const hour12 = isHour12Preferred();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12 });
}

// Read the 12-hour time preference from localStorage. Defaults to 24h
// (matches the medical convention used in contraction tracking).
const HOUR12_KEY = 'contraction-tracker:hour12';
export function isHour12Preferred(): boolean {
  try {
    return localStorage.getItem(HOUR12_KEY) === '1';
  } catch {
    return false;
  }
}
export function setHour12Preferred(on: boolean): void {
  try {
    if (on) localStorage.setItem(HOUR12_KEY, '1');
    else localStorage.removeItem(HOUR12_KEY);
  } catch {
    /* ignore */
  }
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

/** Format elapsed time as "Xh Ym" or "Xm Ys" or "Ys" — for big stat displays. */
export function formatElapsed(totalSeconds: number): string {
  if (totalSeconds < 60) return `${Math.max(0, Math.round(totalSeconds))}s`;
  const hr = Math.floor(totalSeconds / 3600);
  const min = Math.floor((totalSeconds % 3600) / 60);
  if (hr > 0) return `${hr}h ${min}m`;
  const sec = Math.round(totalSeconds % 60);
  if (min > 0) return `${min}m ${sec}s`;
  return `${sec}s`;
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

/** Seconds since the last finished contraction. Null if no finished contractions. */
export function secondsSinceLastFinish(contractions: Contraction[], now: number = Date.now()): number | null {
  const finished = contractions.filter((c) => c.end);
  if (finished.length === 0) return null;
  const last = finished.reduce((a, b) =>
    new Date(a.end || a.start).getTime() > new Date(b.end || b.start).getTime() ? a : b,
  );
  const endMs = new Date(last.end || last.start).getTime();
  return Math.max(0, Math.round((now - endMs) / 1000));
}

/** All unique tags across contractions, sorted by usage count desc. */
export function allTags(contractions: Contraction[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of contractions) {
    for (const t of getTags(c)) {
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
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
    const tags = getTags(c);
    const tagStr = tags.length ? `  [${tags.join(', ')}]` : '';
    lines.push(`  ${formatClock(c.start)}  ${formatDuration(dur)}${intensity}${note}${tagStr}`);
  }

  return lines.join('\n');
}
