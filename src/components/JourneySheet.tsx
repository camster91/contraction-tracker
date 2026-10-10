import { useState } from 'react';
import {
  ArrowLeft,
  Baby,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleQuestionMark,
  ClipboardList,
  Heart,
  Hospital,
  IdCard,
  Stethoscope,
  UsersRound,
  X,
} from 'lucide-react';
import { useModalDialog } from '../hooks/useModalDialog';
import { type JourneyDocument, type JourneyPhase } from '../lib/journey';
import { journeyMessages } from '../messages/en';
import CarePlanPanel from './CarePlanPanel';
import type { CarePlan } from '../lib/settings';
import CareCardPanel from './CareCardPanel';
import { BrandIllustration } from './Brand';
import ProviderQuestionsPanel from './ProviderQuestionsPanel';
import ResponsibilitiesPanel from './ResponsibilitiesPanel';
import PostpartumTimelinePanel from './PostpartumTimelinePanel';

const PHASES: Array<{ value: JourneyPhase; label: string }> = [
  { value: 'preparing', label: 'Preparing' },
  { value: 'labor', label: 'Labor' },
  { value: 'postpartum', label: 'Postpartum' },
  { value: 'archived', label: 'Archived' },
];

type View = 'home' | 'plan' | 'care' | 'questions' | 'responsibilities' | 'timeline';

export default function JourneySheet({ journey, onJourneyChange, onPhaseChange, onClose, carePlan, onCarePlanChange, initialView = 'home', onOpenChecklist, onOpenExams, onOpenContacts }: {
  journey: JourneyDocument;
  carePlan: CarePlan;
  onCarePlanChange: (value: CarePlan) => boolean;
  initialView?: 'home' | 'plan';
  onOpenChecklist: () => void;
  onOpenExams: () => void;
  onOpenContacts: () => void;
  onJourneyChange: (journey: JourneyDocument) => boolean;
  onPhaseChange: (phase: JourneyPhase) => boolean;
  onClose: () => void;
}) {
  const dialogRef = useModalDialog(onClose);
  const [view, setView] = useState<View>(initialView);
  const message = journeyMessages[journey.profile.phase];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Birth journey" tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-ink-200/30 bg-plum-950/98 backdrop-blur-xl shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.6)] max-h-[90dvh] flex flex-col animate-slide-up">
        <div className="flex justify-center pt-3 pb-2"><div className="w-8 h-1 rounded-full bg-ink-200/40" /></div>
          <div className="flex shrink-0 items-center justify-between px-5 pb-4">
            <div className="flex items-center gap-2">
              {view !== 'home' && (
                <button type="button" onClick={() => setView('home')} className="min-h-11 min-w-11 p-2 -ml-2 text-ink-300" aria-label="Back to birth journey">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <Heart className="w-4 h-4 text-rose-300" />
              <h2 className="font-display text-lg text-ink-50">Birth journey</h2>
            </div>
            <button type="button" onClick={onClose} className="min-h-11 min-w-11 p-2 text-ink-300" aria-label="Close birth journey"><X className="w-5 h-5" /></button>
          </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-7">
          {view === 'plan' && <CarePlanPanel carePlan={carePlan} onCarePlanChange={onCarePlanChange} />}
          {view === 'care' && <CareCardPanel journey={journey} onChange={onJourneyChange} />}
          {view === 'questions' && <ProviderQuestionsPanel journey={journey} onChange={onJourneyChange} />}
          {view === 'responsibilities' && <ResponsibilitiesPanel journey={journey} onChange={onJourneyChange} />}
          {view === 'timeline' && <PostpartumTimelinePanel journey={journey} onChange={onJourneyChange} />}

          {view === 'home' && (
            <>
              <div className="rounded-2xl border border-sage-300/25 bg-sage-300/10 px-4 py-4 mb-5">
                <BrandIllustration name={journey.profile.phase === 'postpartum' ? 'support' : 'care'} className="w-20 h-20 float-right ml-3 mb-2" />
                <div className="text-xs uppercase tracking-[0.18em] text-sage-300 font-semibold">{message.eyebrow}</div>
                <div className="font-display text-xl text-ink-50 mt-1">{message.title}</div>
                <p className="text-xs text-ink-300 leading-relaxed mt-1.5">{message.detail}</p>
              </div>

              <fieldset>
                <legend className="text-xs uppercase tracking-[0.16em] text-ink-400 font-semibold mb-2">Choose your phase</legend>
                <p className="text-[13px] text-ink-500 leading-relaxed mb-3">Olive never changes this automatically. Choose the view that feels useful now.</p>
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

              <div className="space-y-5 mt-6">
                {journey.profile.phase === 'postpartum' && (
                  <ModuleSection id="journey-after-birth" title="After birth" detail="Keep the first weeks organized at your own pace.">
                    <ModuleButton icon={<Baby className="w-4 h-4" />} title="First 12 weeks"
                      detail={journey.entries.length ? `${journey.entries.length} timeline item${journey.entries.length === 1 ? '' : 's'}` : 'Appointments, notes, and support'}
                      onClick={() => setView('timeline')} />
                  </ModuleSection>
                )}
                <ModuleSection id="journey-care-now" title="Care now" detail="Stay connected to the people and information you need today.">
                  <ModuleButton icon={<Stethoscope className="w-4 h-4" />} title="Care-team contact & reminder" detail="Your provider and their timing instructions" onClick={() => setView('plan')} />
                  <ModuleButton icon={<UsersRound className="w-4 h-4" />} title="Care contacts" detail="Your trusted support people" onClick={onOpenContacts} />
                  <ModuleButton icon={<Hospital className="w-4 h-4" />} title="Exams" detail="Record measurements reported to you" onClick={onOpenExams} />
                  <ModuleButton icon={<CircleQuestionMark className="w-4 h-4" />} title="Provider questions"
                    detail={journey.questions.length ? `${journey.questions.filter((item) => !item.askedAt).length} open` : 'Remember what you want to ask'}
                    onClick={() => setView('questions')} />
                </ModuleSection>

                <ModuleSection id="journey-preparation" title="Preparation" detail="Keep the practical details together when you have a moment.">
                  <ModuleButton icon={<BriefcaseBusiness className="w-4 h-4" />} title="Hospital bag" detail="Packing checklist" onClick={onOpenChecklist} />
                  <ModuleButton icon={<IdCard className="w-4 h-4" />} title="Care card"
                    detail={journey.profile.preferredName || journey.profile.birthLocation ? 'Details saved privately' : 'Keep essential details together'}
                    onClick={() => setView('care')} />
                  <ModuleButton icon={<ClipboardList className="w-4 h-4" />} title="Responsibilities"
                    detail={journey.responsibilities.length ? `${journey.responsibilities.filter((item) => !item.completedAt).length} open` : 'Coordinate practical support'}
                    onClick={() => setView('responsibilities')} />
                </ModuleSection>

                {journey.profile.phase !== 'postpartum' && <ModuleSection id="journey-after-birth" title="After birth" detail="Keep the first weeks organized at your own pace.">
                  <ModuleButton icon={<Baby className="w-4 h-4" />} title="First 12 weeks"
                    detail={journey.entries.length ? `${journey.entries.length} timeline item${journey.entries.length === 1 ? '' : 's'}` : 'Appointments, notes, and support'}
                    onClick={() => setView('timeline')} />
                </ModuleSection>}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function ModuleSection({ id, title, detail, children }: { id: string; title: string; detail: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-2">
        <h3 id={id} className="font-display text-base text-ink-100">{title}</h3>
        <p className="text-[13px] text-ink-400 leading-relaxed mt-0.5">{detail}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function ModuleButton({ icon, title, detail, onClick }: { icon: React.ReactNode; title: string; detail: string; onClick: () => void }) {
  return (
    <button type="button" onClick={(event) => { event.currentTarget.focus(); onClick(); }} className="w-full min-h-[64px] rounded-xl border border-ink-200/25 bg-ink-100/5 px-3 py-3 flex items-center gap-3 text-left active:bg-ink-100/10">
      <span className="w-8 h-8 rounded-full bg-rose-300/10 text-rose-300 flex items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1"><span className="block text-sm text-ink-100 font-medium">{title}</span><span className="block text-[13px] text-ink-500 mt-0.5 leading-snug">{detail}</span></span>
      <ChevronRight className="w-4 h-4 text-ink-500" />
    </button>
  );
}
