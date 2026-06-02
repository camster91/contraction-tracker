// StatePicker — 4-pill button row for selecting labor stage.
// Extracted from ShareSheet so it can be reused elsewhere.

type LaborState = 'prenatal' | 'labor' | 'postpartum' | 'archived';

type Props = {
  value: LaborState;
  onChange: (state: LaborState) => void;
};

const STATES: LaborState[] = ['prenatal', 'labor', 'postpartum', 'archived'];

export default function StatePicker({ value, onChange }: Props) {
  return (
    <div className="mb-3">
      <div className="text-[10px] uppercase tracking-[0.15em] text-ink-400 font-semibold mb-1.5">Labor stage</div>
      <div className="flex gap-1.5 flex-wrap">
        {STATES.map((st) => (
          <button
            key={st}
            onClick={() => onChange(st)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-medium border transition-colors ${
              value === st
                ? st === 'prenatal' ? 'bg-ink-200/20 border-ink-300/40 text-ink-200' :
                  st === 'labor' ? 'bg-rose-300/20 border-rose-300/40 text-rose-300' :
                  st === 'postpartum' ? 'bg-sage-300/20 border-sage-300/40 text-sage-300' :
                  'bg-ink-100/10 border-ink-200/30 text-ink-500'
                : 'border-ink-200/30 bg-ink-100/5 text-ink-400 active:bg-ink-100/10'
            }`}
          >
            {st}
          </button>
        ))}
      </div>
    </div>
  );
}
