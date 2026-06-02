// Pain location picker — body silhouette with tappable regions.
// Tapping a region toggles it. Front/back toggle switch above the body.

import { useState } from 'react';

const FRONT_REGIONS = [
  { id: 'head', label: 'Head', cx: 50, cy: 12, r: 6 },
  { id: 'upper back (front)', label: 'Upper back', cx: 50, cy: 32, rx: 18, ry: 8 },
  { id: 'abdomen', label: 'Abdomen', cx: 50, cy: 52, rx: 22, ry: 12 },
  { id: 'hips', label: 'Hips', cx: 50, cy: 65, rx: 18, ry: 8 },
  { id: 'thighs', label: 'Thighs', cx: 50, cy: 82, rx: 16, ry: 10 },
];

const BACK_REGIONS = [
  { id: 'head', label: 'Head', cx: 50, cy: 12, r: 6 },
  { id: 'lower back (back)', label: 'Lower back', cx: 50, cy: 38, rx: 18, ry: 10 },
  { id: 'upper back', label: 'Upper back', cx: 50, cy: 28, rx: 18, ry: 7 },
  { id: 'hips', label: 'Hips', cx: 50, cy: 65, rx: 18, ry: 8 },
  { id: 'thighs', label: 'Thighs', cx: 50, cy: 82, rx: 16, ry: 10 },
];

type Props = {
  selected: string[];
  onChange: (locations: string[]) => void;
};

export default function PainLocationPicker({ selected, onChange }: Props) {
  const [view, setView] = useState<'front' | 'back'>('front');

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((r) => r !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const regions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS;

  return (
    <div className="space-y-2">
      {/* Front/back toggle */}
      <div className="flex gap-1 p-1 rounded-xl bg-ink-100/5 w-fit mx-auto">
        {(['front', 'back'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`text-[11px] px-3 py-1 rounded-lg font-medium transition-colors ${
              view === v
                ? 'bg-rose-300/20 text-rose-200 border border-rose-300/40'
                : 'text-ink-400 active:bg-ink-100/10'
            }`}
          >
            {v === 'front' ? 'Front' : 'Back'}
          </button>
        ))}
      </div>

      {/* Body silhouette SVG */}
      <div className="relative mx-auto" style={{ width: 120, height: 160 }}>
        {/* Body outline */}
        <svg viewBox="0 0 100 120" className="w-full h-full" aria-label="Body map">
          {/* Head */}
          <circle cx="50" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-300/40" />
          {/* Neck */}
          <line x1="50" y1="18" x2="50" y2="22" stroke="currentColor" strokeWidth="1.5" className="text-ink-300/40" />
          {/* Shoulders */}
          <path d="M30 26 Q50 22 70 26" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-300/40" />
          {/* Torso outline */}
          <path d="M30 26 Q26 40 28 55 Q30 70 35 75 L65 75 Q70 70 72 55 Q74 40 70 26 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-300/40" />
          {/* Legs */}
          <path d="M35 75 Q33 90 30 110 M65 75 Q67 90 70 110" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-300/40" />

          {/* Tappable regions */}
          {regions.map((r) => {
            const isSelected = selected.includes(r.id);
            const isClickable = selected.includes(r.id) || selected.length < 3;
            return (
              <g
                key={r.id}
                onClick={() => isClickable && toggle(r.id)}
                style={{ cursor: isClickable ? 'pointer' : 'default' }}
                aria-label={r.label}
                role="button"
                aria-pressed={selected.includes(r.id)}
              >
                {r.r ? (
                  <circle
                    cx={r.cx}
                    cy={r.cy}
                    r={r.r}
                    fill={isSelected ? 'rgba(232,149,122,0.4)' : 'rgba(232,149,122,0.1)'}
                    stroke={isSelected ? 'rgba(232,149,122,0.8)' : 'rgba(232,149,122,0.2)'}
                    strokeWidth={isSelected ? 1.5 : 1}
                  />
                ) : (
                  <ellipse
                    cx={r.cx}
                    cy={r.cy}
                    rx={r.rx}
                    ry={r.ry}
                    fill={isSelected ? 'rgba(232,149,122,0.4)' : 'rgba(232,149,122,0.1)'}
                    stroke={isSelected ? 'rgba(232,149,122,0.8)' : 'rgba(232,149,122,0.2)'}
                    strokeWidth={isSelected ? 1.5 : 1}
                  />
                )}
                {/* Label */}
                <text
                  x={r.cx}
                  y={(r as typeof FRONT_REGIONS[0]).cy ?? (r as { cy: number }).cy}
                  textAnchor="middle"
                  fontSize="4"
                  fill={isSelected ? 'rgba(232,149,122,0.9)' : 'rgba(148,163,184,0.6)'}
                  fontFamily="Inter, sans-serif"
                  fontWeight="500"
                >
                  {isSelected ? r.label : ''}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center">
          {selected.map((loc) => (
            <button
              key={loc}
              onClick={() => toggle(loc)}
              className="text-[10px] px-2 py-1 rounded-full bg-rose-300/20 text-rose-200 border border-rose-300/40 font-medium transition-colors active:bg-rose-300/30"
              aria-label={`Remove ${loc}`}
            >
              {loc}
            </button>
          ))}
        </div>
      )}

      {selected.length === 0 && (
        <div className="text-center">
          <span className="text-[10px] text-ink-500">Tap the body to mark where it hurts</span>
        </div>
      )}
      {selected.length >= 3 && (
        <div className="text-center">
          <span className="text-[10px] text-ink-500">Max 3 regions selected</span>
        </div>
      )}
    </div>
  );
}