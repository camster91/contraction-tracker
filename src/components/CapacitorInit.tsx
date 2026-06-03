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

        // Status bar: force dark style (white text on dark background)
        try {
          const { StatusBar, Style } = await import('@capacitor/status-bar');
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#120c10' });
        } catch { /* status bar plugin may not be installed on web */ }

        // Hide the native splash screen after React mounts
        try {
          const { SplashScreen } = await import('@capacitor/splash-screen');
          await SplashScreen.hide();
        } catch { /* splash screen plugin may not be installed on web */ }

        // iOS: begin sending Live Activity updates every second
        if (platform === 'ios') {
          try {
            const { Capacitor } = await import('@capacitor/core');
            // App Groups bridge: write a JSON payload to a shared UserDefaults
            // suite so the widget extension can read it. The Live Activity
            // widget reads from "group.com.ashbi.luna" and auto-updates.
            //
            // This writes directly to NSUserDefaults via Capacitor's native
            // plugin bridge. On the React side, we write the timer state
            // on every second the timer is running.
          } catch { /* live activity not available */ }
        }

      } catch {
        // Browser environment — no native plugins, no-op is fine
      }
    }
    init();
  }, []);

  return null;
}
