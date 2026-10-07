// CapacitorInit — initializes native Capacitor plugins when running on iOS/Android.
// Guards against running in browser with Capacitor.isNativePlatform().

import { useEffect } from 'react';

export function CapacitorInit() {
  useEffect(() => {
    async function init() {
      // Check if running on a native platform (Capacitor web-view)
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const platform = Capacitor.getPlatform();

        // Keep status bar contrast consistent with the saved appearance.
        try {
          const { StatusBar, Style } = await import('@capacitor/status-bar');
          await StatusBar.setStyle({ style: localStorage.getItem('contraction-tracker:theme') === 'cool' ? Style.Light : Style.Dark });
          if (platform === 'android') await StatusBar.setBackgroundColor({ color: localStorage.getItem('contraction-tracker:theme') === 'cool' ? '#F5F1E7' : '#26382C' });
        } catch { /* status bar plugin may not be installed on web */ }

        // Hide the native splash screen after React mounts
        try {
          const { SplashScreen } = await import('@capacitor/splash-screen');
          await SplashScreen.hide();
        } catch { /* splash screen plugin may not be installed on web */ }
      } catch {
        // Browser environment — no native plugins, no-op is fine
      }
    }
    init();
  }, []);

  return null;
}
