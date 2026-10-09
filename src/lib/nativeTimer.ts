import { Capacitor, registerPlugin } from '@capacitor/core';

type TimerNotificationPlugin = {
  start(options: { startEpochMs: number }): Promise<{ supported?: boolean; enabled?: boolean }>;
  stop(): Promise<void>;
};

const timerNotification = registerPlugin<TimerNotificationPlugin>('OliveTimerNotification');
const liveActivity = registerPlugin<TimerNotificationPlugin>('OliveLiveActivity');

export async function syncNativeTimerNotification(startIso: string | null): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  const nativeTimer = Capacitor.getPlatform() === 'ios' ? liveActivity : timerNotification;
  try {
    if (startIso) {
      const startEpochMs = Date.parse(startIso);
      if (!Number.isFinite(startEpochMs)) return false;
      const availability = await nativeTimer.start({ startEpochMs });
      if (availability?.supported === false || availability?.enabled === false) return false;
    } else {
      await nativeTimer.stop();
    }
    return true;
  } catch {
    // The web timer remains authoritative if notification permission is denied
    // or an older native shell does not yet include the plugin.
    return false;
  }
}
