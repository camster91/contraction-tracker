// User settings persistence. Each setting is an independent key so adding
// a new setting doesn't risk wiping the others. All settings have safe
// defaults that work on first launch.

import { load, save } from './storage';

const KEYS = {
  BIG_TEXT: 'contraction-tracker:big-text',
  MUTE_SCHEDULE: 'contraction-tracker:mute-schedule',
  CARE_PLAN: 'contraction-tracker:care-plan',
} as const;

import { DEFAULT_CARE_PLAN, normalizeCarePlan, type CarePlan } from './carePlan.ts';
export { DEFAULT_CARE_PLAN, normalizeCarePlan, type CarePlan };

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
