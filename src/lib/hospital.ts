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

function readRaw(sessionId: string): CervicalExam[] {
  try {
    const raw = localStorage.getItem(KEY(sessionId));
    if (raw) return JSON.parse(raw) as CervicalExam[];
  } catch { /* fall through */ }
  try {
    const shadow = localStorage.getItem(`${KEY(sessionId)}::shadow`);
    if (shadow) {
      try { localStorage.setItem(KEY(sessionId), shadow); } catch { /* ignore */ }
      return JSON.parse(shadow) as CervicalExam[];
    }
  } catch { /* fall through */ }
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