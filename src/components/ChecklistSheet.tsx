// Hospital Bag Checklist Sheet — updated with add custom item + drag reorder.
import { useState, useRef } from 'react';
import { X, Check, Plus, GripVertical, Trash2 } from 'lucide-react';
import { getChecklist, toggleChecklistItem, packedCount, saveChecklist, type ChecklistItem } from '../lib/checklist';
import { uid } from '../lib/storage';

type Props = {
  sessionId: string;
  onClose: () => void;
};

export default function ChecklistSheet({ sessionId, onClose }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>(() => getChecklist(sessionId));
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const dragItem = useRef<string | null>(null);
  const dragOverItem = useRef<string | null>(null);

  const handleToggle = (itemId: string) => {
    toggleChecklistItem(sessionId, itemId);
    setItems(getChecklist(sessionId));
  };

  const handleAdd = () => {
    if (!newText.trim()) return;
    const item: ChecklistItem = {
      id: uid(),
      text: newText.trim(),
      packed: false,
    };
    const next = [...items, item];
    saveChecklist(sessionId, next);
    setItems(next);
    setNewText('');
    setAdding(false);
  };

  const handleDelete = (itemId: string) => {
    const next = items.filter((i) => i.id !== itemId);
    saveChecklist(sessionId, next);
    setItems(next);
  };

  // Drag-to-reorder
  const handleDragStart = (id: string) => {
    dragItem.current = id;
  };
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    dragOverItem.current = id;
  };
  const handleDrop = () => {
    if (!dragItem.current || !dragOverItem.current || dragItem.current === dragOverItem.current) return;
    const from = items.findIndex((i) => i.id === dragItem.current);
    const to = items.findIndex((i) => i.id === dragOverItem.current);
    if (from < 0 || to < 0) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    saveChecklist(sessionId, next);
    setItems(next);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const packed = packedCount(items);
  const total = items.length;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-ink-200/30 bg-plum-950/98  shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.6)] max-h-[85dvh] flex flex-col animate-slide-up">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-8 h-1 rounded-full bg-ink-200/40" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sage-300/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-sage-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div>
              <div className="text-base font-semibold text-ink-50 font-display">Hospital Bag</div>
              <div className="text-[11px] text-ink-400 mt-0.5">{packed} of {total} packed</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!adding && (
              <button
                onClick={() => setAdding(true)}
                className="text-xs text-rose-300 active:text-rose-200 font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-lg active:bg-rose-300/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add item
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-ink-400 active:text-ink-200 rounded-xl active:bg-ink-100/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mx-5 mb-3 h-1.5 rounded-full bg-ink-100/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-sage-300 transition-all duration-300"
            style={{ width: `${total > 0 ? (packed / total) * 100 : 0}%` }}
          />
        </div>

        {/* Add item form */}
        {adding && (
          <div className="mx-5 mb-3 rounded-xl border border-ink-200/30 bg-ink-100/5 p-3 flex gap-2">
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Item name"
              className="flex-1 bg-transparent text-sm text-ink-50 placeholder-ink-400 focus:outline-none"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={() => { setAdding(false); setNewText(''); }}
              className="p-1.5 text-ink-400 active:text-ink-200"
              aria-label="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={handleAdd}
              disabled={!newText.trim()}
              className="px-3 py-1.5 text-xs bg-rose-300 active:bg-rose-400 text-plum-950 rounded-lg font-semibold transition-colors disabled:opacity-40"
            >
              Add
            </button>
          </div>
        )}

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(item.id)}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDrop={handleDrop}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors ${
                item.packed
                  ? 'border-sage-300/30 bg-sage-300/10'
                  : 'border-ink-200/30 bg-ink-100/5 active:bg-ink-100/10'
              } ${dragOverItem.current === item.id ? 'border-rose-300/50' : ''}`}
            >
              {/* Drag handle */}
              <div className="text-ink-500 cursor-grab active:cursor-grabbing">
                <GripVertical className="w-3.5 h-3.5" strokeWidth={1.75} />
              </div>

              <button
                onClick={() => handleToggle(item.id)}
                className="flex items-center gap-2.5 flex-1"
                aria-label={item.packed ? `Mark ${item.text} as not packed` : `Mark ${item.text} as packed`}
              >
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                  item.packed ? 'bg-sage-300 border-sage-300' : 'border-ink-300/50'
                }`}>
                  {item.packed && <Check className="w-3 h-3 text-plum-950" strokeWidth={3} />}
                </div>
                <span className={`text-sm flex-1 text-left ${item.packed ? 'text-ink-300 line-through' : 'text-ink-50'}`}>
                  {item.text}
                </span>
              </button>

              <button
                onClick={() => handleDelete(item.id)}
                className="p-1 text-ink-500 active:text-rose-300 transition-colors"
                aria-label={`Delete ${item.text}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}