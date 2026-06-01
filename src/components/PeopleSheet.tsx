// People — trusted contacts Cam can share labor updates with.
// Each person has a name, optional relationship, phone, email. They're stored
// locally only and never sent to a server (we have no server).

import { useState } from 'react';
import { Plus, Trash2, ArrowLeft, Mail, Phone, User } from 'lucide-react';
import { addPerson, deletePerson, getPeople, type Person } from '../lib/sessions';

type Props = {
  onClose: () => void;
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

export default function PeopleSheet({ onClose }: Props) {
  const [people, setPeople] = useState<Person[]>(() => getPeople());
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('partner');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    addPerson({
      name: name.trim(),
      relationship,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
    });
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
    <div className="absolute right-5 top-full mt-1 z-40 w-80 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-ink-200/30 bg-plum-950/95 backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-1 -ml-1 text-ink-400 active:text-ink-200"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-sm font-semibold text-ink-50 font-display">People</div>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-xs text-rose-300 active:text-rose-200 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg active:bg-rose-300/10"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-3 rounded-xl border border-ink-200/30 bg-ink-100/5 p-3 space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (required)"
            className="w-full bg-transparent text-sm text-ink-50 placeholder-ink-400 focus:outline-none"
            autoFocus
          />
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="w-full bg-ink-100/10 text-sm text-ink-100 rounded px-2 py-1.5"
          >
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 bg-ink-100/5 rounded px-2 py-1.5">
            <Phone className="w-3.5 h-3.5 text-ink-500" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (optional)"
              className="flex-1 bg-transparent text-sm text-ink-50 placeholder-ink-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 bg-ink-100/5 rounded px-2 py-1.5">
            <Mail className="w-3.5 h-3.5 text-ink-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional)"
              className="flex-1 bg-transparent text-sm text-ink-50 placeholder-ink-500 focus:outline-none"
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
            <button
              onClick={() => handleDelete(p.id)}
              className="p-1.5 text-ink-400 active:text-rose-300 transition-colors"
              aria-label="Remove"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
