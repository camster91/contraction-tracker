import { useRef, useState, type FormEvent } from 'react';
import { Check, Pencil, RotateCcw, Trash2, Undo2, X } from 'lucide-react';
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
  onChange: (journey: JourneyDocument) => boolean;
}) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<JourneyEntryKind>('appointment');
  const [occursAt, setOccursAt] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editKind, setEditKind] = useState<JourneyEntryKind>('appointment');
  const [editOccursAt, setEditOccursAt] = useState('');
  const [deleted, setDeleted] = useState<{ item: JourneyDocument['entries'][number]; index: number } | null>(null);
  const editButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !occursAt) return;
    if (!onChange(addJourneyEntry(journey, { title, kind, occursAt }))) return;
    setTitle('');
    setOccursAt('');
  };

  const toLocalDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const formatEntryDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const today = new Date();
    const isToday = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
    const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return isToday ? `Today · ${time}` : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  };

  const beginEdit = (item: JourneyDocument['entries'][number]) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditKind(item.kind);
    setEditOccursAt(toLocalDateTime(item.occursAt));
  };

  const cancelEdit = () => {
    const previousId = editingId;
    setEditingId(null);
    setEditTitle('');
    setEditKind('appointment');
    setEditOccursAt('');
    if (previousId) requestAnimationFrame(() => editButtonRefs.current[previousId]?.focus());
  };

  const saveEdit = (item: JourneyDocument['entries'][number]) => {
    if (!editTitle.trim() || !editOccursAt) return;
    if (!onChange(updateJourneyEntry(journey, item.id, { title: editTitle, kind: editKind, occursAt: editOccursAt }))) return;
    cancelEdit();
  };

  const remove = (item: JourneyDocument['entries'][number]) => {
    if (!onChange(deleteJourneyEntry(journey, item.id))) return;
    setDeleted({ item, index: journey.entries.findIndex((entry) => entry.id === item.id) });
    if (editingId === item.id) cancelEdit();
  };

  const undoDelete = () => {
    if (!deleted) return;
    const entries = [...journey.entries];
    const index = Math.max(0, Math.min(deleted.index, entries.length));
    if (!entries.some((item) => item.id === deleted.item.id)) entries.splice(index, 0, deleted.item);
    if (!onChange({ ...journey, profile: { ...journey.profile, updatedAt: new Date().toISOString() }, entries })) return;
    setDeleted(null);
  };

  const sortedEntries = [...journey.entries].sort((a, b) => {
    const aTime = Date.parse(a.occursAt);
    const bTime = Date.parse(b.occursAt);
    const aUpcoming = aTime >= Date.now();
    const bUpcoming = bTime >= Date.now();
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    return aUpcoming ? aTime - bTime : bTime - aTime;
  });

  return (
    <div>
      <h3 className="font-display text-xl text-ink-50">First 12 weeks</h3>
      <p className="text-sm text-ink-400 leading-relaxed mt-1 mb-4">
        A private timeline for logistics and your own notes. Olive does not score recovery or provide an all-clear.
      </p>
      {deleted && (
        <div role="status" aria-live="polite" className="mb-3 flex items-center gap-2 rounded-xl border border-ink-200/30 bg-ink-100/5 px-3 py-2 text-xs text-ink-200">
          <span className="min-w-0 flex-1">Timeline entry deleted.</span>
          <button type="button" onClick={undoDelete} className="min-h-11 rounded-lg px-2 text-rose-300 font-semibold inline-flex items-center gap-1.5" aria-label="Undo timeline entry deletion">
            <Undo2 className="w-3.5 h-3.5" /> Undo
          </button>
          <button type="button" onClick={() => setDeleted(null)} className="min-h-11 min-w-11 rounded-lg text-ink-400" aria-label="Dismiss deletion message"><X className="mx-auto w-4 h-4" /></button>
        </div>
      )}
      <form onSubmit={add} className="rounded-2xl border border-ink-200/25 bg-ink-100/5 p-3 space-y-3">
        <label className="block text-sm text-ink-300">
          Timeline entry
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160}
            className="mt-1 w-full min-h-[44px] bg-plum-950/50 border border-ink-200/30 rounded-xl px-3 py-2 text-base text-ink-50 focus:outline-none focus:border-rose-300/50" />
        </label>
        <label className="block text-sm text-ink-300">
          Entry type
          <select value={kind} onChange={(event) => setKind(event.target.value as JourneyEntryKind)}
            className="mt-1 w-full min-h-[44px] bg-plum-950 border border-ink-200/30 rounded-xl px-3 py-2 text-base text-ink-50">
            {ENTRY_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="block text-sm text-ink-300">
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
        {sortedEntries.map((item) => (
          <article key={item.id} aria-label={item.title}
            className={`rounded-xl border px-3 py-3 ${item.completedAt ? 'border-sage-300/25 bg-sage-300/5' : 'border-ink-200/25 bg-ink-100/5'}`}>
            {editingId === item.id ? (
              <form onSubmit={(event) => { event.preventDefault(); saveEdit(item); }} className="space-y-3">
                <label className="block text-sm text-ink-300">
                  Timeline entry
                  <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={160}
                    autoFocus
                    className="mt-1 w-full min-h-[44px] bg-plum-950/50 border border-ink-200/30 rounded-xl px-3 py-2 text-base text-ink-50 focus:outline-none focus:border-rose-300/50" />
                </label>
                <label className="block text-sm text-ink-300">
                  Entry type
                  <select value={editKind} onChange={(event) => setEditKind(event.target.value as JourneyEntryKind)}
                    className="mt-1 w-full bg-plum-950 border border-ink-200/30 rounded-xl px-3 py-2 min-h-[44px] text-base text-ink-50">
                    {ENTRY_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </label>
                <label className="block text-sm text-ink-300">
                  Date and time
                  <input type="datetime-local" value={editOccursAt} onChange={(event) => setEditOccursAt(event.target.value)} className="mt-1 w-full min-h-[44px] bg-plum-950 border border-ink-200/30 rounded-xl px-3 py-2 text-base text-ink-50" />
                </label>
                <div className="flex gap-2">
                  <button type="submit" disabled={!editTitle.trim() || !editOccursAt} className="flex-1 min-h-11 rounded-xl bg-rose-300 text-plum-950 text-sm font-semibold px-3 py-2">Save timeline entry</button>
                  <button type="button" onClick={cancelEdit} className="flex-1 min-h-11 rounded-xl border border-ink-200/30 text-ink-200 text-sm font-semibold px-3 py-2">Cancel</button>
                </div>
              </form>
            ) : <>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className={`text-sm ${item.completedAt ? 'text-ink-400 line-through' : 'text-ink-100'}`}>{item.title}</div>
                  <div className="flex flex-wrap gap-2 mt-1.5 text-xs uppercase tracking-wide text-ink-500">
                    <span>{ENTRY_TYPES.find((type) => type.value === item.kind)?.label}</span>
                    <span>{formatEntryDate(item.occursAt)}</span><span>Private</span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <button type="button" ref={(element) => { editButtonRefs.current[item.id] = element; }} onClick={() => beginEdit(item)} className="min-h-11 min-w-11 rounded-lg p-2 text-ink-500 active:text-rose-300" aria-label={`Edit timeline entry: ${item.title}`} title="Edit timeline entry">
                    <Pencil className="mx-auto w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => remove(item)} className="min-h-11 min-w-11 rounded-lg p-2 text-ink-500 active:text-red-300" aria-label={`Delete timeline entry: ${item.title}`} title="Delete timeline entry">
                    <Trash2 className="mx-auto w-4 h-4" />
                  </button>
                </div>
              </div>
              <button type="button"
                onClick={() => onChange(updateJourneyEntry(journey, item.id, { completedAt: item.completedAt ? undefined : new Date().toISOString() }))}
                className="mt-3 min-h-11 rounded-lg border border-ink-200/25 px-3 py-1.5 text-xs text-ink-300 flex items-center gap-1.5">
                {item.completedAt ? <RotateCcw className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                {item.completedAt ? 'Reopen entry' : 'Mark complete'}
              </button>
            </>}
          </article>
        ))}
      </div>
    </div>
  );
}
