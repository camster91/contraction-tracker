// Settings sheet — bottom overlay with theme, time format, quiet hours, backup, and version
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Cog, Moon, Download, Share2, Upload } from 'lucide-react';
import { type MuteSchedule, isInQuietHours } from '../lib/settings';
import { getHostName, setHostName } from '../lib/sessions';
import { useModalDialog } from '../hooks/useModalDialog';

interface SettingsSheetProps {
  bigText: boolean;
  setBigTextState: Dispatch<SetStateAction<boolean>>;
  muteSchedule: MuteSchedule;
  setMuteScheduleState: Dispatch<SetStateAction<MuteSchedule>>;
  themeVariant: 'calm' | 'cool';
  setThemeVariant: (v: 'calm' | 'cool') => void;
  hour12: boolean;
  setHour12: (v: boolean) => void;
  handleExportBackup: () => void;
  handleSendVia: () => void;
  handleAppUpdate: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  appVersion: string;
  onClose: () => void;
}

export default function SettingsSheet({
  bigText,
  setBigTextState,
  muteSchedule,
  setMuteScheduleState,
  themeVariant,
  setThemeVariant,
  hour12,
  setHour12,
  handleExportBackup,
  handleSendVia,
  handleAppUpdate,
  fileInputRef,
  appVersion,
  onClose,
}: SettingsSheetProps) {
  const dialogRef = useModalDialog(onClose);
  // Host display name (separate from props — owned by this sheet
  // because it's a write-target for the host, not a global state).
  // The partner view shows this name as the author of all host
  // posts. Default 'Host' (see getHostName helper) — the host
  // can change it here to "Bianca" or any name they want their
  // circle to see.
  const [hostName, setHostNameLocal] = useState<string>('');
  useEffect(() => {
    setHostNameLocal(getHostName());
  }, []);
  const handleHostNameChange = (v: string) => {
    const trimmed = v.slice(0, 40);
    setHostNameLocal(trimmed);
    setHostName(trimmed);
  };
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
            <div className="text-sm font-semibold text-ink-50 font-display">Settings</div>
          </div>

          {/* Host display name. The host's posts (status updates,
              baby-is-here) appear in the partner view with this
              name as the author. Default 'Host' (per the getHostName
              helper) — set it to your name so the partner (a parent,
              a sibling, a doula) sees a real person posting. */}
          <div className="mb-3">
            <label
              htmlFor="host-name-input"
              className="block text-[10px] uppercase tracking-[0.15em] text-ink-400 font-semibold mb-1.5"
            >
              Your name (visible to your circle)
            </label>
            <input
              id="host-name-input"
              type="text"
              value={hostName}
              onChange={(e) => handleHostNameChange(e.target.value)}
              placeholder="e.g. Bianca"
              maxLength={40}
              className="w-full bg-ink-100/5 border border-ink-200/30 rounded-xl px-3 py-2 text-sm text-ink-50 placeholder:text-ink-500 focus:outline-none focus:border-rose-300/50"
            />
            <div className="text-[10px] text-ink-500 mt-1">
              Posts from this device will be signed with this name. Leave blank to stay anonymous.
            </div>
          </div>

          {/* Big text toggle */}
          <label className="flex items-center justify-between py-2 cursor-pointer">
            <span className="text-sm text-ink-200">Big text</span>
            <button
              role="switch"
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
                Quiet hours are active now. Only the 5-1-1 alert will play.
              </div>
            )}
          </div>

          {/* Theme variant */}
          <div className="border-t border-ink-200/20 mt-3 pt-3">
            <div className="text-[10px] uppercase tracking-[0.15em] text-ink-400 font-semibold mb-2">Theme</div>
            <div className="flex gap-1.5">
              {(['calm', 'cool'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setThemeVariant(v)}
                  className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors ${
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
            <div className="text-[10px] uppercase tracking-[0.15em] text-ink-400 font-semibold mb-2">Time</div>
            <div className="flex gap-1.5">
              {([false, true] as const).map((v) => (
                <button
                  key={String(v)}
                  onClick={() => setHour12(v)}
                  className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors ${
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
            <div className="text-[10px] uppercase tracking-[0.15em] text-ink-400 font-semibold mb-2">Backup</div>
            <div className="space-y-2">
              <button
                onClick={handleExportBackup}
                className="w-full text-left text-sm text-ink-200 bg-ink-100/5 active:bg-ink-100/10 border border-ink-200/30 rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-sage-300" strokeWidth={1.75} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">Export backup</div>
                  <div className="text-[10px] text-ink-500">Download .json file</div>
                </div>
              </button>
              <button
                onClick={handleSendVia}
                className="w-full text-left text-sm text-ink-200 bg-ink-100/5 active:bg-ink-100/10 border border-ink-200/30 rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors"
              >
                <Share2 className="w-4 h-4 text-rose-300" strokeWidth={1.75} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">Send via…</div>
                  <div className="text-[10px] text-ink-500">AirDrop, message, email</div>
                </div>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-left text-sm text-ink-200 bg-ink-100/5 active:bg-ink-100/10 border border-ink-200/30 rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4 text-sage-300" strokeWidth={1.75} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">Import from backup</div>
                  <div className="text-[10px] text-ink-500">Restore from .json file</div>
                </div>
              </button>
            </div>
          </div>

          {/* Version & update */}
          <div className="border-t border-ink-200/20 mt-3 pt-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[10px] uppercase tracking-[0.15em] text-ink-400 font-semibold">App version</div>
                <div className="text-[11px] text-ink-300 mt-0.5">Olive v{appVersion}</div>
              </div>
            </div>
            <button
              onClick={handleAppUpdate}
              className="w-full bg-rose-300 active:bg-rose-400 text-plum-950 rounded-xl py-2.5 text-sm font-semibold transition-colors"
            >
              Update to latest version
            </button>
            <div className="text-[9px] text-ink-600 mt-1.5 text-center">
              Clears old cache and loads the newest version. Your data is safe.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
