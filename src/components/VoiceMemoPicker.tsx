// Voice memo recorder — records up to 30 seconds of audio attached to a contraction.
// Uses MediaRecorder API. Stores as base64. Shows recording UI and playback UI.

import { useState, useRef } from 'react';
import { Mic, Square, Play, Pause, X } from 'lucide-react';

const MAX_SECONDS = 30;
const MAX_BYTES = 500_000; // ~500KB max for base64 audio

type Props = {
  value?: string; // base64 audio
  onChange: (data: string | undefined) => void;
};

export default function VoiceMemoPicker({ value, onChange }: Props) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          if (base64.length > MAX_BYTES) {
            // Too large — skip
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          onChange(base64);
          stream.getTracks().forEach((t) => t.stop());
        };
        reader.readAsDataURL(blob);
      };

      recorder.start(100);
      setRecording(true);
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s >= MAX_SECONDS - 1) {
            stopRecording();
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      // Microphone access denied or not available
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const togglePlayback = () => {
    if (!value) return;
    if (!audioRef.current) {
      const audio = new Audio(`data:audio/webm;base64,${value}`);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const clearMemo = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(false);
    onChange(undefined);
  };

  if (value && !recording) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={togglePlayback}
          className="flex items-center gap-1.5 text-xs text-rose-300 active:text-rose-200 px-2.5 py-1.5 rounded-lg border border-rose-300/30 active:bg-rose-300/10 transition-colors"
          aria-label={playing ? 'Pause memo' : 'Play memo'}
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          Voice memo
        </button>
        <button
          onClick={clearMemo}
          className="p-1 text-ink-400 active:text-rose-300 transition-colors"
          aria-label="Remove memo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!recording ? (
        <button
          onClick={startRecording}
          className="flex items-center gap-1.5 text-xs text-ink-200 active:text-rose-200 px-2.5 py-1.5 rounded-lg border border-ink-200/30 active:bg-rose-300/10 transition-colors"
          aria-label="Record voice memo"
        >
          <Mic className="w-3.5 h-3.5" />
          Record
        </button>
      ) : (
        <>
          <div className="flex items-center gap-1.5 text-xs text-rose-300">
            <div className="w-2 h-2 rounded-full bg-rose-300 animate-pulse" />
            {seconds}s / {MAX_SECONDS}s
          </div>
          <button
            onClick={stopRecording}
            className="flex items-center gap-1.5 text-xs text-ink-200 active:bg-rose-300/10 px-2.5 py-1.5 rounded-lg border border-rose-300/40 transition-colors"
            aria-label="Stop recording"
          >
            <Square className="w-3 h-3 fill-current" />
            Stop
          </button>
        </>
      )}
    </div>
  );
}