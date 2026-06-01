// Screen Wake Lock — prevents the device from sleeping while a contraction
// is being timed. iOS Safari 16.4+ and Android Chrome support this; on
// older browsers we just no-op and the screen will sleep as usual.

let wakeLock: WakeLockSentinel | null = null;
let wantActive = false;

export function isWakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

async function acquire() {
  if (!isWakeLockSupported()) return;
  if (wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    // The lock is released automatically when the tab loses visibility
    // (e.g. user switches apps). Re-acquire when the tab becomes visible
    // again, if the caller still wants it active.
    wakeLock.addEventListener('release', () => {
      wakeLock = null;
      if (wantActive) {
        // Best-effort re-acquire; may fail if document is still hidden
        acquire().catch(() => {});
      }
    });
  } catch {
    /* user denied, low battery, or other failure — silently fall through */
    wakeLock = null;
  }
}

function release() {
  if (wakeLock) {
    try { wakeLock.release(); } catch { /* ignore */ }
    wakeLock = null;
  }
}

/** Request the wake lock if not already held. Idempotent. */
export async function enableWakeLock() {
  wantActive = true;
  await acquire();
}

/** Release the wake lock. Safe to call when not held. */
export function disableWakeLock() {
  wantActive = false;
  release();
}

/** Re-acquire on visibility change when wantActive is true. Call once on mount. */
export function installWakeLockVisibilityHandler() {
  if (typeof document === 'undefined') return;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wantActive) {
      acquire().catch(() => {});
    }
  });
}
