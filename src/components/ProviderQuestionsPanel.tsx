import { useState, type FormEvent } from 'react';
import { Check, RotateCcw, Trash2 } from 'lucide-react';
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
  onChange: (journey: JourneyDocument) => void;
}) {
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<QuestionCategory>('other');

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    onChange(addProviderQuestion(journey, { text: question, category }));
    setQuestion('');
    setCategory('other');
  };

  return (
    <div>
      <h3 className="font-display text-xl text-ink-50">Provider questions</h3>
      <p className="text-[11px] text-ink-400 leading-relaxed mt-1 mb-4">
        Keep what you want to ask. Olive organizes questions but does not answer them.
      </p>

      <form onSubmit={add} className="rounded-2xl border border-ink-200/25 bg-ink-100/5 p-3 space-y-3">
        <label className="block text-[11px] text-ink-300">
          Question for your provider
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500}
            className="mt-1 w-full min-h-[76px] bg-plum-950/50 border border-ink-200/30 rounded-xl px-3 py-2 text-base text-ink-50 placeholder:text-ink-500 focus:outline-none focus:border-rose-300/50" />
        </label>
        <label className="block text-[11px] text-ink-300">
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
            No questions yet. Questions stay private unless you deliberately include them in a future handoff.
          </div>
        )}
        {journey.questions.map((item) => (
          <article key={item.id} aria-label={item.text}
            className={`rounded-xl border px-3 py-3 ${item.askedAt ? 'border-sage-300/25 bg-sage-300/5' : 'border-ink-200/25 bg-ink-100/5'}`}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className={`text-sm leading-snug ${item.askedAt ? 'text-ink-400 line-through' : 'text-ink-100'}`}>{item.text}</div>
                <div className="flex gap-2 mt-1.5 text-[10px] uppercase tracking-wide text-ink-500">
                  <span>{CATEGORIES.find((categoryItem) => categoryItem.value === item.category)?.label}</span>
                  <span>Private</span>
                </div>
              </div>
              <button type="button" onClick={() => onChange(deleteProviderQuestion(journey, item.id))}
                className="p-2 text-ink-500 active:text-red-300" aria-label={`Delete question: ${item.text}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <button type="button"
              onClick={() => onChange(updateProviderQuestion(journey, item.id, { askedAt: item.askedAt ? undefined : new Date().toISOString() }))}
              className="mt-3 min-h-[36px] rounded-lg border border-ink-200/25 px-3 py-1.5 text-xs text-ink-300 flex items-center gap-1.5">
              {item.askedAt ? <RotateCcw className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
              {item.askedAt ? 'Reopen question' : 'Mark asked'}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
