import { useState, type FormEvent } from 'react';
import { Check, RotateCcw, Trash2 } from 'lucide-react';
import {
  addResponsibility,
  deleteResponsibility,
  updateResponsibility,
  type JourneyDocument,
} from '../lib/journey';
import { getPeople } from '../lib/sessions';

export default function ResponsibilitiesPanel({ journey, onChange }: {
  journey: JourneyDocument;
  onChange: (journey: JourneyDocument) => void;
}) {
  const people = getPeople();
  const [title, setTitle] = useState('');
  const [assigneePersonId, setAssigneePersonId] = useState('');

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    onChange(addResponsibility(journey, {
      title,
      assigneePersonId: assigneePersonId || undefined,
      phase: journey.profile.phase,
    }));
    setTitle('');
  };

  return (
    <div>
      <h3 className="font-display text-xl text-ink-50">Responsibilities</h3>
      <p className="text-[11px] text-ink-400 leading-relaxed mt-1 mb-4">
        Keep practical support visible. Responsibilities stay on this device.
      </p>
      <form onSubmit={add} className="rounded-2xl border border-ink-200/25 bg-ink-100/5 p-3 space-y-3">
        <label className="block text-[11px] text-ink-300">
          Responsibility
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160}
            className="mt-1 w-full min-h-[44px] bg-plum-950/50 border border-ink-200/30 rounded-xl px-3 py-2 text-base text-ink-50 focus:outline-none focus:border-rose-300/50" />
        </label>
        <label className="block text-[11px] text-ink-300">
          Assign to
          <select value={assigneePersonId} onChange={(event) => setAssigneePersonId(event.target.value)}
            className="mt-1 w-full min-h-[44px] bg-plum-950 border border-ink-200/30 rounded-xl px-3 py-2 text-base text-ink-50">
            <option value="">Unassigned</option>
            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </label>
        <button type="submit" disabled={!title.trim()}
          className="w-full min-h-[44px] rounded-xl bg-rose-300 disabled:opacity-50 text-plum-950 text-sm font-semibold px-3 py-2">
          Add responsibility
        </button>
      </form>

      <div className="space-y-2 mt-4">
        {journey.responsibilities.length === 0 && (
          <div className="rounded-xl border border-dashed border-ink-200/25 px-4 py-5 text-center text-xs text-ink-500">
            No responsibilities yet. Add only the practical help that will reduce pressure.
          </div>
        )}
        {journey.responsibilities.map((item) => {
          const assignee = people.find((person) => person.id === item.assigneePersonId);
          return (
            <article key={item.id} aria-label={item.title}
              className={`rounded-xl border px-3 py-3 ${item.completedAt ? 'border-sage-300/25 bg-sage-300/5' : 'border-ink-200/25 bg-ink-100/5'}`}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className={`text-sm ${item.completedAt ? 'text-ink-400 line-through' : 'text-ink-100'}`}>{item.title}</div>
                  <div className="flex gap-2 mt-1.5 text-[10px] uppercase tracking-wide text-ink-500">
                    <span>{assignee?.name ?? 'Unassigned'}</span>
                  </div>
                </div>
                <button type="button" onClick={() => onChange(deleteResponsibility(journey, item.id))}
                  className="p-2 text-ink-500 active:text-red-300" aria-label={`Delete responsibility: ${item.title}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <button type="button"
                onClick={() => onChange(updateResponsibility(journey, item.id, { completedAt: item.completedAt ? undefined : new Date().toISOString() }))}
                className="mt-3 min-h-[36px] rounded-lg border border-ink-200/25 px-3 py-1.5 text-xs text-ink-300 flex items-center gap-1.5">
                {item.completedAt ? <RotateCcw className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                {item.completedAt ? 'Reopen responsibility' : 'Mark complete'}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
