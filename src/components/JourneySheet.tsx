import { useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Heart, HelpCircle, IdCard, ListChecks, X } from 'lucide-react';
import { useModalDialog } from '../hooks/useModalDialog';
import { type JourneyDocument, type JourneyPhase } from '../lib/journey';
import { journeyMessages } from '../messages/en';
import CareCardPanel from './CareCardPanel';
import ProviderQuestionsPanel from './ProviderQuestionsPanel';
import ResponsibilitiesPanel from './ResponsibilitiesPanel';
import PostpartumTimelinePanel from './PostpartumTimelinePanel';

const PHASES: Array<{ value: JourneyPhase; label: string }> = [
  { value: 'preparing', label: 'Preparing' },
  { value: 'labor', label: 'Labor' },
  { value: 'postpartum', label: 'Postpartum' },
  { value: 'archived', label: 'Archived' },
];

type View = 'home' | 'care' | 'questions' | 'responsibilities' | 'timeline';

export default function JourneySheet({ journey, onJourneyChange, onPhaseChange, onClose }: {
  journey: JourneyDocument;
  onJourneyChange: (journey: JourneyDocument) => void;
  onPhaseChange: (phase: JourneyPhase) => void;
  onClose: () => void;
}) {
  const dialogRef = useModalDialog(onClose);
  const [view, setView] = useState<View>('home');
  const message = journeyMessages[journey.profile.phase];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Birth journey" tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-ink-200/30 bg-plum-950/98 backdrop-blur-xl shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.6)] max-h-[90dvh] flex flex-col animate-slide-up">
        <div className="flex justify-center pt-3 pb-2"><div className="w-8 h-1 rounded-full bg-ink-200/40" /></div>
        <div className="overflow-y-auto px-5 pb-7">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              {view !== 'home' && (
                <button type="button" onClick={() => setView('home')} className="p-2 -ml-2 text-ink-300" aria-label="Back to birth journey">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <Heart className="w-4 h-4 text-rose-300" />
              <h2 className="font-display text-lg text-ink-50">Birth journey</h2>
            </div>
            <button type="button" onClick={onClose} className="p-2 text-ink-300" aria-label="Close birth journey"><X className="w-5 h-5" /></button>
          </div>

          {view === 'care' && <CareCardPanel journey={journey} onChange={onJourneyChange} />}
          {view === 'questions' && <ProviderQuestionsPanel journey={journey} onChange={onJourneyChange} />}
          {view === 'responsibilities' && <ResponsibilitiesPanel journey={journey} onChange={onJourneyChange} />}
          {view === 'timeline' && <PostpartumTimelinePanel journey={journey} onChange={onJourneyChange} />}

          {view === 'home' && (
            <>
              <div className="rounded-2xl border border-sage-300/25 bg-sage-300/10 px-4 py-4 mb-5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-sage-300 font-semibold">{message.eyebrow}</div>
                <div className="font-display text-xl text-ink-50 mt-1">{message.title}</div>
                <p className="text-xs text-ink-300 leading-relaxed mt-1.5">{message.detail}</p>
              </div>

              <div className="space-y-2 mb-5">
                <ModuleButton icon={<IdCard className="w-4 h-4" />} title="Care card"
                  detail={journey.profile.preferredName || journey.profile.birthLocation ? 'Details saved privately' : 'Keep essential details together'}
                  onClick={() => setView('care')} />
                <ModuleButton icon={<HelpCircle className="w-4 h-4" />} title="Provider questions"
                  detail={journey.questions.length ? `${journey.questions.filter((item) => !item.askedAt).length} open` : 'Remember what you want to ask'}
                  onClick={() => setView('questions')} />
                <ModuleButton icon={<ListChecks className="w-4 h-4" />} title="Responsibilities"
                  detail={journey.responsibilities.length ? `${journey.responsibilities.filter((item) => !item.completedAt).length} open` : 'Coordinate practical support'}
                  onClick={() => setView('responsibilities')} />
                <ModuleButton icon={<Heart className="w-4 h-4" />} title="First 12 weeks"
                  detail={journey.entries.length ? `${journey.entries.length} timeline item${journey.entries.length === 1 ? '' : 's'}` : 'Appointments, notes, and support'}
                  onClick={() => setView('timeline')} />
              </div>

              <fieldset>
                <legend className="text-[10px] uppercase tracking-[0.16em] text-ink-400 font-semibold mb-2">Choose your phase</legend>
                <p className="text-[11px] text-ink-500 leading-relaxed mb-3">Olive never changes this automatically. Choose the view that feels useful now.</p>
                <div className="grid grid-cols-2 gap-2">
                  {PHASES.map((item) => {
                    const selected = journey.profile.phase === item.value;
                    return (
                      <button type="button" key={item.value} onClick={() => onPhaseChange(item.value)} aria-pressed={selected}
                        className={`min-h-[48px] rounded-xl border px-3 py-2 text-sm flex items-center justify-center gap-2 transition-colors ${selected ? 'border-rose-300/60 bg-rose-300/15 text-rose-100' : 'border-ink-200/25 bg-ink-100/5 text-ink-300 active:bg-ink-100/10'}`}>
                        {selected && <Check className="w-3.5 h-3.5" />}{item.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function ModuleButton({ icon, title, detail, onClick }: { icon: React.ReactNode; title: string; detail: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full min-h-[64px] rounded-xl border border-ink-200/25 bg-ink-100/5 px-3 py-3 flex items-center gap-3 text-left active:bg-ink-100/10">
      <span className="w-8 h-8 rounded-full bg-rose-300/10 text-rose-300 flex items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1"><span className="block text-sm text-ink-100 font-medium">{title}</span><span className="block text-[10px] text-ink-500 mt-0.5">{detail}</span></span>
      <ChevronRight className="w-4 h-4 text-ink-500" />
    </button>
  );
}
