// TagFilter — the row of chips that filter the history list by tag.
// Each chip shows a tag and its count; tap to filter, tap All to clear.

import { Tag } from 'lucide-react';

type Props = {
  knownTags: Array<{ tag: string; count: number }>;
  finishedCount: number;
  tagFilter: string | null;
  onSetTagFilter: (tag: string | null) => void;
};

export default function TagFilter({ knownTags, finishedCount, tagFilter, onSetTagFilter }: Props) {
  if (knownTags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-3 ml-1">
      <button
        onClick={() => onSetTagFilter(null)}
        aria-pressed={tagFilter === null}
        className={`text-sm px-2.5 py-1 rounded-full font-medium transition-colors ${
          tagFilter === null
            ? 'bg-rose-300/20 text-rose-200 border border-rose-300/40'
            : 'bg-ink-100/5 text-ink-400 border border-ink-200/30 active:bg-ink-100/10'
        }`}
      >
        All ({finishedCount})
      </button>
      {knownTags.map(({ tag, count }) => (
        <button
          key={tag}
          onClick={() => onSetTagFilter(tagFilter === tag ? null : tag)}
          aria-pressed={tagFilter === tag}
          className={`text-sm px-2.5 py-1 rounded-full font-medium transition-colors flex items-center gap-1 ${
            tagFilter === tag
              ? 'bg-rose-300/20 text-rose-200 border border-rose-300/40'
              : 'bg-ink-100/5 text-ink-300 border border-ink-200/30 active:bg-ink-100/10'
          }`}
        >
          <Tag className="w-2.5 h-2.5" />
          {tag} ({count})
        </button>
      ))}
    </div>
  );
}
