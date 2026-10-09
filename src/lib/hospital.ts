// Cervical exam log

export type CervicalExam = {
  id: string;
  sessionId: string;
  time: string;        // ISO timestamp
  dilationCm: number | null;  // 0–10 in 0.5 increments
  effacementPct: number | null; // 0–100
  station: number | null;      // -3 to +3
  notes?: string;
};

const KEY = (sessionId: string) => `contraction-tracker:cervical-exams:${sessionId}`;

function isExam(value: unknown): value is CervicalExam {
  if (!value || typeof value !== 'object') return false;
  const exam = value as Partial<CervicalExam>;
  const measurement = (candidate: unknown, min: number, max: number) =>
    candidate === null || (typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= min && candidate <= max);
  return typeof exam.id === 'string' && exam.id.length > 0
    && typeof exam.sessionId === 'string' && exam.sessionId.length > 0
    && typeof exam.time === 'string' && Number.isFinite(Date.parse(exam.time))
    && measurement(exam.dilationCm, 0, 10)
    && measurement(exam.effacementPct, 0, 100)
    && measurement(exam.station, -3, 3)
    && (exam.notes === undefined || typeof exam.notes === 'string');
}

function readRaw(sessionId: string): CervicalExam[] {
  const read = (candidate: string): { raw: string; value: CervicalExam[] } | null => {
    try {
      const raw = localStorage.getItem(candidate);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.every(isExam)) return null;
      return { raw, value: parsed };
    } catch { return null; }
  };
  const primary = read(KEY(sessionId));
  if (primary) return primary.value;
  const shadow = read(`${KEY(sessionId)}::shadow`);
  if (shadow) {
    try { localStorage.setItem(KEY(sessionId), shadow.raw); } catch { /* best effort */ }
    return shadow.value;
  }
  return [];
}

function writeRaw(sessionId: string, exams: CervicalExam[]): boolean {
  try {
    const json = JSON.stringify(exams);
    localStorage.setItem(KEY(sessionId), json);
    try { localStorage.setItem(`${KEY(sessionId)}::shadow`, json); } catch { /* ignore */ }
    return true;
  } catch { return false; }
}

export function getExams(sessionId: string): CervicalExam[] {
  return readRaw(sessionId);
}

export function writeExams(sessionId: string, exams: CervicalExam[]) {
  return writeRaw(sessionId, exams);
}

export function addExam(sessionId: string, input: Omit<CervicalExam, 'id' | 'sessionId'>): CervicalExam | null {
  const valid = (value: number | null, min: number, max: number) => value === null || (Number.isFinite(value) && value >= min && value <= max);
  if (!valid(input.dilationCm, 0, 10) || !valid(input.effacementPct, 0, 100) || !valid(input.station, -3, 3)) return null;
  if (input.dilationCm === null && input.effacementPct === null && input.station === null && !input.notes?.trim()) return null;
  const exams = getExams(sessionId);
  const exam: CervicalExam = {
    ...input,
    id: `exam-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    sessionId,
  };
  if (!writeRaw(sessionId, [...exams, exam])) return null;
  return exam;
}

export function deleteExam(sessionId: string, examId: string) {
  writeRaw(sessionId, getExams(sessionId).filter((e) => e.id !== examId));
}
