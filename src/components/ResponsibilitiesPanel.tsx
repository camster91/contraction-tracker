import { useRef, useState, type FormEvent } from 'react';
import { Check, Pencil, RotateCcw, Trash2, Undo2, X } from 'lucide-react';
import {
  addResponsibility,
  deleteResponsibility,
  updateResponsibility,
  type JourneyDocument,
} from '../lib/journey';
import { getPeople } from '../lib/sessions';

export default function ResponsibilitiesPanel({ journey, onChange }: {
  journey: JourneyDocument;
  onChange: (journey: JourneyDocument) => boolean;
}) {
  const people = getPeople();
  const [title, setTitle] = useState('');
  const [assigneePersonId, setAssigneePersonId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAssigneePersonId, setEditAssigneePersonId] = useState('');
  const [deleted, setDeleted] = useState<{ item: JourneyDocument['responsibilities'][number]; index: number } | null>(null);
  const editButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    if (!onChange(addResponsibility(journey, {
      title,
      assigneePersonId: assigneePersonId || undefined,
      phase: journey.profile.phase,
    }))) return;
    setTitle('');
  };

  const beginEdit = (item: JourneyDocument['responsibilities'][number]) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditAssigneePersonId(item.assigneePersonId ?? '');
  };

  const cancelEdit = () => {
    const previousId = editingId;
    setEditingId(null);
    setEditTitle('');
    setEditAssigneePersonId('');
    if (previousId) requestAnimationFrame(() => editButtonRefs.current[previousId]?.focus());
  };

  const saveEdit = (item: JourneyDocument['responsibilities'][number]) => {
    if (!editTitle.trim()) return;
    if (!onChange(updateResponsibility(journey, item.id, {
      title: editTitle,
      assigneePersonId: editAssigneePersonId || undefined,
    }))) return;
    cancelEdit();
  };

  const remove = (item: JourneyDocument['responsibilities'][number]) => {
    if (!onChange(deleteResponsibility(journey, item.id))) return;
    setDeleted({ item, index: journey.responsibilities.findIndex((responsibility) => responsibility.id === item.id) });
    if (editingId === item.id) cancelEdit();
  };

  const undoDelete = () => {
    if (!deleted) return;
    const responsibilities = [...journey.responsibilities];
    const index = Math.max(0, Math.min(deleted.index, responsibilities.length));
    if (!responsibilities.some((item) => item.id === deleted.item.id)) responsibilities.splice(index, 0, deleted.item);
    if (!onChange({ ...journey, profile: { ...journey.profile, updatedAt: new Date().toISOString() }, responsibilities })) return;
    setDeleted(null);
  };

  return (
    <div>
      <h3 className="font-display text-xl text-ink-50">Responsibilities</h3>
      <p className="text-sm text-ink-400 leading-relaxed mt-1 mb-4">
        Keep practical support visible. Responsibilities stay on this device.
      </p>
      {deleted && (
        <div role="status" aria-live="polite" className="mb-3 flex items-center gap-2 rounded-xl border border-ink-200/30 bg-ink-100/5 px-3 py-2 text-xs text-ink-200">
          <span className="min-w-0 flex-1">Responsibility deleted.</span>
          <button type="button" onClick={undoDelete} className="min-h-11 rounded-lg px-2 text-rose-300 font-semibold inline-flex items-center gap-1.5" aria-label="Undo responsibility deletion">
            <Undo2 className="w-3.5 h-3.5" /> Undo
          </button>
          <button type="button" onClick={() => setDeleted(null)} className="min-h-11 min-w-11 rounded-lg text-ink-400" aria-label="Dismiss deletion message"><X className="mx-auto w-4 h-4" /></button>
        </div>
      )}
      <form onSubmit={add} className="rounded-2xl border border-ink-200/25 bg-ink-100/5 p-3 space-y-3">
        <label className="block text-sm text-ink-300">
          Responsibility
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160}
            className="mt-1 w-full min-h-[44px] bg-plum-950/50 border border-ink-200/30 rounded-xl px-3 py-2 text-base text-ink-50 focus:outline-none focus:border-rose-300/50" />
        </label>
        <label className="block text-sm text-ink-300">
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
              {editingId === item.id ? (
                <form onSubmit={(event) => { event.preventDefault(); saveEdit(item); }} className="space-y-3">
                  <label className="block text-sm text-ink-300">
                    Responsibility
                    <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={160}
                      autoFocus
                      className="mt-1 w-full min-h-[44px] bg-plum-950/50 border border-ink-200/30 rounded-xl px-3 py-2 text-base text-ink-50 focus:outline-none focus:border-rose-300/50" />
                  </label>
                  <label className="block text-sm text-ink-300">
                    Assign to
                    <select value={editAssigneePersonId} onChange={(event) => setEditAssigneePersonId(event.target.value)}
                      className="mt-1 w-full min-h-[44px] bg-plum-950 border border-ink-200/30 rounded-xl px-3 py-2 text-base text-ink-50">
                      <option value="">Unassigned</option>
                      {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                    </select>
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" disabled={!editTitle.trim()} className="flex-1 min-h-11 rounded-xl bg-rose-300 text-plum-950 text-sm font-semibold px-3 py-2">Save responsibility</button>
                    <button type="button" onClick={cancelEdit} className="flex-1 min-h-11 rounded-xl border border-ink-200/30 text-ink-200 text-sm font-semibold px-3 py-2">Cancel</button>
                  </div>
                </form>
              ) : <>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm ${item.completedAt ? 'text-ink-400 line-through' : 'text-ink-100'}`}>{item.title}</div>
                    <div className="flex gap-2 mt-1.5 text-xs uppercase tracking-wide text-ink-500">
                      <span>{assignee?.name ?? 'Unassigned'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button type="button" ref={(element) => { editButtonRefs.current[item.id] = element; }} onClick={() => beginEdit(item)} className="min-h-11 min-w-11 rounded-lg p-2 text-ink-500 active:text-rose-300" aria-label={`Edit responsibility: ${item.title}`} title="Edit responsibility">
                      <Pencil className="mx-auto w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => remove(item)} className="min-h-11 min-w-11 rounded-lg p-2 text-ink-500 active:text-red-300" aria-label={`Delete responsibility: ${item.title}`} title="Delete responsibility">
                      <Trash2 className="mx-auto w-4 h-4" />
                    </button>
                  </div>
                </div>
                <button type="button"
                  onClick={() => onChange(updateResponsibility(journey, item.id, { completedAt: item.completedAt ? undefined : new Date().toISOString() }))}
                  className="mt-3 min-h-11 rounded-lg border border-ink-200/25 px-3 py-1.5 text-xs text-ink-300 flex items-center gap-1.5">
                  {item.completedAt ? <RotateCcw className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                  {item.completedAt ? 'Reopen responsibility' : 'Mark complete'}
                </button>
              </>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
