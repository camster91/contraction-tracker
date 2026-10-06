// Settings sheet — bottom overlay with theme, time format, quiet hours, backup, and version
import { type Dispatch, type SetStateAction } from 'react';
import { Cog, Moon, Download, Share2, Upload } from 'lucide-react';
import { type CarePlan, type MuteSchedule, isInQuietHours } from '../lib/settings';
import { useModalDialog } from '../hooks/useModalDialog';

interface SettingsSheetProps {
  bigText: boolean;
  setBigTextState: Dispatch<SetStateAction<boolean>>;
  muteSchedule: MuteSchedule;
  setMuteScheduleState: Dispatch<SetStateAction<MuteSchedule>>;
  carePlan: CarePlan;
  onCarePlanChange: (value: CarePlan) => void;
  themeVariant: 'calm' | 'cool';
  setThemeVariant: (v: 'calm' | 'cool') => void;
  hour12: boolean;
  setHour12: (v: boolean) => void;
  handleExportBackup: () => void;
  handleSendVia: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  appVersion: string;
  onClose: () => void;
}

export default function SettingsSheet({
  bigText,
  setBigTextState,
  muteSchedule,
  setMuteScheduleState,
  carePlan,
  onCarePlanChange,
  themeVariant,
  setThemeVariant,
  hour12,
  setHour12,
  handleExportBackup,
  handleSendVia,
  fileInputRef,
  appVersion,
  onClose,
}: SettingsSheetProps) {
  const dialogRef = useModalDialog(onClose);
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-ink-200/30 bg-plum-950/98 backdrop-blur-xl shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.6)] max-h-[85dvh] flex flex-col animate-slide-up"
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-8 h-1 rounded-full bg-ink-200/40" />
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <Cog className="w-4 h-4 text-ink-300" strokeWidth={1.75} />
            <div className="flex-1 text-sm font-semibold text-ink-50 font-display">Settings</div>
            <button type="button" aria-label="Close settings" onClick={onClose} className="min-h-11 min-w-11 rounded-lg text-ink-200">Close</button>
          </div>

          <h2 className="text-base font-display text-ink-50 mb-2">Preferences</h2>
          {/* Big text toggle */}
          <label className="flex items-center justify-between py-2 cursor-pointer">
            <span className="text-sm text-ink-200">Big text</span>
            <button
              role="switch"
              aria-label="Big text"
              aria-checked={bigText}
              onClick={() => setBigTextState((v) => !v)}
                className={`w-10 h-6 rounded-full transition-colors ${bigText ? 'bg-rose-300/60' : 'bg-ink-100/20'}`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-ink-50 shadow transition-transform ${bigText ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </button>
          </label>

          {/* Mute schedule */}
          <div className="border-t border-ink-200/20 mt-2 pt-3">
            <label className="flex items-center justify-between py-2 cursor-pointer">
              <span className="text-sm text-ink-200 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5" /> Quiet hours
              </span>
              <button
                role="switch"
                aria-label="Quiet hours"
                aria-checked={muteSchedule.enabled}
                onClick={() =>
                  setMuteScheduleState((s) => ({ ...s, enabled: !s.enabled }))
                }
                className={`w-10 h-6 rounded-full transition-colors ${muteSchedule.enabled ? 'bg-rose-300/60' : 'bg-ink-100/20'}`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-ink-50 shadow transition-transform ${muteSchedule.enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </label>
            {muteSchedule.enabled && (
              <div className="flex items-center gap-2 mt-2 text-xs text-ink-400">
                <span>From</span>
                <select
                  aria-label="Quiet hours start time"
                  value={muteSchedule.startHour}
                  onChange={(e) =>
                    setMuteScheduleState((s) => ({ ...s, startHour: Number(e.target.value) }))
                  }
                  className="bg-ink-100/10 border border-ink-200/30 rounded px-2 py-1 text-ink-100"
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                  ))}
                </select>
                <span>to</span>
                <select
                  aria-label="Quiet hours end time"
                  value={muteSchedule.endHour}
                  onChange={(e) =>
                    setMuteScheduleState((s) => ({ ...s, endHour: Number(e.target.value) }))
                  }
                  className="bg-ink-100/10 border border-ink-200/30 rounded px-2 py-1 text-ink-100"
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
            )}
            {muteSchedule.enabled && isInQuietHours(muteSchedule) && (
              <div className="text-[10px] text-amber-300 mt-2">
                Quiet hours are active now. Only your saved care-plan reminder will play.
              </div>
            )}
          </div>

          {/* Theme variant */}
          <div className="border-t border-ink-200/20 mt-3 pt-3">
            <div className="text-xs uppercase tracking-[0.12em] text-ink-300 font-semibold mb-2">Theme</div>
            <div className="flex gap-1.5">
              {(['calm', 'cool'] as const).map((v) => (
                <button
                  key={v}
                  aria-pressed={themeVariant === v}
                  onClick={() => setThemeVariant(v)}
                  className={`min-h-11 text-sm px-3 py-2 rounded-lg font-medium transition-colors ${
                    themeVariant === v
                      ? v === 'calm'
                        ? 'bg-rose-300/20 text-rose-200 border border-rose-300/40'
                        : 'bg-blue-300/20 text-blue-200 border border-blue-300/40'
                      : 'bg-ink-100/5 text-ink-400 border border-ink-200/30 active:bg-ink-100/10'
                  }`}
                >
                  {v === 'calm' ? '🌸 Calm' : '❄️ Cool'}
                </button>
              ))}
            </div>
          </div>

          {/* Time format */}
          <div className="mt-3">
            <div className="text-xs uppercase tracking-[0.12em] text-ink-300 font-semibold mb-2">Time</div>
            <div className="flex gap-1.5">
              {([false, true] as const).map((v) => (
                <button
                  key={String(v)}
                  aria-pressed={hour12 === v}
                  onClick={() => setHour12(v)}
                  className={`min-h-11 text-sm px-3 py-2 rounded-lg font-medium transition-colors ${
                    hour12 === v
                      ? 'bg-rose-300/20 text-rose-200 border border-rose-300/40'
                      : 'bg-ink-100/5 text-ink-400 border border-ink-200/30 active:bg-ink-100/10'
                  }`}
                >
                  {v ? '12-hour' : '24-hour'}
                </button>
              ))}
            </div>
          </div>

          {/* Backup section */}
          <div className="border-t border-ink-200/20 mt-3 pt-3">
            <div className="text-xs uppercase tracking-[0.12em] text-ink-300 font-semibold mb-2">Backup</div>
            <div className="space-y-2">
              <button
                onClick={handleExportBackup}
                className="w-full text-left text-sm text-ink-200 bg-ink-100/5 active:bg-ink-100/10 border border-ink-200/30 rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-sage-300" strokeWidth={1.75} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">Export backup</div>
                  <div className="text-xs text-ink-300">Download .json file</div>
                </div>
              </button>
              <button
                onClick={handleSendVia}
                className="w-full text-left text-sm text-ink-200 bg-ink-100/5 active:bg-ink-100/10 border border-ink-200/30 rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors"
              >
                <Share2 className="w-4 h-4 text-rose-300" strokeWidth={1.75} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">Send via…</div>
                  <div className="text-xs text-ink-300">AirDrop, message, email</div>
                </div>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-left text-sm text-ink-200 bg-ink-100/5 active:bg-ink-100/10 border border-ink-200/30 rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4 text-sage-300" strokeWidth={1.75} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">Import from backup</div>
                  <div className="text-xs text-ink-300">Restore from .json file</div>
                </div>
              </button>
            </div>
          </div>

          <div className="border-t border-ink-200/20 mt-3 pt-3">
            <div className="text-xs uppercase tracking-[0.12em] text-ink-300 font-semibold mb-1.5">
              Care-plan reminder
            </div>
            <p className="text-xs text-ink-300 leading-relaxed mb-3">
              Save the timing instructions given by your care team. Olive reports observed timing only and does not diagnose labor.
            </p>
            <label htmlFor="care-provider-input" className="block text-[11px] text-ink-300 mb-1">
              Care provider or team
            </label>
            <input
              id="care-provider-input"
              type="text"
              value={carePlan.providerName}
              onChange={(event) => onCarePlanChange({ ...carePlan, providerName: event.target.value })}
              placeholder="e.g. North Star Midwives"
              maxLength={80}
              className="w-full bg-ink-100/5 border border-ink-200/30 rounded-xl px-3 py-2 text-sm text-ink-50 placeholder:text-ink-500 focus:outline-none focus:border-rose-300/50"
            />
            <label htmlFor="care-provider-phone" className="block text-[11px] text-ink-300 mb-1 mt-3">
              Care provider phone
            </label>
            <input
              id="care-provider-phone"
              type="tel"
              inputMode="tel"
              value={carePlan.providerPhone}
              onChange={(event) => onCarePlanChange({ ...carePlan, providerPhone: event.target.value })}
              placeholder="e.g. +1 416 555 0142"
              maxLength={30}
              className="w-full bg-ink-100/5 border border-ink-200/30 rounded-xl px-3 py-2 text-base text-ink-50 placeholder:text-ink-500 focus:outline-none focus:border-rose-300/50"
            />
            <label className="flex items-center gap-3 py-3">
              <input type="checkbox" checked={carePlan.enabled}
                onChange={(event) => onCarePlanChange({ ...carePlan, enabled: event.target.checked })} />
              Enable my saved care-team timing reminder
            </label>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <CarePlanNumberField
                id="care-plan-interval"
                label="Contractions every (minutes)"
                value={carePlan.intervalMinutes}
                min={2}
                max={15}
                onChange={(value) => onCarePlanChange({ ...carePlan, intervalMinutes: value })}
              />
              <CarePlanNumberField
                id="care-plan-duration"
                label="Lasting at least (seconds)"
                value={carePlan.durationSeconds}
                min={30}
                max={180}
                onChange={(value) => onCarePlanChange({ ...carePlan, durationSeconds: value })}
              />
              <CarePlanNumberField
                id="care-plan-window"
                label="For at least (minutes)"
                value={carePlan.windowMinutes}
                min={15}
                max={180}
                onChange={(value) => onCarePlanChange({ ...carePlan, windowMinutes: value })}
              />
            </div>
            <div className="mt-2 text-[10px] text-sage-300">
              Every {carePlan.intervalMinutes} min · lasting {carePlan.durationSeconds} sec · for {carePlan.windowMinutes} min
            </div>
          </div>

          {/* Version */}
          <div className="border-t border-ink-200/20 mt-3 pt-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-xs uppercase tracking-[0.12em] text-ink-300 font-semibold">App version</div>
                <div className="text-[11px] text-ink-300 mt-0.5">Olive v{appVersion}</div>
              </div>
            </div>
            <div className="text-xs text-ink-300 mt-1.5 text-center">
              Updates arrive through the App Store or Play Store.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function CarePlanNumberField({ id, label, value, min, max, onChange }: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label htmlFor={id} className="text-xs text-ink-300 leading-tight">
      <span className="block min-h-9">{label}</span>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full min-h-11 bg-ink-100/5 border border-ink-200/30 rounded-lg px-2 py-2 text-base text-ink-50 focus:outline-none focus:border-rose-300/50"
      />
    </label>
  );
}
