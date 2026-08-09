// User settings persistence. Each setting is an independent key so adding
// a new setting doesn't risk wiping the others. All settings have safe
// defaults that work on first launch.

import { load, save } from './storage';

const KEYS = {
  BIG_TEXT: 'contraction-tracker:big-text',
  MUTE_SCHEDULE: 'contraction-tracker:mute-schedule',
  CARE_PLAN: 'contraction-tracker:care-plan',
} as const;

export type CarePlan = {
  providerName: string;
  providerPhone: string;
  intervalMinutes: number;
  durationSeconds: number;
  windowMinutes: number;
};

export const DEFAULT_CARE_PLAN: CarePlan = {
  providerName: '',
  providerPhone: '',
  intervalMinutes: 5,
  durationSeconds: 60,
  windowMinutes: 60,
};

export type MuteSchedule = {
  enabled: boolean;
  startHour: number;  // 0-23
  endHour: number;    // 0-23 (exclusive)
};

export const DEFAULT_MUTE_SCHEDULE: MuteSchedule = {
  enabled: false,
  startHour: 23,
  endHour: 6,
};

// ---- Big text mode ----

export function isBigText(): boolean {
  return load<boolean>(KEYS.BIG_TEXT, false);
}

export function setBigText(value: boolean) {
  save(KEYS.BIG_TEXT, value);
}

// ---- Mute schedule ----

export function getMuteSchedule(): MuteSchedule {
  return load<MuteSchedule>(KEYS.MUTE_SCHEDULE, DEFAULT_MUTE_SCHEDULE);
}

export function setMuteSchedule(value: MuteSchedule) {
  save(KEYS.MUTE_SCHEDULE, value);
}

// ---- Care-plan reminder ----

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function normalizeCarePlan(value: Partial<CarePlan> | null | undefined): CarePlan {
  return {
    providerName: typeof value?.providerName === 'string' ? value.providerName.trim().slice(0, 80) : '',
    providerPhone: typeof value?.providerPhone === 'string' ? value.providerPhone.trim().slice(0, 30) : '',
    intervalMinutes: boundedNumber(value?.intervalMinutes, DEFAULT_CARE_PLAN.intervalMinutes, 2, 15),
    durationSeconds: boundedNumber(value?.durationSeconds, DEFAULT_CARE_PLAN.durationSeconds, 30, 180),
    windowMinutes: boundedNumber(value?.windowMinutes, DEFAULT_CARE_PLAN.windowMinutes, 15, 180),
  };
}

export function getCarePlan(): CarePlan {
  return normalizeCarePlan(load<Partial<CarePlan>>(KEYS.CARE_PLAN, DEFAULT_CARE_PLAN));
}

export function setCarePlan(value: CarePlan): void {
  save(KEYS.CARE_PLAN, normalizeCarePlan(value));
}

/** Returns true if the current local hour falls within the quiet hours window. */
export function isInQuietHours(schedule: MuteSchedule = getMuteSchedule(), now: Date = new Date()): boolean {
  if (!schedule.enabled) return false;
  const h = now.getHours();
  if (schedule.startHour === schedule.endHour) return false;
  if (schedule.startHour < schedule.endHour) {
    return h >= schedule.startHour && h < schedule.endHour;
  }
  // Wraps midnight (e.g. 23 → 6)
  return h >= schedule.startHour || h < schedule.endHour;
}
