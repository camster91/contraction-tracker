import type { JourneyDocument } from '../lib/journey';
import type { JourneyView } from './JourneySheet';

export default function JourneyTodayPanel({ journey, onOpen }: {
  journey: JourneyDocument;
  onOpen: (view: JourneyView) => void;
}) {
  const phase = journey.profile.phase;
  const preparing = phase === 'preparing';
  const archived = phase === 'archived';
  const questions = journey.questions.filter(item => !item.askedAt).length;
  const actions: Array<{ label: string; view: JourneyView }> = archived
    ? [{ label: 'View saved journey', view: 'home' }]
    : preparing
      ? [{ label: 'Pregnancy planner', view: 'pregnancy' }, { label: 'Appointments & notes', view: 'appointments' }, { label: questions ? `Provider questions (${questions})` : 'Provider questions', view: 'questions' }]
      : [{ label: 'Recovery & appointments', view: 'timeline' }, { label: 'Ask your care team', view: 'questions' }, { label: 'Support & baby care', view: 'home' }];

  return <section aria-labelledby="journey-today-title" className="mb-3 rounded-2xl border border-sage-300/25 bg-sage-300/5 p-4">
    <h1 id="journey-today-title" className="font-display text-xl text-ink-50">{archived ? 'Your saved journey' : preparing ? 'One step at a time' : 'Take today gently'}</h1>
    <p className="mt-1 mb-3 text-sm text-ink-300">{archived ? 'Review your records or choose a stage in Birth journey.' : preparing ? 'Make room for your questions and plans. No due date needed.' : 'Keep your recovery notes and support here. Baby care is optional in Lull.'}</p>
    <div className="space-y-1">{actions.map(action => <button key={action.view} type="button" onClick={() => onOpen(action.view)} className="block w-full min-h-11 rounded-xl border border-ink-200/25 px-3 py-2 text-left text-sm text-ink-100">{action.label}</button>)}</div>
  </section>;
}
