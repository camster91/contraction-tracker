import { Capacitor, registerPlugin } from '@capacitor/core';

type TimerNotificationPlugin = {
  start(options: { startEpochMs: number }): Promise<void>;
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
      await nativeTimer.start({ startEpochMs });
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
