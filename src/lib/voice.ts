// Voice-triggered start/stop using the Web Speech Recognition API.
// Works on iOS Safari (webkitSpeechRecognition) and Chrome.
// Runs entirely on-device — no network requests, no cloud services.
//
// Keywords: "start", "stop", "done", "begin", "end"
// When listening, a small mic icon pulses in the header.
/* eslint-disable @typescript-eslint/no-explicit-any */

let recognition: any = null;
let listening = false;
let onStartCallback: (() => void) | null = null;
let onStopCallback: (() => void) | null = null;

const START_WORDS = ['start', 'begin', 'go', 'now'];
const STOP_WORDS = ['stop', 'done', 'end', 'over', 'finished'];

function getRecognition(): any {
  if (typeof window === 'undefined') return null;
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  if (!recognition) {
    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        // Only fire on a transcript that's a short, clear command — under
        // 4 words. This prevents false positives from "I want to stop" or
        // background chatter.
        const words = transcript.split(/\s+/);
        if (words.length > 4) continue;
        // First word wins — if the user says "start now", we start.
        const first = words[0]?.replace(/[^a-z]/g, '');
        if (first && START_WORDS.includes(first)) {
          onStartCallback?.();
          return;
        }
        if (first && STOP_WORDS.includes(first)) {
          onStopCallback?.();
          return;
        }
        // Fallback for single-word transcripts: any matching word counts.
        if (words.length === 1) {
          if (START_WORDS.includes(first)) {
            onStartCallback?.();
            return;
          }
          if (STOP_WORDS.includes(first)) {
            onStopCallback?.();
            return;
          }
        }
      }
    };
    recognition.onerror = () => {
      if (listening) {
        try { recognition?.start(); } catch { /* ignore */ }
      }
    };
    recognition.onend = () => {
      if (listening) {
        try { recognition?.start(); } catch { /* ignore */ }
      }
    };
  }
  return recognition;
}

export function isVoiceSupported(): boolean {
  return !!(typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
}

export function startListening(onStart: () => void, onStop: () => void) {
  const sr = getRecognition();
  if (!sr) return;
  onStartCallback = onStart;
  onStopCallback = onStop;
  listening = true;
  try {
    sr.start();
  } catch {
    // Already started — ignore
  }
}

export function stopListening() {
  listening = false;
  onStartCallback = null;
  onStopCallback = null;
  try {
    recognition?.stop();
  } catch {
    // Already stopped
  }
}

export function isListening(): boolean {
  return listening;
}
