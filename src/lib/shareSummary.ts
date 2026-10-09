import { Capacitor } from '@capacitor/core';
import { isShareCancellation } from './shareCancellation.ts';

export type ShareSummaryResult = 'shared' | 'cancelled' | 'copied' | 'manual';

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Share a readable message body through the user's chosen destination.
 *
 * `manual` means that the share surface was unavailable or failed and the
 * caller should present a selectable/manual copy path. We intentionally do
 * not write to the clipboard after a share surface rejects: on iOS and in
 * browsers that rejection commonly means the person cancelled, and an
 * automatic clipboard write would copy private care data without consent.
 * The clipboard fallback is used only when Web Share is unavailable.
 */
export async function shareSummary(text: string): Promise<ShareSummaryResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: 'Olive care summary', text, dialogTitle: 'Share your Olive summary' });
      return 'shared';
    } catch (error) {
      return isShareCancellation(error) ? 'cancelled' : 'manual';
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'Olive care summary', text });
      return 'shared';
    } catch (error) {
      return isShareCancellation(error) ? 'cancelled' : 'manual';
    }
  }

  return (await copyToClipboard(text)) ? 'copied' : 'manual';
}
