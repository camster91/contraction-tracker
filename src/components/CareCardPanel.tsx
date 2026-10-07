import { useState, type FormEvent } from 'react';
import {
  buildCareCardSummary,
  updateJourneyProfile,
  type JourneyDocument,
} from '../lib/journey';

export default function CareCardPanel({ journey, onChange }: {
  journey: JourneyDocument;
  onChange: (journey: JourneyDocument) => void;
}) {
  const [draft, setDraft] = useState(() => ({
    preferredName: journey.profile.preferredName ?? '',
    pronouns: journey.profile.pronouns ?? '',
    estimatedDueDate: journey.profile.estimatedDueDate ?? '',
    birthLocation: journey.profile.birthLocation ?? '',
    birthAddress: journey.profile.birthAddress ?? '',
    importantNotes: journey.profile.importantNotes ?? '',
  }));
  const [editing, setEditing] = useState(!Object.values(draft).some(Boolean));
  const [status, setStatus] = useState<string | null>(null);

  const save = (event: FormEvent) => {
    event.preventDefault();
    onChange(updateJourneyProfile(journey, draft));
    setStatus('Care card saved on this device');
    setEditing(!Object.values(draft).some(Boolean));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildCareCardSummary(journey));
      setStatus('Care card copied');
    } catch {
      setStatus('Could not copy. Your care card is still saved.');
    }
  };

  const fieldClass = 'w-full bg-ink-100/5 border border-ink-200/30 rounded-xl px-3 py-2 text-base text-ink-50 placeholder:text-ink-500 focus:outline-none focus:border-rose-300/50';

  if (!editing) return <section className="space-y-4">
    <h3 className="font-display text-xl text-ink-50">Care card</h3>
    <p className="text-sm text-ink-300">Your saved details. Review before showing or sharing.</p>
    <pre className="whitespace-pre-wrap break-words font-sans text-base text-ink-100 rounded-xl border border-ink-200/30 p-4">{buildCareCardSummary(journey)}</pre>
    <div className="flex gap-3"><button type="button" onClick={() => setEditing(true)} className="min-h-11 rounded-xl border border-ink-200/30 px-4 text-sm text-ink-100">Edit care card</button><button type="button" onClick={copy} className="min-h-11 rounded-xl border border-ink-200/30 px-4 text-sm text-ink-100">Copy care card</button></div>
    {status && <p role="status" className="text-sm text-sage-300">{status}</p>}
  </section>;

  return (
    <form onSubmit={save} className="space-y-3">
      <div>
        <h3 className="font-display text-xl text-ink-50">Care card</h3>
        <p className="text-[11px] text-ink-400 leading-relaxed mt-1">
          Optional details owned by you. Everything stays on this device.
        </p>
      </div>
      <label className="block text-[11px] text-ink-300">
        Preferred name
        <input className={`${fieldClass} mt-1`} value={draft.preferredName} maxLength={80}
          onChange={(event) => setDraft({ ...draft, preferredName: event.target.value })} />
      </label>
      <label className="block text-[11px] text-ink-300">
        Pronouns
        <input className={`${fieldClass} mt-1`} value={draft.pronouns} maxLength={60}
          onChange={(event) => setDraft({ ...draft, pronouns: event.target.value })} />
      </label>
      <label className="block text-[11px] text-ink-300">
        Estimated due date
        <input type="date" className={`${fieldClass} mt-1`} value={draft.estimatedDueDate}
          onChange={(event) => setDraft({ ...draft, estimatedDueDate: event.target.value })} />
      </label>
      <label className="block text-[11px] text-ink-300">
        Birth location
        <input className={`${fieldClass} mt-1`} value={draft.birthLocation} maxLength={120}
          onChange={(event) => setDraft({ ...draft, birthLocation: event.target.value })} />
      </label>
      <label className="block text-[11px] text-ink-300">
        Birth address
        <input className={`${fieldClass} mt-1`} value={draft.birthAddress} maxLength={240}
          onChange={(event) => setDraft({ ...draft, birthAddress: event.target.value })} />
      </label>
      <label className="block text-[11px] text-ink-300">
        Important notes entered by you
        <textarea className={`${fieldClass} mt-1 min-h-[88px] resize-y`} value={draft.importantNotes} maxLength={2000}
          onChange={(event) => setDraft({ ...draft, importantNotes: event.target.value })} />
      </label>
      <p className="text-[10px] text-ink-500 leading-relaxed">
        These are your notes, not verified medical instructions. Review them before showing or sharing the card.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button type="submit" className="min-h-[44px] rounded-xl bg-rose-300 text-plum-950 text-sm font-semibold px-3 py-2">
          Save care card
        </button>
        <button type="button" onClick={copy} className="min-h-[44px] rounded-xl border border-ink-200/30 text-ink-200 text-sm px-3 py-2">
          Copy care card
        </button>
      </div>
      {status && <div role="status" className="text-[11px] text-sage-300">{status}</div>}
    </form>
  );
}
