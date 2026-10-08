// Hospital Bag Checklist Sheet — updated with add custom item + drag reorder.
import { useState, useRef } from 'react';
import { X, Check, Plus, GripVertical, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { getChecklist, toggleChecklistItem, packedCount, saveChecklist, type ChecklistItem } from '../lib/checklist';
import { toast } from '../lib/toast';
import { uid } from '../lib/storage';
import { useModalDialog } from '../hooks/useModalDialog';

type Props = {
  sessionId: string;
  onClose: () => void;
};

export default function ChecklistSheet({ sessionId, onClose }: Props) {
  const dialogRef = useModalDialog(onClose);
  const [items, setItems] = useState<ChecklistItem[]>(() => getChecklist(sessionId));
  const [adding, setAdding] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [newText, setNewText] = useState('');
  const dragItem = useRef<string | null>(null);
  const dragOverItem = useRef<string | null>(null);

  const handleToggle = (itemId: string) => {
    if (!toggleChecklistItem(sessionId, itemId)) { toast.error('Could not save this checklist. Free up space and try again.'); return; }
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
    if (!saveChecklist(sessionId, next)) { toast.error('Could not save this checklist. Free up space and try again.'); return; }
    setItems(next);
    setNewText('');
    setAdding(false);
  };

  const handleDelete = (itemId: string) => {
    const next = items.filter((i) => i.id !== itemId);
    if (!saveChecklist(sessionId, next)) { toast.error('Could not save this checklist. Free up space and try again.'); return; }
    setItems(next);
  };

  const moveItem = (index: number, offset: number) => {
    const to = index + offset;
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    [next[index], next[to]] = [next[to], next[index]];
    if (!saveChecklist(sessionId, next)) { toast.error('Could not save this checklist. Free up space and try again.'); return; }
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
    if (!saveChecklist(sessionId, next)) { toast.error('Could not save this checklist. Free up space and try again.'); return; }
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
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Hospital bag"
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-ink-200/30 bg-plum-950/98  shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.6)] max-h-[85dvh] flex flex-col animate-slide-up"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-8 h-1 rounded-full bg-ink-200/40" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-5 pb-3">
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
                className="min-h-11 text-xs text-rose-300 active:text-rose-200 font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-lg active:bg-rose-300/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add item
              </button>
            )}
            <button
              onClick={onClose}
              className="min-h-11 min-w-11 p-2 text-ink-400 active:text-ink-200 rounded-xl active:bg-ink-100/10 transition-colors"
              aria-label="Close hospital bag"
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
              aria-label="Item name"
              className="flex-1 min-w-0 bg-transparent text-base text-ink-50 placeholder-ink-400 focus:outline-none"
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

        {items.length > 1 && <button type="button" aria-pressed={reordering} onClick={() => setReordering(value => !value)} className="mx-5 mb-3 min-h-11 rounded-xl border border-ink-200/30 px-3 text-sm text-ink-200">{reordering ? 'Done reordering' : 'Reorder items'}</button>}
        {/* Items list */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6 space-y-1.5">
          {items.length === 0 && !adding && (
            <div className="text-center py-8">
              <div className="text-sm text-ink-300 font-medium">No items yet</div>
              <div className="text-[11px] text-ink-500 mt-1">Start packing — tap Add to build your hospital bag list.</div>
            </div>
          )}
          {items.map((item, index) => (
            <div
              key={item.id}
              draggable={reordering}
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
              {reordering && <div className="text-ink-500 cursor-grab active:cursor-grabbing">
                <GripVertical className="w-3.5 h-3.5" strokeWidth={1.75} />
              </div>}

              <button
                onClick={() => handleToggle(item.id)}
                className="min-h-11 flex items-center gap-2.5 flex-1 min-w-0"
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

              {reordering && <div className="flex flex-col">
                <button type="button" aria-label={`Move ${item.text} up`} disabled={index === 0} onClick={() => moveItem(index, -1)} className="min-h-11 min-w-11 text-ink-200 disabled:opacity-30"><ArrowUp className="mx-auto w-4 h-4" /></button>
                <button type="button" aria-label={`Move ${item.text} down`} disabled={index === items.length - 1} onClick={() => moveItem(index, 1)} className="min-h-11 min-w-11 text-ink-200 disabled:opacity-30"><ArrowDown className="mx-auto w-4 h-4" /></button>
              </div>}
              <button
                onClick={() => handleDelete(item.id)}
                className="min-h-11 min-w-11 p-2 text-ink-500 active:text-rose-300 transition-colors"
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
