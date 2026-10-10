import { useEffect, useState } from 'react';

/** Keep global feedback and Stop inside the current modal's accessible tree. */
export function useActiveDialog(): HTMLElement | null {
  const [dialog, setDialog] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    const refresh = () => {
      const dialogs = root.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]');
      const top = dialogs.item(dialogs.length - 1);
      setDialog(previous => previous === top ? previous : top);
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return dialog;
}
