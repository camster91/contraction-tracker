// localStorage helpers — robust against quota errors / parse failures.
// Writes a secondary "shadow" key with the latest snapshot so a single corrupted key
// doesn't lose the entire history.

export type ValidationResult =
  | { ok: true; data: unknown }
  | { ok: false; reason: string };

/** Validate the shape of stored data. Returns the data if valid, or null/unpacked. */
export function validateStoredData(key: string): ValidationResult {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ok: true, data: undefined };
    const parsed = JSON.parse(raw);
    if (key === 'contraction-tracker:v1') {
      // Must be an object with a contractions array
      if (!parsed || typeof parsed !== 'object') return { ok: false, reason: 'Not a JSON object' };
      const stored = parsed as Record<string, unknown>;
      if (!Array.isArray(stored.contractions)) return { ok: false, reason: 'contractions is not an array' };
      // Each contraction must have id and start
      for (const c of stored.contractions as Record<string, unknown>[]) {
        if (!c || typeof c !== 'object') continue;
        if (!c.id || typeof c.id !== 'string') return { ok: false, reason: `Contraction missing valid id` };
        if (!c.start || typeof c.start !== 'string') return { ok: false, reason: `Contraction ${c.id} missing start` };
      }
      return { ok: true, data: parsed };
    }
    return { ok: true, data: parsed };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

export function load<T>(key: string, fallback: T): T {
  // First: validate the stored data shape
  const validated = validateStoredData(key);
  if (validated.ok) {
    if (validated.data === undefined) return fallback;
    return validated.data as T;
  }
  // Shape check failed — try shadow
  try {
    const shadow = localStorage.getItem(`${key}::shadow`);
    if (shadow) {
      const parsed = JSON.parse(shadow);
      // Heal the primary key from the shadow
      try { localStorage.setItem(key, shadow); } catch { /* ignore */ }
      return parsed as T;
    }
  } catch {
    /* both corrupted */
  }
  // Both corrupted — surface a recovery indicator
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem('olive:data-damaged', JSON.stringify({ key, reason: validated.reason }));
    } catch { /* ignore */ }
  }
  return fallback;
}

const failedKeys = new Set<string>();
export function isQuotaExceeded(): boolean { return failedKeys.size > 0; }
export function clearQuotaExceeded(): void { failedKeys.clear(); }

export function save(key: string, data: unknown): boolean {
  try {
    const json = JSON.stringify(data);
    localStorage.setItem(key, json);
    failedKeys.delete(key);
    // Mirror to shadow after every successful write — survives partial corruption
    try { localStorage.setItem(`${key}::shadow`, json); } catch { /* ignore */ }
    return true;
  } catch {
    // quota or serialization issue — surface to the user
    failedKeys.add(key);
    return false;
  }
}

/** Commit an import before changing UI state; roll back every touched key on failure. */
export function commitLocalStorageBatch(entries: { key: string; value: string; shadow?: boolean }[]): boolean {
  const original = new Map<string, string | null>();
  try {
    for (const entry of entries) {
      for (const key of entry.shadow ? [entry.key, `${entry.key}::shadow`] : [entry.key]) {
        if (!original.has(key)) original.set(key, localStorage.getItem(key));
      }
    }
    for (const entry of entries) {
      localStorage.setItem(entry.key, entry.value);
      if (entry.shadow) localStorage.setItem(`${entry.key}::shadow`, entry.value);
    }
    for (const entry of entries) failedKeys.delete(entry.key);
    return true;
  } catch {
    for (const [key, value] of original) {
      try {
        if (value === null) localStorage.removeItem(key);
        else if (localStorage.getItem(key) !== value) localStorage.setItem(key, value);
      } catch { failedKeys.add(key); }
    }
    for (const entry of entries) failedKeys.add(entry.key);
    return false;
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
