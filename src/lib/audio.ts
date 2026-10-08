// Audio feedback for Olive. Two layers:
//   1. Tones — short, warm, generated with Web Audio (no asset downloads, no latency).
//   2. Speech — uses SpeechSynthesis so iOS Safari / Android Chrome pick the OS voice.
//
// Sound is opt-out. Default ON. Quiet hours (mute schedule) override sound without
// changing the user's saved preference.

let audioCtx: AudioContext | null = null;
let muted = false;
let inQuietHours = false;
let unlocked = false;

/** Called by the settings module when the mute schedule changes. */
export function setInQuietHours(value: boolean) {
  inQuietHours = value;
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  // iOS suspends the context on creation. Resume on first user gesture.
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/** Must be called from a user gesture (button click) — iOS requires this. */
export function unlockAudio() {
  if (unlocked) return;
  const ctx = getCtx();
  if (!ctx) return;
  // Play a silent buffer to satisfy the gesture requirement
  const buf = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
  unlocked = true;
}

export function setMuted(value: boolean) {
  muted = value;
}

export function isMuted() {
  return muted;
}

/** Warm meditation-bell tone. freq in Hz, dur in seconds, gain 0-1. */
export function playTone(freq = 528, dur = 0.6, gain = 0.18) {
  if (muted || inQuietHours) return;
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1800;

  // Soft attack, exponential decay — feels like a bell struck, not a beep
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);
  // Subtle pitch droop for warmth
  osc.frequency.exponentialRampToValueAtTime(freq * 0.96, now + dur);

  osc.connect(lp);
  lp.connect(g);
  g.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + dur + 0.05);
}

/** Two-note start chime — rising interval signals "begin." */
export function chimeStart() {
  if (muted) return;
  playTone(523.25, 0.4, 0.16); // C5
  setTimeout(() => playTone(659.25, 0.5, 0.16), 140); // E5
}

/** Two-note end chime — falling interval signals "done." */
export function chimeStop() {
  if (muted) return;
  playTone(659.25, 0.4, 0.16); // E5
  setTimeout(() => playTone(523.25, 0.5, 0.16), 140); // C5
}

/** Single low tone for a saved care-plan reminder — attention without alarm. */
export function chimeAlert() {
  if (muted) return;
  // Three soft pulses
  playTone(440, 0.25, 0.18);
  setTimeout(() => playTone(440, 0.25, 0.18), 320);
  setTimeout(() => playTone(440, 0.4, 0.18), 640);
}

// ---- Speech ----

let preferredVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  if (preferredVoice) return preferredVoice;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  // Prefer a calm, natural-sounding voice. iOS has "Samantha" and "Karen",
  // Android has "Google" voices. We try several name patterns.
  const prefs = [
    'Samantha', 'Karen', 'Google US English', 'Google UK English Female',
    'Microsoft Aria Online (Natural) - English (United States)',
    'Microsoft Jenny Online (Natural)', 'en-US', 'en-GB',
  ];
  for (const p of prefs) {
    const match = voices.find((v) => v.name === p || v.lang === p);
    if (match) { preferredVoice = match; return match; }
  }
  // Fall back to the first English voice
  const en = voices.find((v) => v.lang?.startsWith('en'));
  if (en) { preferredVoice = en; return en; }
  preferredVoice = voices[0] || null;
  return preferredVoice;
}

// Some browsers (notably Chrome) load voices asynchronously
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => { preferredVoice = null; pickVoice(); };
}

let lastSpeechAt = 0;
export function speak(text: string, opts: { rate?: number; pitch?: number } = {}) {
  // Quiet hours apply to all speech, including saved reminders.
  if (muted || inQuietHours) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  // Throttle to avoid talking over itself
  if (Date.now() - lastSpeechAt < 800) return;
  lastSpeechAt = Date.now();

  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.rate = opts.rate ?? 0.95;
  u.pitch = opts.pitch ?? 1.0;
  u.volume = 0.9;
  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* speech engine not available in this context */
  }
}

export function stopSpeaking() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
}

export function isSpeechAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
