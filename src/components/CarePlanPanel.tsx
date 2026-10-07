import { useState } from "react";
import type { CarePlan } from "../lib/settings";

export default function CarePlanPanel({
  carePlan,
  onCarePlanChange,
}: {
  carePlan: CarePlan;
  onCarePlanChange: (value: CarePlan) => void;
}) {
  const [reminder, setReminder] = useState(() => ({
    enabled: carePlan.enabled,
    interval: carePlan.enabled ? String(carePlan.intervalMinutes) : "",
    duration: carePlan.enabled ? String(carePlan.durationSeconds) : "",
    window: carePlan.enabled ? String(carePlan.windowMinutes) : "",
  }));
  const [reminderStatus, setReminderStatus] = useState("");
  const reminderValid = [
    [reminder.interval, 2, 15],
    [reminder.duration, 30, 180],
    [reminder.window, 15, 180],
  ].every(
    ([value, min, max]) =>
      String(value).trim() !== "" &&
      Number.isInteger(Number(value)) &&
      Number(value) >= Number(min) &&
      Number(value) <= Number(max),
  );
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.12em] text-ink-300 font-semibold mb-1.5">
        Care-plan reminder
      </div>
      <p className="text-xs text-ink-300 leading-relaxed mb-3">
        Save the timing instructions given by your care team. Olive reports
        observed timing only and does not diagnose labor.
      </p>
      <label
        htmlFor="care-provider-input"
        className="block text-[11px] text-ink-300 mb-1"
      >
        Care provider or team
      </label>
      <input
        id="care-provider-input"
        type="text"
        value={carePlan.providerName}
        onChange={(event) =>
          onCarePlanChange({ ...carePlan, providerName: event.target.value })
        }
        placeholder="e.g. North Star Midwives"
        maxLength={80}
        className="w-full bg-ink-100/5 border border-ink-200/30 rounded-xl px-3 py-2 text-base text-ink-50 placeholder:text-ink-500 focus:outline-none focus:border-rose-300/50"
      />
      <label
        htmlFor="care-provider-phone"
        className="block text-[11px] text-ink-300 mb-1 mt-3"
      >
        Care provider phone
      </label>
      <input
        id="care-provider-phone"
        type="tel"
        inputMode="tel"
        value={carePlan.providerPhone}
        onChange={(event) =>
          onCarePlanChange({ ...carePlan, providerPhone: event.target.value })
        }
        placeholder="e.g. +1 416 555 0142"
        maxLength={30}
        className="w-full bg-ink-100/5 border border-ink-200/30 rounded-xl px-3 py-2 text-base text-ink-50 placeholder:text-ink-500 focus:outline-none focus:border-rose-300/50"
      />
      <p className="text-sm text-ink-200 mt-3">
        Enter only instructions your care team gave you. No timing values are
        recommended by Olive.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
        <CarePlanNumberField
          id="care-plan-interval"
          label="Contractions every (minutes)"
          value={reminder.interval}
          min={2}
          max={15}
          onChange={(interval) => {
            setReminder({ ...reminder, interval });
            setReminderStatus("");
          }}
        />
        <CarePlanNumberField
          id="care-plan-duration"
          label="Lasting at least (seconds)"
          value={reminder.duration}
          min={30}
          max={180}
          onChange={(duration) => {
            setReminder({ ...reminder, duration });
            setReminderStatus("");
          }}
        />
        <CarePlanNumberField
          id="care-plan-window"
          label="For at least (minutes)"
          value={reminder.window}
          min={15}
          max={180}
          onChange={(window) => {
            setReminder({ ...reminder, window });
            setReminderStatus("");
          }}
        />
      </div>
      <label className="flex items-center gap-3 min-h-11 py-3 text-sm text-ink-100">
        <input
          type="checkbox"
          checked={reminder.enabled}
          onChange={(event) => {
            setReminder({ ...reminder, enabled: event.target.checked });
            setReminderStatus("");
          }}
        />
        Enable my saved care-team timing reminder
      </label>
      <button
        type="button"
        disabled={reminder.enabled && !reminderValid}
        onClick={() => {
          onCarePlanChange({
            ...carePlan,
            enabled: reminder.enabled,
            ...(reminderValid
              ? {
                  intervalMinutes: Number(reminder.interval),
                  durationSeconds: Number(reminder.duration),
                  windowMinutes: Number(reminder.window),
                }
              : {}),
          });
          setReminderStatus(
            reminder.enabled
              ? "Care-team reminder saved and enabled."
              : "Care-team reminder is off.",
          );
        }}
        className="min-h-11 rounded-xl bg-rose-300 px-4 py-2 text-sm font-semibold text-plum-950 disabled:opacity-50"
      >
        Save reminder
      </button>
      {reminder.enabled && !reminderValid && (
        <p className="mt-2 text-sm text-ink-200">
          Complete all three fields within the listed ranges before enabling.
        </p>
      )}
      {reminderStatus && (
        <p role="status" className="mt-2 text-sm text-sage-300">
          {reminderStatus}
        </p>
      )}
    </div>
  );
}

function CarePlanNumberField({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  min: number;
  max: number;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="text-xs text-ink-300 leading-tight">
      <span className="block">
        {label} · {min}–{max}
      </span>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full min-h-11 bg-ink-100/5 border border-ink-200/30 rounded-lg px-2 py-2 text-base text-ink-50 focus:outline-none focus:border-rose-300/50"
      />
    </label>
  );
}
