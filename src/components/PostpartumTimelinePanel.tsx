import { useState, type FormEvent } from 'react';
import { Check, RotateCcw, Trash2 } from 'lucide-react';
import {
  addJourneyEntry,
  deleteJourneyEntry,
  updateJourneyEntry,
  type JourneyDocument,
  type JourneyEntryKind,
} from '../lib/journey';

const ENTRY_TYPES: Array<{ value: JourneyEntryKind; label: string }> = [
  { value: 'appointment', label: 'Appointment or call' },
  { value: 'recovery-note', label: 'Recovery note' },
  { value: 'support', label: 'Support visit or meal' },
  { value: 'question-reminder', label: 'Question reminder' },
  { value: 'milestone', label: 'Personal milestone' },
];

export default function PostpartumTimelinePanel({ journey, onChange }: {
  journey: JourneyDocument;
  onChange: (journey: JourneyDocument) => void;
}) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<JourneyEntryKind>('appointment');
  const [occursAt, setOccursAt] = useState('');

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !occursAt) return;
    onChange(addJourneyEntry(journey, { title, kind, occursAt }));
    setTitle('');
    setOccursAt('');
  };

  return (
    <div>
      <h3 className="font-display text-xl text-ink-50">First 12 weeks</h3>
      <p className="text-[11px] text-ink-400 leading-relaxed mt-1 mb-4">
        A private timeline for logistics and your own notes. Olive does not score recovery or provide an all-clear.
      </p>
      <form onSubmit={add} className="rounded-2xl border border-ink-200/25 bg-ink-100/5 p-3 space-y-3">
        <label className="block text-[11px] text-ink-300">
          Timeline entry
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160}
            className="mt-1 w-full min-h-[44px] bg-plum-950/50 border border-ink-200/30 rounded-xl px-3 py-2 text-base text-ink-50 focus:outline-none focus:border-rose-300/50" />
        </label>
        <label className="block text-[11px] text-ink-300">
          Entry type
          <select value={kind} onChange={(event) => setKind(event.target.value as JourneyEntryKind)}
            className="mt-1 w-full min-h-[44px] bg-plum-950 border border-ink-200/30 rounded-xl px-3 py-2 text-base text-ink-50">
            {ENTRY_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="block text-[11px] text-ink-300">
          Date and time
          <input type="datetime-local" value={occursAt} onChange={(event) => setOccursAt(event.target.value)}
            className="mt-1 w-full min-h-[44px] bg-plum-950 border border-ink-200/30 rounded-xl px-3 py-2 text-base text-ink-50" />
        </label>
        <button type="submit" disabled={!title.trim() || !occursAt}
          className="w-full min-h-[44px] rounded-xl bg-rose-300 disabled:opacity-50 text-plum-950 text-sm font-semibold px-3 py-2">
          Add to timeline
        </button>
      </form>

      <div className="space-y-2 mt-4">
        {journey.entries.length === 0 && (
          <div className="rounded-xl border border-dashed border-ink-200/25 px-4 py-5 text-center text-xs text-ink-500">
            No timeline entries yet. Add only what helps you remember or coordinate care.
          </div>
        )}
        {[...journey.entries].sort((a, b) => a.occursAt.localeCompare(b.occursAt)).map((item) => (
          <article key={item.id} aria-label={item.title}
            className={`rounded-xl border px-3 py-3 ${item.completedAt ? 'border-sage-300/25 bg-sage-300/5' : 'border-ink-200/25 bg-ink-100/5'}`}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className={`text-sm ${item.completedAt ? 'text-ink-400 line-through' : 'text-ink-100'}`}>{item.title}</div>
                <div className="flex flex-wrap gap-2 mt-1.5 text-[10px] uppercase tracking-wide text-ink-500">
                  <span>{ENTRY_TYPES.find((type) => type.value === item.kind)?.label}</span>
                  <span>{new Date(item.occursAt).toLocaleString()}</span><span>Private</span>
                </div>
              </div>
              <button type="button" onClick={() => onChange(deleteJourneyEntry(journey, item.id))}
                className="p-2 text-ink-500 active:text-red-300" aria-label={`Delete timeline entry: ${item.title}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <button type="button"
              onClick={() => onChange(updateJourneyEntry(journey, item.id, { completedAt: item.completedAt ? undefined : new Date().toISOString() }))}
              className="mt-3 min-h-[36px] rounded-lg border border-ink-200/25 px-3 py-1.5 text-xs text-ink-300 flex items-center gap-1.5">
              {item.completedAt ? <RotateCcw className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
              {item.completedAt ? 'Reopen entry' : 'Mark complete'}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
