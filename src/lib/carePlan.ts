export type CarePlan = {
  enabled: boolean;
  providerName: string;
  providerPhone: string;
  intervalMinutes: number;
  durationSeconds: number;
  windowMinutes: number;
};

export const DEFAULT_CARE_PLAN: CarePlan = {
  enabled: false,
  providerName: '',
  providerPhone: '',
  intervalMinutes: 5,
  durationSeconds: 60,
  windowMinutes: 60,
};

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function normalizeCarePlan(value: Partial<CarePlan> | null | undefined): CarePlan {
  return {
    enabled: value?.enabled === true,
    providerName: typeof value?.providerName === 'string' ? value.providerName.trim().slice(0, 80) : '',
    providerPhone: typeof value?.providerPhone === 'string' ? value.providerPhone.trim().slice(0, 30) : '',
    intervalMinutes: boundedNumber(value?.intervalMinutes, DEFAULT_CARE_PLAN.intervalMinutes, 2, 15),
    durationSeconds: boundedNumber(value?.durationSeconds, DEFAULT_CARE_PLAN.durationSeconds, 30, 180),
    windowMinutes: boundedNumber(value?.windowMinutes, DEFAULT_CARE_PLAN.windowMinutes, 15, 180),
  };
}
