/** The OS reports dismissal differently from an actual sharing failure. */
export function isShareCancellation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const details = error as { name?: unknown; message?: unknown };
  return details.name === 'AbortError'
    || (typeof details.message === 'string' && /^Share cancel(?:led|ed)$/i.test(details.message));
}
