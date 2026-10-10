// People — trusted contacts Cam can share labor updates with.
// Each person has a name, optional relationship, phone, email. They're stored
// locally only and never sent to a server (we have no server).

import { useState } from 'react';
import { Plus, Trash2, ArrowLeft, Phone, User, MessageSquare, Pencil, Mail } from 'lucide-react';
import { addPerson, getPeople, setPeople as savePeople, type Person, updatePerson } from '../lib/sessions';
import { shareSummary } from '../lib/shareSummary';
import { toast } from '../lib/toast';
import { useModalDialog } from '../hooks/useModalDialog';
import ManualShareSheet from './ManualShareSheet';

type Props = {
  onClose: () => void;
  finished?: { start: string; end: string | null; id: string }[];
};

const RELATIONSHIPS = [
  'partner',
  'spouse',
  'mom',
  'dad',
  'sister',
  'brother',
  'friend',
  'doula',
  'midwife',
  'OB/GYN',
  'other',
];

function buildUpdateMessage(finished: { start: string; end: string | null; id: string }[]) {
  const last = finished[finished.length - 1];
  const lastDur = last?.end ? Math.round((new Date(last.end).getTime() - new Date(last.start).getTime()) / 1000) : 0;
  const minutes = Math.floor(lastDur / 60);
  const seconds = lastDur % 60;
  const countLabel = finished.length === 1 ? 'contraction' : 'contractions';
  return `${finished.length} ${countLabel} so far. Last was ${minutes}:${seconds.toString().padStart(2, '0')}.`;
}

export default function PeopleSheet({ onClose, finished = [] }: Props) {
  const dialogRef = useModalDialog(onClose);
  const [people, setPeople] = useState<Person[]>(() => getPeople());
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('partner');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [manualShare, setManualShare] = useState<{ contactName: string; text: string } | null>(null);
  const [deletedPerson, setDeletedPerson] = useState<{ person: Person; index: number } | null>(null);

  const resetForm = () => {
    setFormMode(null);
    setEditingId(null);
    setName('');
    setRelationship('partner');
    setPhone('');
    setEmail('');
  };

  const startAdd = () => {
    resetForm();
    setFormMode('add');
  };

  const startEdit = (person: Person) => {
    setEditingId(person.id);
    setName(person.name);
    setRelationship(person.relationship);
    setPhone(person.phone ?? '');
    setEmail(person.email ?? '');
    setFormMode('edit');
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      toast.error('Add a name for this contact.');
      return;
    }
    if (trimmedEmail && !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      toast.error('Enter a valid email address or leave it blank.');
      return;
    }
    const details = {
      name: trimmedName,
      relationship,
      phone: phone.trim() || undefined,
      email: trimmedEmail || undefined,
    };
    if (formMode === 'edit' && editingId) {
      if (!updatePerson(editingId, details)) {
        toast.error('Could not update this contact. Free up space and try again.');
        return;
      }
      const next = getPeople();
      setPeople(next);
      toast.success('Contact updated');
      resetForm();
      return;
    }
    const person = addPerson(details);
    if (!person) { toast.error('Could not save this contact. Free up space and try again.'); return; }
    setPeople(getPeople());
    toast.success('Contact added');
    resetForm();
  };

  const handleDelete = (id: string) => {
    const index = people.findIndex((person) => person.id === id);
    const person = people[index];
    if (!person) return;
    const next = people.filter((candidate) => candidate.id !== id);
    if (!savePeople(next)) {
      toast.error('Could not remove this contact. Free up space and try again.');
      return;
    }
    setPeople(next);
    setDeletedPerson({ person, index });
  };

  const undoDelete = () => {
    if (!deletedPerson) return;
    const current = getPeople();
    if (current.some((person) => person.id === deletedPerson.person.id)) return;
    const insertAt = Math.min(deletedPerson.index, current.length);
    const next = [...current.slice(0, insertAt), deletedPerson.person, ...current.slice(insertAt)];
    if (!savePeople(next)) {
      toast.error('Could not restore this contact. Free up space and try again.');
      return;
    }
    setPeople(next);
    setDeletedPerson(null);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Care contacts"
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-ink-200/30 bg-plum-950/98  shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.6)] max-h-[85dvh] flex flex-col animate-slide-up"
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-8 h-1 rounded-full bg-ink-200/40" />
        </div>
      <div className="flex shrink-0 items-center justify-between px-5 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="min-h-11 min-w-11 p-2 -ml-1 text-ink-400 active:text-ink-200"
            aria-label="Close care contacts"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-sm font-semibold text-ink-50 font-display">Care contacts</div>
        </div>
        {!formMode && (
          <button
            onClick={startAdd}
            className="min-h-11 text-sm text-rose-300 active:text-rose-200 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg active:bg-rose-300/10"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6">
      {formMode && (
        <div className="mb-3 rounded-xl border border-ink-200/30 bg-ink-100/5 p-3 space-y-2">
          <div className="text-sm font-semibold text-ink-50 font-display">{formMode === 'edit' ? 'Edit contact' : 'Add contact'}</div>
          <label htmlFor="person-name-input" className="block text-xs text-ink-300">
            Person name
          </label>
          <input
            id="person-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (required)"
            className="w-full min-h-11 bg-transparent min-w-0 text-base text-ink-50 placeholder-ink-400 focus:outline-none"
            autoFocus
          />
          <label htmlFor="person-relationship-select" className="block text-xs text-ink-300">
            Relationship
          </label>
          <select
            id="person-relationship-select"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="w-full min-h-11 bg-ink-100/10 text-base text-ink-100 rounded px-2 py-1.5"
          >
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <div className="space-y-1 bg-ink-100/5 rounded px-2 py-2">
                        <label htmlFor="person-phone-input" className="block text-xs text-ink-300">
              Phone number
            </label>
            <input
              id="person-phone-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (optional)"
              className="w-full min-h-11 bg-transparent min-w-0 text-base text-ink-50 placeholder-ink-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1 bg-ink-100/5 rounded px-2 py-2">
                        <label htmlFor="person-email-input" className="block text-xs text-ink-300">
              Email address
            </label>
            <input
              id="person-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional)"
              className="w-full min-h-11 bg-transparent min-w-0 text-base text-ink-50 placeholder-ink-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                resetForm();
              }}
              className="flex-1 min-h-11 text-sm bg-ink-100/5 active:bg-ink-100/10 border border-ink-200/30 text-ink-200 rounded-lg py-1.5 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="flex-1 min-h-11 text-sm bg-rose-300 active:bg-rose-400 text-plum-950 rounded-lg py-1.5 font-semibold transition-colors disabled:opacity-40"
            >
              {formMode === 'edit' ? 'Save changes' : 'Add contact'}
            </button>
          </div>
        </div>
      )}

      {deletedPerson && (
        <div role="status" className="mb-3 flex items-center gap-3 rounded-xl border border-ink-200/30 bg-ink-100/5 px-3 py-2 text-sm text-ink-200">
          <span className="min-w-0 flex-1 truncate">{deletedPerson.person.name} removed.</span>
          <button type="button" onClick={undoDelete} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-rose-300 active:bg-rose-300/10">Undo</button>
          <button type="button" onClick={() => setDeletedPerson(null)} className="min-h-11 rounded-lg px-3 text-sm font-medium text-ink-300 active:bg-ink-100/10" aria-label="Dismiss contact removal">Dismiss</button>
        </div>
      )}

      <ul className="space-y-1.5 max-h-80 overflow-y-auto">
        {people.length === 0 && !formMode && (
          <li className="text-xs text-ink-500 text-center py-4">
            No people yet. Add partner, midwife, family.
          </li>
        )}
        {people.map((p) => (
          <li
            key={p.id}
            className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2.5 gap-y-2.5 rounded-xl border border-ink-200/30 bg-ink-100/5 px-3 py-2.5"
          >
            <div className="w-8 h-8 rounded-full bg-ink-100/10 flex items-center justify-center">
              <User className="w-4 h-4 text-ink-400" />
            </div>
            <div className="min-w-0 self-center">
              <div className="text-sm font-medium text-ink-50 break-words">{p.name}</div>
              <div className="text-xs text-ink-500 truncate">
                {p.relationship}
                {p.phone && ` · ${p.phone}`}
                {p.email && ` · ${p.email}`}
              </div>
            </div>
            <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-1.5">
              {/* Call */}
              {p.phone && (
                <a
                  href={`tel:${p.phone}`}
                  className="min-h-11 inline-flex items-center gap-1.5 rounded-lg px-2 text-xs text-ink-300 active:text-sage-300 transition-colors"
                  aria-label={`Call ${p.name}`}
                  title="Call"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call
                </a>
              )}
              {/* Share update: opens the standard chooser and does not send automatically. */}
              {finished.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    const msg = buildUpdateMessage(finished);
                    const result = await shareSummary(msg);
                    if (result === 'copied') {
                      toast.success(`Update for ${p.name} copied to clipboard`);
                    } else if (result === 'manual') {
                      setManualShare({ contactName: p.name, text: msg });
                    }
                  }}
                  className="min-h-11 inline-flex items-center gap-1.5 rounded-lg px-2 text-xs text-ink-300 active:text-rose-300 transition-colors"
                  aria-label={`Share update for ${p.name}`}
                  title={`Share update for ${p.name}`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Share update
                </button>
              )}
              {p.email && finished.length > 0 && (
                <a
                  href={`mailto:${encodeURIComponent(p.email)}?subject=${encodeURIComponent(`Olive update for ${p.name}`)}&body=${encodeURIComponent(buildUpdateMessage(finished))}`}
                  className="min-h-11 inline-flex items-center gap-1.5 rounded-lg px-2 text-xs text-ink-300 active:text-sage-300 transition-colors"
                  aria-label={`Email ${p.name}`}
                  title={`Email ${p.name}`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </a>
              )}
              <button
                type="button"
                onClick={() => startEdit(p)}
                className="min-h-11 inline-flex items-center gap-1.5 rounded-lg px-2 text-xs text-ink-300 active:text-rose-300 transition-colors"
                aria-label={`Edit ${p.name}`}
                title={`Edit ${p.name}`}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="min-h-11 inline-flex items-center gap-1.5 rounded-lg px-2 text-xs text-ink-300 active:text-rose-300 transition-colors"
                aria-label={`Remove ${p.name}`}
                title={`Remove ${p.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
        </div>
      </div>
      {manualShare && (
        <ManualShareSheet
          title={`update for ${manualShare.contactName}`}
          text={manualShare.text}
          onClose={() => setManualShare(null)}
        />
      )}
    </>
  );
}
