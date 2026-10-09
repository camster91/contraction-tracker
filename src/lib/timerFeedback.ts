import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/** Feedback must never interrupt the authoritative in-app timer. */
export async function timerFeedback(action: 'start' | 'stop'): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      if (action === 'start') await Haptics.impact({ style: ImpactStyle.Medium });
      else await Haptics.notification({ type: NotificationType.Success });
    } else {
      navigator.vibrate?.(action === 'start' ? 80 : [60, 40, 60]);
    }
  } catch { /* Devices without haptic support keep the visual and audio feedback. */ }
}
