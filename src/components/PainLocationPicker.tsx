import { useState } from "react";

// Retain saved identifiers; existing annotations do not need migration.
const FRONT = [
  { id: "head", label: "Head" },
  { id: "upper back (front)", label: "Upper body" },
  { id: "abdomen", label: "Abdomen" },
  { id: "hips", label: "Hips" },
  { id: "thighs", label: "Thighs" },
];
const BACK = [
  { id: "head", label: "Head" },
  { id: "upper back", label: "Upper back" },
  { id: "lower back (back)", label: "Lower back" },
  { id: "hips", label: "Hips" },
  { id: "thighs", label: "Thighs" },
];
const labelFor = (id: string) =>
  [...FRONT, ...BACK].find((region) => region.id === id)?.label ?? id;

export default function PainLocationPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (locations: string[]) => void;
}) {
  const [view, setView] = useState<"front" | "back">("front");
  const toggle = (id: string) =>
    onChange(
      selected.includes(id)
        ? selected.filter((location) => location !== id)
        : [...selected, id],
    );
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm text-ink-200">Pain location (optional)</legend>
      <p className="text-xs text-ink-300">Choose up to three areas.</p>
      <div className="flex gap-2">
        {(["front", "back"] as const).map((side) => (
          <button
            key={side}
            type="button"
            onClick={() => setView(side)}
            aria-pressed={view === side}
            className={`min-h-11 rounded-xl border px-4 text-sm ${view === side ? "border-rose-300 bg-rose-300/15 text-rose-100" : "border-ink-200/30 text-ink-300"}`}
          >
            {side === "front" ? "Front" : "Back"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(view === "front" ? FRONT : BACK).map((region) => (
          <button
            key={region.id}
            type="button"
            onClick={() => toggle(region.id)}
            aria-pressed={selected.includes(region.id)}
            disabled={!selected.includes(region.id) && selected.length >= 3}
            className={`min-h-11 rounded-xl border px-3 py-2 text-sm disabled:opacity-40 ${selected.includes(region.id) ? "border-rose-300 bg-rose-300/15 text-rose-100" : "border-ink-200/30 text-ink-300"}`}
          >
            {region.label}
          </button>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              aria-label={`Remove ${labelFor(id)}`}
              className="min-h-11 rounded-xl border border-rose-300/40 px-3 text-sm text-rose-200"
            >
              {labelFor(id)} ×
            </button>
          ))}
        </div>
      )}
    </fieldset>
  );
}
