const MAX_CONTRACTION_MS = 4 * 60 * 60_000;
const FUTURE_TOLERANCE_MS = 60_000;

export type EditableContractionTime = { start: string; end: string | null };

export function validateContractionTimes(
  value: EditableContractionTime,
  now = Date.now(),
): boolean {
  const start = Date.parse(value.start);
  const end = value.end === null ? null : Date.parse(value.end);
  if (!Number.isFinite(start) || start > now + FUTURE_TOLERANCE_MS) return false;
  if (end === null) return now - start <= MAX_CONTRACTION_MS;
  return Number.isFinite(end)
    && end > start
    && end <= now + FUTURE_TOLERANCE_MS
    && end - start <= MAX_CONTRACTION_MS;
}

export function withClockTime(
  value: EditableContractionTime,
  field: 'start' | 'end',
  clockValue: string,
  now = Date.now(),
): EditableContractionTime | null {
  if (field === 'end' && value.end === null) return null;
  const parts = clockValue.split(':').map(Number);
  if (parts.length < 2 || parts.some((part) => !Number.isFinite(part))) return null;
  const source = field === 'start' ? value.start : value.end!;
  const changed = new Date(source);
  if (!Number.isFinite(changed.getTime())) return null;
  changed.setHours(parts[0], parts[1], parts[2] ?? 0, 0);
  const candidate = { ...value, [field]: changed.toISOString() };
  return validateContractionTimes(candidate, now) ? candidate : null;
}

export function withEndOffset(
  value: EditableContractionTime,
  offsetSeconds: number,
  now = Date.now(),
): EditableContractionTime | null {
  if (value.end === null || !Number.isFinite(offsetSeconds) || !Number.isFinite(Date.parse(value.end))) return null;
  const candidate = {
    ...value,
    end: new Date(Date.parse(value.end) + offsetSeconds * 1000).toISOString(),
  };
  return validateContractionTimes(candidate, now) ? candidate : null;
}
