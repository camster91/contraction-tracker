import { useLayoutEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true');
}

/**
 * Gives a bottom sheet modal keyboard behaviour: focus enters on mount,
 * Tab and Shift+Tab stay inside, Escape closes, and focus returns to the
 * opener after unmount.
 */
export function useModalDialog(onClose: () => void): RefObject<HTMLDivElement | null> {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog) return;

    const candidates = focusableElements(dialog);
    (candidates[0] ?? dialog).focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const currentCandidates = focusableElements(dialog);
      if (currentCandidates.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      // Safari can omit buttons from its native Tab order. Move through the
      // dialog's actual controls explicitly so focus never escapes the sheet.
      event.preventDefault();
      const index = currentCandidates.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey
        ? (index <= 0 ? currentCandidates.length - 1 : index - 1)
        : (index + 1) % currentCandidates.length;
      currentCandidates[next].focus();
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return dialogRef;
}
