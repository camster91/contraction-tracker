// People — trusted contacts Cam can share labor updates with.
// Each person has a name, optional relationship, phone, email. They're stored
// locally only and never sent to a server (we have no server).

import { useState } from 'react';
import { Plus, Trash2, ArrowLeft, Phone, User, MessageSquare } from 'lucide-react';
import { addPerson, deletePerson, getPeople, type Person } from '../lib/sessions';
import { shareSummary } from '../lib/shareSummary';
import { toast } from '../lib/toast';
import { useModalDialog } from '../hooks/useModalDialog';

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

export default function PeopleSheet({ onClose, finished = [] }: Props) {
  const dialogRef = useModalDialog(onClose);
  const [people, setPeople] = useState<Person[]>(() => getPeople());
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('partner');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    const person = addPerson({
      name: name.trim(),
      relationship,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
    });
    if (!person) { toast.error('Could not save this contact. Free up space and try again.'); return; }
    setPeople(getPeople());
    setAdding(false);
    setName('');
    setRelationship('partner');
    setPhone('');
    setEmail('');
  };

  const handleDelete = (id: string) => {
    deletePerson(id);
    setPeople(getPeople());
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
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="min-h-11 text-xs text-rose-300 active:text-rose-200 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg active:bg-rose-300/10"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6">
      {adding && (
        <div className="mb-3 rounded-xl border border-ink-200/30 bg-ink-100/5 p-3 space-y-2">
          <label htmlFor="person-name-input" className="block text-xs text-ink-300">
            Person name
          </label>
          <input
            id="person-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (required)"
            className="w-full bg-transparent min-w-0 text-base text-ink-50 placeholder-ink-400 focus:outline-none"
            autoFocus
          />
          <label htmlFor="person-relationship-select" className="block text-xs text-ink-300">
            Relationship
          </label>
          <select
            id="person-relationship-select"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="w-full bg-ink-100/10 text-base text-ink-100 rounded px-2 py-1.5"
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
              className="w-full bg-transparent min-w-0 text-base text-ink-50 placeholder-ink-500 focus:outline-none"
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
              className="w-full bg-transparent min-w-0 text-base text-ink-50 placeholder-ink-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                setAdding(false);
                setName('');
                setRelationship('partner');
                setPhone('');
                setEmail('');
              }}
              className="flex-1 text-xs bg-ink-100/5 active:bg-ink-100/10 border border-ink-200/30 text-ink-200 rounded-lg py-1.5 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!name.trim()}
              className="flex-1 text-xs bg-rose-300 active:bg-rose-400 text-plum-950 rounded-lg py-1.5 font-semibold transition-colors disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      )}

      <ul className="space-y-1.5 max-h-80 overflow-y-auto">
        {people.length === 0 && !adding && (
          <li className="text-xs text-ink-500 text-center py-4">
            No people yet. Add partner, midwife, family.
          </li>
        )}
        {people.map((p) => (
          <li
            key={p.id}
            className="rounded-xl border border-ink-200/30 bg-ink-100/5 px-3 py-2.5 flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-full bg-ink-100/10 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-ink-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink-50 truncate">{p.name}</div>
              <div className="text-[10px] text-ink-500 truncate">
                {p.relationship}
                {p.phone && ` · ${p.phone}`}
                {p.email && ` · ${p.email}`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Call */}
              {p.phone && (
                <a
                  href={`tel:${p.phone}`}
                  className="p-1.5 text-ink-400 active:text-sage-300 transition-colors"
                  aria-label={`Call ${p.name}`}
                  title="Call"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
              )}
              {/* Send update */}
              {finished.length > 0 && (
                <button
                  onClick={async () => {
                    const last = finished[finished.length - 1];
                    const lastDur = last.end ? Math.round((new Date(last.end).getTime() - new Date(last.start).getTime()) / 1000) : 0;
                    const m = Math.floor(lastDur / 60);
                    const s = lastDur % 60;
                    const durStr = `${m}:${s.toString().padStart(2, '0')}`;
                    const msg = `${finished.length} contractions so far. Last was ${durStr}.`;
                    const result = await shareSummary(msg);
                    if (result === 'copied') {
                      toast.success(`Update for ${p.name} copied to clipboard`);
                    } else if (result === 'manual') {
                      toast.info(msg, { duration: 8000 });
                    }
                  }}
                  className="p-1.5 text-ink-400 active:text-rose-300 transition-colors"
                  aria-label={`Send update to ${p.name}`}
                  title="Send update"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => handleDelete(p.id)}
                className="p-1.5 text-ink-400 active:text-rose-300 transition-colors"
                aria-label="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
        </div>
    </div>
  </>
  );
}
