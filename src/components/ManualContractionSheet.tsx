import { useMemo, useState } from 'react';
import { Clock3, X } from 'lucide-react';
import { useModalDialog } from '../hooks/useModalDialog';
import { t } from '../lib/i18n';

type Props = {
  onClose: () => void;
  onSave: (start: string, end: string) => void;
};

function toLocalInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function ManualContractionSheet({ onClose, onSave }: Props) {
  const dialogRef = useModalDialog(onClose);
  const defaults = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 60_000);
    return { start: toLocalInput(start), end: toLocalInput(end) };
  }, []);
  const [startValue, setStartValue] = useState(defaults.start);
  const [endValue, setEndValue] = useState(defaults.end);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const start = new Date(startValue);
    const end = new Date(endValue);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      setError(t('manual.invalidTimes'));
      return;
    }
    if (end.getTime() <= start.getTime()) {
      setError(t('manual.endBeforeStart'));
      return;
    }
    if (end.getTime() > Date.now() + 60_000) {
      setError(t('manual.futureEnd'));
      return;
    }
    if (end.getTime() - start.getTime() > 4 * 60 * 60_000) {
      setError(t('manual.tooLong'));
      return;
    }
    onSave(start.toISOString(), end.toISOString());
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={t('manual.title')} tabIndex={-1} className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-3xl border-t border-ink-200/30 bg-plum-950 px-5 pb-8 pt-4">
        <div className="mx-auto max-w-md">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2 font-display text-lg text-ink-50"><Clock3 className="h-5 w-5 text-rose-300" /> {t('manual.title')}</div>
            <button onClick={onClose} className="min-h-11 min-w-11 rounded-xl text-ink-300" aria-label={t('manual.close')}><X className="mx-auto h-5 w-5" /></button>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-ink-300">{t('manual.description')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-ink-200">{t('manual.started')}
              <input type="datetime-local" value={startValue} onChange={(event) => { setStartValue(event.target.value); setError(null); }} className="mt-1 min-h-12 w-full rounded-xl border border-ink-200/30 bg-ink-100/5 px-3 text-base text-ink-50" />
            </label>
            <label className="text-sm text-ink-200">{t('manual.ended')}
              <input type="datetime-local" value={endValue} onChange={(event) => { setEndValue(event.target.value); setError(null); }} className="mt-1 min-h-12 w-full rounded-xl border border-ink-200/30 bg-ink-100/5 px-3 text-base text-ink-50" />
            </label>
          </div>
          {error && <div role="alert" className="mt-3 rounded-xl border border-red-300/30 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</div>}
          <button onClick={handleSave} className="mt-5 min-h-12 w-full rounded-xl bg-rose-300 px-4 text-base font-semibold text-plum-950">{t('manual.save')}</button>
        </div>
      </div>
    </>
  );
}
