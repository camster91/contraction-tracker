import { useState } from 'react';
import { addProviderQuestion, type JourneyDocument } from '../lib/journey';

const STARTER_QUESTIONS = [
  'Who should I contact if I am worried between appointments?',
  'What should we review about medicines or supplements I am taking?',
  'What appointments or tests should I plan for?',
] as const;

export default function PregnancyPlannerPanel({ journey, onChange, onOpenAppointments, onOpenQuestions, onOpenCareCard, onOpenCarePlan }: {
  journey: JourneyDocument;
  onChange: (journey: JourneyDocument) => boolean;
  onOpenAppointments: () => void;
  onOpenQuestions: () => void;
  onOpenCareCard: () => void;
  onOpenCarePlan: () => void;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const nextAppointment = journey.entries
    .filter(item => item.kind === 'appointment' && !item.completedAt && Date.parse(item.occursAt) >= Date.now())
    .sort((a, b) => Date.parse(a.occursAt) - Date.parse(b.occursAt))[0];
  const openQuestions = journey.questions.filter(item => !item.askedAt).length;
  const actionClass = 'w-full min-h-11 rounded-xl border border-ink-200/30 bg-ink-100/5 px-4 py-3 text-left text-sm text-ink-100';

  const saveQuestion = (question: string) => {
    if (journey.questions.some(item => item.text.trim().toLowerCase() === question.toLowerCase())) return;
    if (!onChange(addProviderQuestion(journey, { text: question }))) {
      setStatus('Could not save this question. It is still here; try again or export a backup.');
      return;
    }
    setStatus('Question saved privately. You can edit it in Provider questions.');
  };

  return <section className="space-y-4" aria-labelledby="pregnancy-planner-title">
    <div>
      <h3 id="pregnancy-planner-title" className="font-display text-xl text-ink-50">Pregnancy planner</h3>
      <p className="text-sm text-ink-300 leading-relaxed mt-2">Newly pregnant, or planning ahead? Start with what is useful to you. A due date and a complete plan are optional.</p>
    </div>
    <div className="rounded-2xl border border-sage-300/25 bg-sage-300/10 p-4">
      <h4 className="font-display text-base text-ink-100">Your first care contact</h4>
      <p className="text-sm text-ink-300 mt-2 mb-3">Arrange pregnancy care with a qualified provider. Save their contact details so you know who to reach between visits.</p>
      <button type="button" className={actionClass} onClick={onOpenCarePlan}>Save care-team contact</button>
    </div>
    <div className="space-y-2">
      <button type="button" className={actionClass} onClick={onOpenAppointments}>
        <span className="block font-semibold">Appointments &amp; notes</span>
        <span className="block text-ink-300 mt-1">{nextAppointment ? `${nextAppointment.title} · ${new Date(nextAppointment.occursAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : 'Add an appointment or call when you have a date.'}</span>
      </button>
      <button type="button" className={actionClass} onClick={onOpenQuestions}>
        <span className="block font-semibold">Provider questions</span>
        <span className="block text-ink-300 mt-1">{openQuestions ? `${openQuestions} question${openQuestions === 1 ? '' : 's'} to bring to your next conversation.` : 'Keep questions here instead of trying to remember them.'}</span>
      </button>
      <button type="button" className={actionClass} onClick={onOpenCareCard}>
        <span className="block font-semibold">Your pregnancy details</span>
        <span className="block text-ink-300 mt-1">Save or update your estimated due date and important notes.</span>
      </button>
    </div>
    <details className="rounded-xl border border-ink-200/25 p-3">
      <summary className="min-h-11 py-3 cursor-pointer text-sm text-ink-100">Ideas for your first conversation</summary>
      <p className="text-sm text-ink-300 my-3">Choose only the questions you want to ask. These are conversation prompts, not answers or a care schedule.</p>
      <div className="space-y-3">{STARTER_QUESTIONS.map(question => {
        const saved = journey.questions.some(item => item.text.trim().toLowerCase() === question.toLowerCase());
        return <div key={question} className="rounded-xl bg-ink-100/5 p-3">
          <p className="text-sm text-ink-100">{question}</p>
          <button type="button" disabled={saved} onClick={() => saveQuestion(question)}
            aria-label={`${saved ? 'Saved' : 'Save question'}: ${question}`}
            className="min-h-11 mt-2 rounded-lg px-3 text-sm text-rose-200 disabled:text-sage-300 disabled:opacity-70">
            {saved ? 'Saved' : 'Save question'}
          </button>
        </div>;
      })}</div>
    </details>
    {status && <p role="status" className="text-sm text-ink-200">{status}</p>}
    <p className="text-sm text-ink-400">General starting guidance: <a href="https://www.canada.ca/en/public-health/services/health-promotion/healthy-pregnancy/healthy-pregnancy-guide.html" target="_blank" rel="noopener noreferrer" className="underline min-h-11 inline-flex items-center">Public Health Agency of Canada</a>. Your provider can help you plan care for your circumstances.</p>
  </section>;
}
