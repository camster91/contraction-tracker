// localStorage helpers — robust against quota errors / parse failures.
// Writes a secondary "shadow" key with the latest snapshot so a single corrupted key
// doesn't lose the entire history.

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw) as T;
    }
  } catch {
    /* corrupted — fall through to shadow */
  }
  // Try the shadow key for the most recent successful write
  try {
    const shadow = localStorage.getItem(`${key}::shadow`);
    if (shadow) {
      const parsed = JSON.parse(shadow);
      // Heal the primary key from the shadow so subsequent loads are fast
      try { localStorage.setItem(key, shadow); } catch { /* ignore */ }
      return parsed as T;
    }
  } catch {
    /* both corrupted */
  }
  return fallback;
}

export function save(key: string, data: unknown) {
  const json = JSON.stringify(data);
  try {
    localStorage.setItem(key, json);
    // Mirror to shadow after every successful write — survives partial corruption
    try { localStorage.setItem(`${key}::shadow`, json); } catch { /* ignore */ }
  } catch {
    /* quota or serialization issue — silently ignore */
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
