export const JOURNEY_STORAGE_KEY = 'olive:journey:v1';

export type JourneyPhase = 'preparing' | 'labor' | 'postpartum' | 'archived';

export interface JourneyProfile {
  id: string;
  phase: JourneyPhase;
  preferredName?: string;
  pronouns?: string;
  estimatedDueDate?: string;
  birthDate?: string;
  birthLocation?: string;
  birthAddress?: string;
  importantNotes?: string;
  emergencyPersonId?: string;
  updatedAt: string;
}

export interface Responsibility {
  id: string;
  journeyId: string;
  title: string;
  assigneePersonId?: string;
  dueAt?: string;
  phase?: JourneyPhase;
  private: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type QuestionCategory = 'birth' | 'recovery' | 'feeding' | 'medication' | 'mood' | 'other';

export interface ProviderQuestion {
  id: string;
  journeyId: string;
  text: string;
  category: QuestionCategory;
  appointmentAt?: string;
  private: boolean;
  pinned: boolean;
  askedAt?: string;
  notes?: string;
  notesAreProviderInstructions: boolean;
  providerName?: string;
  createdAt: string;
  updatedAt: string;
}

export type JourneyEntryKind = 'appointment' | 'recovery-note' | 'support' | 'question-reminder' | 'milestone';

export interface JourneyEntry {
  id: string;
  journeyId: string;
  kind: JourneyEntryKind;
  title: string;
  note?: string;
  occursAt: string;
  private: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JourneyDocument {
  schemaVersion: 1;
  profile: JourneyProfile;
  responsibilities: Responsibility[];
  questions: ProviderQuestion[];
  entries: JourneyEntry[];
}

const PHASES = new Set<JourneyPhase>(['preparing', 'labor', 'postpartum', 'archived']);
const QUESTION_CATEGORIES = new Set<QuestionCategory>(['birth', 'recovery', 'feeding', 'medication', 'mood', 'other']);
const ENTRY_KINDS = new Set<JourneyEntryKind>(['appointment', 'recovery-note', 'support', 'question-reminder', 'milestone']);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().slice(0, max);
  return normalized || undefined;
}

function date(value: unknown): string | undefined {
  const normalized = text(value, 40);
  if (!normalized || Number.isNaN(Date.parse(normalized))) return undefined;
  return normalized;
}

function phase(value: unknown): JourneyPhase | undefined {
  return typeof value === 'string' && PHASES.has(value as JourneyPhase)
    ? value as JourneyPhase
    : undefined;
}

function id(value: unknown): string | undefined {
  const normalized = text(value, 128);
  return normalized && /^[A-Za-z0-9_-]+$/.test(normalized) ? normalized : undefined;
}

function optional<K extends string, V>(key: K, value: V | undefined): Record<K, V> | Record<string, never> {
  return value === undefined ? {} : { [key]: value } as Record<K, V>;
}

export function createDefaultJourney(now = new Date().toISOString(), journeyId = createJourneyId()): JourneyDocument {
  return {
    schemaVersion: 1,
    profile: { id: journeyId, phase: 'preparing', updatedAt: now },
    responsibilities: [],
    questions: [],
    entries: [],
  };
}

export function normalizeJourney(
  value: unknown,
  now = new Date().toISOString(),
  fallbackId = createJourneyId(),
): JourneyDocument {
  const source = record(value);
  const profileSource = record(source?.profile);
  const journeyId = id(profileSource?.id) ?? fallbackId;
  const normalizedProfile: JourneyProfile = {
    id: journeyId,
    phase: phase(profileSource?.phase) ?? 'preparing',
    ...optional('preferredName', text(profileSource?.preferredName, 80)),
    ...optional('pronouns', text(profileSource?.pronouns, 60)),
    ...optional('estimatedDueDate', date(profileSource?.estimatedDueDate)),
    ...optional('birthDate', date(profileSource?.birthDate)),
    ...optional('birthLocation', text(profileSource?.birthLocation, 120)),
    ...optional('birthAddress', text(profileSource?.birthAddress, 240)),
    ...optional('importantNotes', text(profileSource?.importantNotes, 2000)),
    ...optional('emergencyPersonId', id(profileSource?.emergencyPersonId)),
    updatedAt: date(profileSource?.updatedAt) ?? now,
  };

  const responsibilities = Array.isArray(source?.responsibilities)
    ? source.responsibilities.flatMap((item): Responsibility[] => {
      const row = record(item);
      const itemId = id(row?.id);
      const itemJourneyId = id(row?.journeyId);
      const title = text(row?.title, 160);
      const createdAt = date(row?.createdAt);
      const updatedAt = date(row?.updatedAt);
      if (!itemId || !itemJourneyId || !title || !createdAt || !updatedAt) return [];
      return [{
        id: itemId,
        journeyId: itemJourneyId,
        title,
        ...optional('assigneePersonId', id(row?.assigneePersonId)),
        ...optional('dueAt', date(row?.dueAt)),
        ...optional('phase', phase(row?.phase)),
        private: row?.private !== false,
        ...optional('completedAt', date(row?.completedAt)),
        createdAt,
        updatedAt,
      }];
    })
    : [];

  const questions = Array.isArray(source?.questions)
    ? source.questions.flatMap((item): ProviderQuestion[] => {
      const row = record(item);
      const itemId = id(row?.id);
      const itemJourneyId = id(row?.journeyId);
      const questionText = text(row?.text, 500);
      const createdAt = date(row?.createdAt);
      const updatedAt = date(row?.updatedAt);
      const category = typeof row?.category === 'string' && QUESTION_CATEGORIES.has(row.category as QuestionCategory)
        ? row.category as QuestionCategory
        : 'other';
      if (!itemId || !itemJourneyId || !questionText || !createdAt || !updatedAt) return [];
      return [{
        id: itemId,
        journeyId: itemJourneyId,
        text: questionText,
        category,
        ...optional('appointmentAt', date(row?.appointmentAt)),
        private: row?.private !== false,
        pinned: row?.pinned === true,
        ...optional('askedAt', date(row?.askedAt)),
        ...optional('notes', text(row?.notes, 2000)),
        notesAreProviderInstructions: row?.notesAreProviderInstructions === true,
        ...optional('providerName', text(row?.providerName, 80)),
        createdAt,
        updatedAt,
      }];
    })
    : [];

  const entries = Array.isArray(source?.entries)
    ? source.entries.flatMap((item): JourneyEntry[] => {
      const row = record(item);
      const itemId = id(row?.id);
      const itemJourneyId = id(row?.journeyId);
      const title = text(row?.title, 160);
      const occursAt = date(row?.occursAt);
      const createdAt = date(row?.createdAt);
      const updatedAt = date(row?.updatedAt);
      const kind = typeof row?.kind === 'string' && ENTRY_KINDS.has(row.kind as JourneyEntryKind)
        ? row.kind as JourneyEntryKind
        : undefined;
      if (!itemId || !itemJourneyId || !title || !occursAt || !createdAt || !updatedAt || !kind) return [];
      return [{
        id: itemId,
        journeyId: itemJourneyId,
        kind,
        title,
        ...optional('note', text(row?.note, 2000)),
        occursAt,
        private: row?.private !== false,
        ...optional('completedAt', date(row?.completedAt)),
        createdAt,
        updatedAt,
      }];
    })
    : [];

  return { schemaVersion: 1, profile: normalizedProfile, responsibilities, questions, entries };
}

export function updateJourneyPhase(
  journey: JourneyDocument,
  nextPhase: JourneyPhase,
  now = new Date().toISOString(),
): JourneyDocument {
  return normalizeJourney({
    ...journey,
    profile: { ...journey.profile, phase: nextPhase, updatedAt: now },
  }, now, journey.profile.id);
}

export function mergeJourney(
  existing: JourneyDocument,
  imported: JourneyDocument,
  now = new Date().toISOString(),
): JourneyDocument {
  const journeyId = existing.profile.id;
  const mergeById = <T extends { id: string; journeyId: string }>(current: T[], incoming: T[]): T[] => {
    const merged = new Map(current.map((item) => [item.id, item]));
    for (const item of incoming) {
      if (!merged.has(item.id)) merged.set(item.id, { ...item, journeyId });
    }
    return [...merged.values()];
  };

  return normalizeJourney({
    schemaVersion: 1,
    profile: {
      ...imported.profile,
      ...existing.profile,
      id: journeyId,
      updatedAt: now,
    },
    responsibilities: mergeById(existing.responsibilities, imported.responsibilities),
    questions: mergeById(existing.questions, imported.questions),
    entries: mergeById(existing.entries, imported.entries),
  }, now, journeyId);
}

export function updateJourneyProfile(
  journey: JourneyDocument,
  patch: Partial<Omit<JourneyProfile, 'id' | 'updatedAt'>>,
  now = new Date().toISOString(),
): JourneyDocument {
  return normalizeJourney({
    ...journey,
    profile: { ...journey.profile, ...patch, id: journey.profile.id, updatedAt: now },
  }, now, journey.profile.id);
}

export function addProviderQuestion(
  journey: JourneyDocument,
  input: { text: string; category?: QuestionCategory; appointmentAt?: string },
  now = new Date().toISOString(),
  questionId = createItemId('question'),
): JourneyDocument {
  const questionText = text(input.text, 500);
  if (!questionText) throw new Error('Question text is required.');
  const question: ProviderQuestion = {
    id: questionId,
    journeyId: journey.profile.id,
    text: questionText,
    category: input.category && QUESTION_CATEGORIES.has(input.category) ? input.category : 'other',
    ...optional('appointmentAt', date(input.appointmentAt)),
    private: true,
    pinned: false,
    notesAreProviderInstructions: false,
    createdAt: now,
    updatedAt: now,
  };
  return normalizeJourney({
    ...journey,
    profile: { ...journey.profile, updatedAt: now },
    questions: [...journey.questions, question],
  }, now, journey.profile.id);
}

export function updateProviderQuestion(
  journey: JourneyDocument,
  questionId: string,
  patch: Partial<Omit<ProviderQuestion, 'id' | 'journeyId' | 'createdAt'>>,
  now = new Date().toISOString(),
): JourneyDocument {
  return normalizeJourney({
    ...journey,
    profile: { ...journey.profile, updatedAt: now },
    questions: journey.questions.map((question) => question.id === questionId
      ? { ...question, ...patch, id: question.id, journeyId: journey.profile.id, createdAt: question.createdAt, updatedAt: now }
      : question),
  }, now, journey.profile.id);
}

export function deleteProviderQuestion(
  journey: JourneyDocument,
  questionId: string,
  now = new Date().toISOString(),
): JourneyDocument {
  return normalizeJourney({
    ...journey,
    profile: { ...journey.profile, updatedAt: now },
    questions: journey.questions.filter((question) => question.id !== questionId),
  }, now, journey.profile.id);
}

export function buildCareCardSummary(journey: JourneyDocument): string {
  const profile = journey.profile;
  const lines = ['Olive care card'];
  if (profile.preferredName) lines.push(`Name: ${profile.preferredName}`);
  if (profile.pronouns) lines.push(`Pronouns: ${profile.pronouns}`);
  if (profile.estimatedDueDate) lines.push(`Estimated due date: ${profile.estimatedDueDate}`);
  if (profile.birthDate) lines.push(`Birth date: ${profile.birthDate}`);
  if (profile.birthLocation) lines.push(`Birth location: ${profile.birthLocation}`);
  if (profile.birthAddress) lines.push(`Birth address: ${profile.birthAddress}`);
  if (profile.importantNotes) lines.push(`Important notes entered by the user: ${profile.importantNotes}`);
  lines.push('', 'Olive organizes user-entered information and does not diagnose labor or replace professional care.');
  return lines.join('\n');
}

export function addResponsibility(
  journey: JourneyDocument,
  input: { title: string; assigneePersonId?: string; dueAt?: string; phase?: JourneyPhase },
  now = new Date().toISOString(),
  responsibilityId = createItemId('task'),
): JourneyDocument {
  const title = text(input.title, 160);
  if (!title) throw new Error('Responsibility title is required.');
  const responsibility: Responsibility = {
    id: responsibilityId,
    journeyId: journey.profile.id,
    title,
    ...optional('assigneePersonId', id(input.assigneePersonId)),
    ...optional('dueAt', date(input.dueAt)),
    ...optional('phase', phase(input.phase)),
    private: true,
    createdAt: now,
    updatedAt: now,
  };
  return normalizeJourney({
    ...journey,
    profile: { ...journey.profile, updatedAt: now },
    responsibilities: [...journey.responsibilities, responsibility],
  }, now, journey.profile.id);
}

export function updateResponsibility(
  journey: JourneyDocument,
  responsibilityId: string,
  patch: Partial<Omit<Responsibility, 'id' | 'journeyId' | 'createdAt'>>,
  now = new Date().toISOString(),
): JourneyDocument {
  return normalizeJourney({
    ...journey,
    profile: { ...journey.profile, updatedAt: now },
    responsibilities: journey.responsibilities.map((item) => item.id === responsibilityId
      ? { ...item, ...patch, id: item.id, journeyId: journey.profile.id, createdAt: item.createdAt, updatedAt: now }
      : item),
  }, now, journey.profile.id);
}

export function deleteResponsibility(
  journey: JourneyDocument,
  responsibilityId: string,
  now = new Date().toISOString(),
): JourneyDocument {
  return normalizeJourney({
    ...journey,
    profile: { ...journey.profile, updatedAt: now },
    responsibilities: journey.responsibilities.filter((item) => item.id !== responsibilityId),
  }, now, journey.profile.id);
}

export function addJourneyEntry(
  journey: JourneyDocument,
  input: { kind: JourneyEntryKind; title: string; note?: string; occursAt: string },
  now = new Date().toISOString(),
  entryId = createItemId('entry'),
): JourneyDocument {
  const title = text(input.title, 160);
  const occursAt = date(input.occursAt);
  if (!title) throw new Error('Timeline entry title is required.');
  if (!occursAt) throw new Error('A valid timeline date is required.');
  if (!ENTRY_KINDS.has(input.kind)) throw new Error('A valid timeline entry type is required.');
  const entry: JourneyEntry = {
    id: entryId,
    journeyId: journey.profile.id,
    kind: input.kind,
    title,
    ...optional('note', text(input.note, 2000)),
    occursAt,
    private: true,
    createdAt: now,
    updatedAt: now,
  };
  return normalizeJourney({
    ...journey,
    profile: { ...journey.profile, updatedAt: now },
    entries: [...journey.entries, entry],
  }, now, journey.profile.id);
}

export function updateJourneyEntry(
  journey: JourneyDocument,
  entryId: string,
  patch: Partial<Omit<JourneyEntry, 'id' | 'journeyId' | 'createdAt'>>,
  now = new Date().toISOString(),
): JourneyDocument {
  return normalizeJourney({
    ...journey,
    profile: { ...journey.profile, updatedAt: now },
    entries: journey.entries.map((item) => item.id === entryId
      ? { ...item, ...patch, id: item.id, journeyId: journey.profile.id, createdAt: item.createdAt, updatedAt: now }
      : item),
  }, now, journey.profile.id);
}

export function deleteJourneyEntry(
  journey: JourneyDocument,
  entryId: string,
  now = new Date().toISOString(),
): JourneyDocument {
  return normalizeJourney({
    ...journey,
    profile: { ...journey.profile, updatedAt: now },
    entries: journey.entries.filter((item) => item.id !== entryId),
  }, now, journey.profile.id);
}

export function getJourney(): JourneyDocument {
  const now = new Date().toISOString();
  let parsed: unknown;
  try {
    const primary = localStorage.getItem(JOURNEY_STORAGE_KEY);
    parsed = primary ? JSON.parse(primary) : undefined;
  } catch {
    parsed = undefined;
  }
  if (parsed === undefined) {
    try {
      const shadow = localStorage.getItem(`${JOURNEY_STORAGE_KEY}::shadow`);
      parsed = shadow ? JSON.parse(shadow) : undefined;
    } catch {
      parsed = undefined;
    }
  }
  const normalized = normalizeJourney(parsed, now);
  saveJourney(normalized);
  return normalized;
}

export function saveJourney(value: JourneyDocument): JourneyDocument {
  const normalized = normalizeJourney(value, new Date().toISOString(), value.profile.id);
  const json = JSON.stringify(normalized);
  try {
    localStorage.setItem(JOURNEY_STORAGE_KEY, json);
    try { localStorage.setItem(`${JOURNEY_STORAGE_KEY}::shadow`, json); } catch { /* best effort */ }
  } catch { /* existing in-memory data remains usable */ }
  return normalized;
}

function createJourneyId(): string {
  try {
    return `journey-${crypto.randomUUID()}`;
  } catch {
    return `journey-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  }
}

function createItemId(prefix: string): string {
  try {
    return `${prefix}-${crypto.randomUUID()}`;
  } catch {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  }
}
