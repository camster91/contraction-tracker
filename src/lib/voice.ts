// Voice-triggered start/stop using the Web Speech Recognition API.
// Works on iOS Safari (webkitSpeechRecognition) and Chrome.
// Runs entirely on-device — no network requests, no cloud services.
//
// Keywords: "start", "stop", "done", "begin", "end"
// When listening, a small mic icon pulses in the header.
// Stop actions require 2-tap confirmation: same phrase spoken twice within 3s.
// Start actions are single-tap.
/* eslint-disable @typescript-eslint/no-explicit-any */

let recognition: any = null;
let listening = false;
let onStartCallback: (() => void) | null = null;
let onStopCallback: (() => void) | null = null;

// Pending stop confirmation state: requires the same phrase twice within 3s
let pendingStop: string | null = null;
let pendingStopAt: number = 0;
const STOP_CONFIRM_WINDOW_MS = 3_000;

const START_WORDS = ['start', 'begin', 'go', 'now'];
const STOP_WORDS = ['stop', 'done', 'end', 'over', 'finished'];

export function getPendingVoiceStop(): { phrase: string; msRemaining: number } | null {
  if (!pendingStop) return null;
  const elapsed = Date.now() - pendingStopAt;
  const remaining = STOP_CONFIRM_WINDOW_MS - elapsed;
  if (remaining <= 0) {
    pendingStop = null;
    return null;
  }
  return { phrase: pendingStop, msRemaining: remaining };
}

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
        // Clear any expired pending stop
        if (pendingStop && Date.now() - pendingStopAt > STOP_CONFIRM_WINDOW_MS) {
          pendingStop = null;
        }
        if (first && START_WORDS.includes(first)) {
          // Start is single-tap — cancel any pending stop first
          pendingStop = null;
          onStartCallback?.();
          return;
        }
        if (first && STOP_WORDS.includes(first)) {
          if (pendingStop === first) {
            // Same phrase spoken twice within window — confirmed stop
            pendingStop = null;
            onStopCallback?.();
            return;
          }
          // First occurrence — set pending confirmation
          pendingStop = first;
          pendingStopAt = Date.now();
          return;
        }
        // Non-command word heard — cancel pending stop
        if (first && !START_WORDS.includes(first) && !STOP_WORDS.includes(first)) {
          pendingStop = null;
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
  // Reset pending state on fresh start
  pendingStop = null;
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
  pendingStop = null;
  try {
    recognition?.stop();
  } catch {
    // Already stopped
  }
}

export function isListening(): boolean {
  return listening;
}