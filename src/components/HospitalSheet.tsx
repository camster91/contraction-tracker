// Cervical exam log sheet — "Hospital" tab in the header.
import { useState } from 'react';
import { X, Plus, Trash2, Stethoscope } from 'lucide-react';
import { toast } from '../lib/toast';
import { addExam, deleteExam, getExams, type CervicalExam } from '../lib/hospital';
import { isHour12Preferred } from '../lib/contractions';
import { useModalDialog } from '../hooks/useModalDialog';

type Props = {
  sessionId: string;
  onClose: () => void;
};

const STATION_OPTIONS = [-3, -2, -1, 0, +1, +2, +3];

export default function HospitalSheet({ sessionId, onClose }: Props) {
  const dialogRef = useModalDialog(onClose);
  const [exams, setExams] = useState<CervicalExam[]>(() => getExams(sessionId));
  const [adding, setAdding] = useState(false);
  const [dilation, setDilation] = useState<number | null>(null);
  const [effacement, setEffacement] = useState<number | null>(null);
  const [station, setStation] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  const validMeasurement = (value: number | null, min: number, max: number) => value === null || (Number.isFinite(value) && value >= min && value <= max);
  const canSave = (dilation !== null || effacement !== null || station !== null || !!notes.trim())
    && validMeasurement(dilation, 0, 10) && validMeasurement(effacement, 0, 100) && validMeasurement(station, -3, 3);
  const startAdding = () => {
    setDilation(null); setEffacement(null); setStation(null); setNotes(''); setAdding(true);
  };

  const handleAdd = () => {
    if (!canSave) return;
    const exam = addExam(sessionId, {
      time: new Date().toISOString(),
      dilationCm: dilation,
      effacementPct: effacement,
      station,
      notes: notes.trim() || undefined,
    });
    if (!exam) { toast.error('Could not save this exam. Free up space and try again.'); return; }
    setExams(getExams(sessionId));
    setAdding(false);
    setNotes('');
  };

  const handleDelete = (id: string) => {
    deleteExam(sessionId, id);
    setExams(getExams(sessionId));
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
        aria-label="Exams"
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-ink-200/30 bg-plum-950/98  shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.6)] max-h-[85dvh] flex flex-col animate-slide-up"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-8 h-1 rounded-full bg-ink-200/40" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-300/15 flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-rose-300" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-base font-semibold text-ink-50 font-display">Exams</div>
              <div className="text-[11px] text-ink-400 mt-0.5">
                {exams.length === 0 ? 'No exams logged' : `${exams.length} exam${exams.length === 1 ? '' : 's'} logged`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!adding && (
              <button
                onClick={startAdding}
                className="text-xs text-rose-300 active:text-rose-200 font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-lg active:bg-rose-300/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Log exam
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-ink-400 active:text-ink-200 rounded-xl active:bg-ink-100/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Add exam form */}
        {adding && (
          <div className="mx-5 mb-3 rounded-2xl border border-ink-200/30 bg-ink-100/5 p-4 space-y-3">
            <div className="text-sm font-semibold text-ink-50 font-display">New exam</div>

            <p className="text-xs text-ink-300">Enter only measurements reported to you. Leave anything unknown blank.</p>
            <label className="block text-sm text-ink-300">
              Dilation (cm)
              <input type="number" inputMode="decimal" min={0} max={10} step={0.5}
                value={dilation ?? ''} onChange={event => setDilation(event.target.value === '' ? null : Number(event.target.value))}
                placeholder="Not recorded" className="mt-1 w-full min-h-11 rounded-xl bg-ink-100/5 border border-ink-200/30 px-3 text-base text-ink-50" />
            </label>
            <label className="block text-sm text-ink-300">
              Effacement (%)
              <input type="number" inputMode="numeric" min={0} max={100} step={1}
                value={effacement ?? ''} onChange={event => setEffacement(event.target.value === '' ? null : Number(event.target.value))}
                placeholder="Not recorded" className="mt-1 w-full min-h-11 rounded-xl bg-ink-100/5 border border-ink-200/30 px-3 text-base text-ink-50" />
            </label>
            <label className="block text-sm text-ink-300">
              Station
              <select value={station ?? ''} onChange={event => setStation(event.target.value === '' ? null : Number(event.target.value))}
                className="mt-1 w-full min-h-11 rounded-xl bg-plum-950 border border-ink-200/30 px-3 text-base text-ink-50">
                <option value="">Not recorded</option>
                {STATION_OPTIONS.map(value => <option key={value} value={value}>{value > 0 ? `+${value}` : value}</option>)}
              </select>
            </label>

            {/* Notes */}
            <label className="block text-sm text-ink-300">Notes (optional)
            <input
              type="text"
              placeholder="Notes (fetal position, anything else...)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-ink-100/5 border border-ink-200/30 rounded-xl px-3 py-2 text-base text-ink-50 placeholder-ink-400 focus:outline-none focus:border-rose-300/50"
            />
            </label>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setAdding(false)}
                className="flex-1 text-xs bg-ink-100/5 active:bg-ink-100/10 border border-ink-200/30 text-ink-200 rounded-xl py-2 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!canSave}
                className="flex-1 min-h-11 text-sm bg-rose-300 active:bg-rose-400 text-plum-950 rounded-xl py-2 font-semibold transition-colors disabled:opacity-40"
              >
                Save exam
              </button>
            </div>
          </div>
        )}

        {/* Exams list */}
        <div className="px-5 pb-6">
          {exams.length === 0 && !adding && (
            <div className="text-center py-8">
              <div className="text-sm text-ink-400">No exams logged yet.</div>
              <div className="text-xs text-ink-500 mt-1">Tap "Log exam" when the nurse checks you.</div>
            </div>
          )}
          {[...exams].reverse().map((exam) => {
            const time = new Date(exam.time);
            return (
              <div
                key={exam.id}
                className="mb-3 rounded-2xl border border-ink-200/30 bg-ink-100/5 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display text-lg font-medium text-ink-50">
                      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: isHour12Preferred() })}
                    </div>
                    <div className="text-[10px] text-ink-500 mt-0.5">
                      {time.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(exam.id)}
                    className="p-1.5 text-ink-400 active:text-rose-300 transition-colors"
                    aria-label="Delete exam"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className={`${exam.dilationCm == null ? 'text-xs' : 'text-2xl font-display font-light'} text-rose-300`}>{exam.dilationCm ?? 'Not recorded'}</div>
                    <div className="text-[9px] uppercase tracking-wider text-ink-500 mt-0.5">cm</div>
                  </div>
                  <div className="text-center">
                    <div className={`${exam.effacementPct == null ? 'text-xs' : 'text-2xl font-display font-light'} text-ink-200`}>{exam.effacementPct == null ? 'Not recorded' : `${exam.effacementPct}%`}</div>
                    <div className="text-[9px] uppercase tracking-wider text-ink-500 mt-0.5">effaced</div>
                  </div>
                  <div className="text-center">
                    <div className={`${exam.station == null ? 'text-xs' : 'text-2xl font-display font-light'} text-ink-200`}>
                      {exam.station == null ? 'Not recorded' : exam.station > 0 ? `+${exam.station}` : exam.station}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-ink-500 mt-0.5">station</div>
                  </div>
                </div>
                {exam.notes && (
                  <div className="mt-2 text-xs text-ink-300 italic">{exam.notes}</div>
                )}
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </>
  );
}
