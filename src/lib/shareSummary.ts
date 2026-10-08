import { Capacitor } from '@capacitor/core';
import { isShareCancellation } from './shareCancellation.ts';

/** Share a readable message body through the user's chosen destination. */
export async function shareSummary(text: string): Promise<'shared' | 'cancelled' | 'copied'> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: 'Olive care summary', text, dialogTitle: 'Share your Olive summary' });
    } else if (navigator.share) {
      await navigator.share({ title: 'Olive care summary', text });
    } else {
      await navigator.clipboard.writeText(text);
      return 'copied';
    }
    return 'shared';
  } catch (error) {
    if (isShareCancellation(error)) return 'cancelled';
    throw error;
  }
}
