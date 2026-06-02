// Contraction photo — attach a photo to a contraction via camera or file picker.
// Stores as a base64 thumbnail (200x200). Shows thumbnail preview.

import { useRef } from 'react';
import { Camera, X } from 'lucide-react';

const MAX_SIZE = 200;
const MAX_BYTES = 180_000; // ~180KB for base64 thumbnail

type Props = {
  value?: string; // base64 thumbnail
  onChange: (data: string | undefined) => void;
};

async function resizeToThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = MAX_SIZE;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        // Square crop from center
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PhotoPicker({ value, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const base64 = await resizeToThumbnail(file);
      if (base64.length > MAX_BYTES) return; // Too large
      onChange(base64);
    } catch { /* ignore */ }
  };

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <img
            src={`data:image/jpeg;base64,${value}`}
            alt="Contraction"
            className="w-10 h-10 rounded-xl object-cover border border-ink-200/30"
          />
        </div>
        <button
          onClick={() => onChange(undefined)}
          className="p-1 text-ink-400 active:text-rose-300 transition-colors"
          aria-label="Remove photo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-1.5 text-xs text-ink-200 active:text-rose-200 px-2.5 py-1.5 rounded-lg border border-ink-200/30 active:bg-rose-300/10 transition-colors"
        aria-label="Attach photo"
      >
        <Camera className="w-3.5 h-3.5" />
        Photo
      </button>
    </div>
  );
}