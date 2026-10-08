import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Square } from 'lucide-react';
import { formatDuration } from '../lib/contractions';

type Props = {
  elapsed: number;
  onStop: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
};

/** One Stop action: large in the hero, compact when scrolling or using a sheet. */
export default function ActiveTimerControl({ elapsed, onStop, buttonRef }: Props) {
  const heroRef = useRef<HTMLDivElement>(null);
  const [offscreen, setOffscreen] = useState(false);
  const [dialog, setDialog] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => {
      setOffscreen(entry.intersectionRatio < 0.99);
    }, { threshold: [0, 0.99, 1] });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Portal into the open dialog so Stop remains part of its accessible tree
    // and keyboard focus trap, rather than a control behind an aria-modal sheet.
    const refreshDialog = () => {
      const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]');
      const top = dialogs.item(dialogs.length - 1);
      setDialog(previous => previous === top ? previous : top);
    };
    refreshDialog();
    const observer = new MutationObserver(refreshDialog);
    observer.observe(document.getElementById('root')!, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const compact = offscreen || !!dialog;
  const stop = (
    <button ref={buttonRef} onClick={onStop} aria-label="Stop"
      data-active-timer-stop="true"
      className={compact
        ? 'active-timer-dock fixed z-[60] min-h-14 rounded-2xl bg-ink-50 text-plum-950 shadow-xl flex items-center justify-between gap-3 px-5 py-3'
        : 'w-full min-h-[200px] rounded-3xl bg-ink-50 text-plum-950 active:scale-[0.99] transition-transform duration-150 flex flex-col items-center justify-center px-6 py-6'}>
      <span className={`font-display ${compact ? 'text-2xl' : 'text-6xl'} font-light tabular-nums leading-none`} aria-hidden="true">{formatDuration(elapsed)}</span>
      <span className={`flex items-center gap-2 ${compact ? '' : 'mt-3'} text-xl font-semibold`}><Square className="w-4 h-4" fill="currentColor" strokeWidth={0} />Stop</span>
      {!compact && <span className="text-[10px] uppercase tracking-[0.18em] opacity-70 mt-2">Tap when it passes</span>}
    </button>
  );

  return <>
    <div ref={heroRef} className="min-h-[200px]">{!compact && stop}</div>
    {compact && createPortal(stop, dialog ?? document.getElementById('root')!)}
  </>;
}
