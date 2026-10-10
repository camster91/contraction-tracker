import { useRef, useState, type FormEvent } from 'react';
import { Check, Pencil, RotateCcw, Trash2, Undo2, X } from 'lucide-react';
import {
  addProviderQuestion,
  deleteProviderQuestion,
  updateProviderQuestion,
  type JourneyDocument,
  type QuestionCategory,
} from '../lib/journey';

const CATEGORIES: Array<{ value: QuestionCategory; label: string }> = [
  { value: 'birth', label: 'Birth' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'feeding', label: 'Feeding' },
  { value: 'medication', label: 'Medication' },
  { value: 'mood', label: 'Mood' },
  { value: 'other', label: 'Other' },
];

export default function ProviderQuestionsPanel({ journey, onChange }: {
  journey: JourneyDocument;
  onChange: (journey: JourneyDocument) => boolean;
}) {
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<QuestionCategory>('other');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editCategory, setEditCategory] = useState<QuestionCategory>('other');
  const [deleted, setDeleted] = useState<{ item: JourneyDocument['questions'][number]; index: number } | null>(null);
  const editButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    if (!onChange(addProviderQuestion(journey, { text: question, category }))) return;
    setQuestion('');
    setCategory('other');
  };

  const beginEdit = (item: JourneyDocument['questions'][number]) => {
    setEditingId(item.id);
    setEditText(item.text);
    setEditCategory(item.category);
  };

  const cancelEdit = () => {
    const previousId = editingId;
    setEditingId(null);
    setEditText('');
    setEditCategory('other');
    if (previousId) requestAnimationFrame(() => editButtonRefs.current[previousId]?.focus());
  };

  const saveEdit = (item: JourneyDocument['questions'][number]) => {
    if (!editText.trim()) return;
    if (!onChange(updateProviderQuestion(journey, item.id, { text: editText, category: editCategory }))) return;
    cancelEdit();
  };

  const remove = (item: JourneyDocument['questions'][number]) => {
    if (!onChange(deleteProviderQuestion(journey, item.id))) return;
    setDeleted({ item, index: journey.questions.findIndex((questionItem) => questionItem.id === item.id) });
    if (editingId === item.id) cancelEdit();
  };

  const undoDelete = () => {
    if (!deleted) return;
    const questions = [...journey.questions];
    const index = Math.max(0, Math.min(deleted.index, questions.length));
    if (!questions.some((item) => item.id === deleted.item.id)) questions.splice(index, 0, deleted.item);
    if (!onChange({ ...journey, profile: { ...journey.profile, updatedAt: new Date().toISOString() }, questions })) return;
    setDeleted(null);
  };

  return (
    <div>
      <h3 className="font-display text-xl text-ink-50">Provider questions</h3>
      <p className="text-sm text-ink-400 leading-relaxed mt-1 mb-4">
        Keep what you want to ask. Olive organizes questions but does not answer them.
      </p>

      {deleted && (
        <div role="status" aria-live="polite" className="mb-3 flex items-center gap-2 rounded-xl border border-ink-200/30 bg-ink-100/5 px-3 py-2 text-xs text-ink-200">
          <span className="min-w-0 flex-1">Question deleted.</span>
          <button type="button" onClick={undoDelete} className="min-h-11 rounded-lg px-2 text-rose-300 font-semibold inline-flex items-center gap-1.5" aria-label="Undo question deletion">
            <Undo2 className="w-3.5 h-3.5" /> Undo
          </button>
          <button type="button" onClick={() => setDeleted(null)} className="min-h-11 min-w-11 rounded-lg text-ink-400" aria-label="Dismiss deletion message"><X className="mx-auto w-4 h-4" /></button>
        </div>
      )}

      <form onSubmit={add} className="rounded-2xl border border-ink-200/25 bg-ink-100/5 p-3 space-y-3">
        <label className="block text-sm text-ink-300">
          Question for your provider
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500}
            className="mt-1 w-full min-h-[76px] bg-plum-950/50 border border-ink-200/30 rounded-xl px-3 py-2 text-base text-ink-50 placeholder:text-ink-500 focus:outline-none focus:border-rose-300/50" />
        </label>
        <label className="block text-sm text-ink-300">
          Question category
          <select value={category} onChange={(event) => setCategory(event.target.value as QuestionCategory)}
            className="mt-1 w-full bg-plum-950 border border-ink-200/30 rounded-xl px-3 py-2 min-h-[44px] text-base text-ink-50">
            {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <button type="submit" disabled={!question.trim()}
          className="w-full min-h-[44px] rounded-xl bg-rose-300 disabled:opacity-50 text-plum-950 text-sm font-semibold px-3 py-2">
          Add question
        </button>
      </form>

      <div className="space-y-2 mt-4">
        {journey.questions.length === 0 && (
          <div className="rounded-xl border border-dashed border-ink-200/25 px-4 py-5 text-center text-xs text-ink-500">
            No questions yet. Questions stay on this device and are included in full backups you choose to export.
          </div>
        )}
        {journey.questions.map((item) => (
          <article key={item.id} aria-label={item.text}
            className={`rounded-xl border px-3 py-3 ${item.askedAt ? 'border-sage-300/25 bg-sage-300/5' : 'border-ink-200/25 bg-ink-100/5'}`}>
            {editingId === item.id ? (
              <form onSubmit={(event) => { event.preventDefault(); saveEdit(item); }} className="space-y-3">
                <label className="block text-sm text-ink-300">
                  Question for your provider
                  <textarea value={editText} onChange={(event) => setEditText(event.target.value)} maxLength={500}
                    autoFocus
                    className="mt-1 w-full min-h-[76px] bg-plum-950/50 border border-ink-200/30 rounded-xl px-3 py-2 text-base text-ink-50 focus:outline-none focus:border-rose-300/50" />
                </label>
                <label className="block text-sm text-ink-300">
                  Question category
                  <select value={editCategory} onChange={(event) => setEditCategory(event.target.value as QuestionCategory)}
                    className="mt-1 w-full bg-plum-950 border border-ink-200/30 rounded-xl px-3 py-2 min-h-[44px] text-base text-ink-50">
                    {CATEGORIES.map((categoryItem) => <option key={categoryItem.value} value={categoryItem.value}>{categoryItem.label}</option>)}
                  </select>
                </label>
                <div className="flex gap-2">
                  <button type="submit" disabled={!editText.trim()} className="flex-1 min-h-11 rounded-xl bg-rose-300 text-plum-950 text-sm font-semibold px-3 py-2">Save question</button>
                  <button type="button" onClick={cancelEdit} className="flex-1 min-h-11 rounded-xl border border-ink-200/30 text-ink-200 text-sm font-semibold px-3 py-2">Cancel</button>
                </div>
              </form>
            ) : <>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className={`text-sm leading-snug ${item.askedAt ? 'text-ink-400 line-through' : 'text-ink-100'}`}>{item.text}</div>
                  <div className="flex gap-2 mt-1.5 text-xs uppercase tracking-wide text-ink-500">
                    <span>{CATEGORIES.find((categoryItem) => categoryItem.value === item.category)?.label}</span>
                    <span>Private</span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <button type="button" ref={(element) => { editButtonRefs.current[item.id] = element; }} onClick={() => beginEdit(item)} className="min-h-11 min-w-11 rounded-lg p-2 text-ink-500 active:text-rose-300" aria-label={`Edit question: ${item.text}`} title="Edit question">
                    <Pencil className="mx-auto w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => remove(item)} className="min-h-11 min-w-11 rounded-lg p-2 text-ink-500 active:text-red-300" aria-label={`Delete question: ${item.text}`} title="Delete question">
                    <Trash2 className="mx-auto w-4 h-4" />
                  </button>
                </div>
              </div>
              <button type="button"
                onClick={() => onChange(updateProviderQuestion(journey, item.id, { askedAt: item.askedAt ? undefined : new Date().toISOString() }))}
                className="mt-3 min-h-11 rounded-lg border border-ink-200/25 px-3 py-1.5 text-xs text-ink-300 flex items-center gap-1.5">
                {item.askedAt ? <RotateCcw className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                {item.askedAt ? 'Reopen question' : 'Mark asked'}
              </button>
            </>}
          </article>
        ))}
      </div>
    </div>
  );
}
