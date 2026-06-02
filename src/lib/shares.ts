// Add mode to share type. Backward-compat: old shares without mode default to 'full'.

export type ShareMode = 'full' | 'stats' | 'track';

export function getShareModes(): { value: ShareMode; label: string; description: string }[] {
  return [
    { value: 'full', label: 'Full details', description: 'All contraction times and stats' },
    { value: 'stats', label: 'Stats only', description: 'Averages and patterns, no individual times' },
    { value: 'track', label: 'Partner tracking', description: 'Can start/stop contractions from their device' },
  ];
}
