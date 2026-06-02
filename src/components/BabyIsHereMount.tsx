// BabyIsHereMount — host-side trigger for the "Baby is here!" celebratory
// modal. Wraps the button and the BabyIsHereModal so the parent doesn't
// need to manage the modal open/close state.

import { useState } from 'react';
import BabyIsHereModal from './BabyIsHereModal';

type Props = {
  share: string;
  onSuccess: () => void;
};

export default function BabyIsHereMount({ share, onSuccess }: Props) {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    if (!share) {
      alert('Create a share link first so your circle can see the update.');
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="w-full mb-3 text-left text-sm text-ink-100 bg-sage-300/10 active:bg-sage-300/20 border border-sage-300/30 rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors"
      >
        <span className="text-lg">🎉</span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sage-200">Baby is here!</div>
          <div className="text-[10px] text-ink-500">Share the happy news with your circle</div>
        </div>
      </button>

      {open && (
        <BabyIsHereModal
          code={share}
          onClose={() => setOpen(false)}
          onBabyPosted={() => {
            setOpen(false);
            onSuccess();
          }}
        />
      )}
    </>
  );
}
