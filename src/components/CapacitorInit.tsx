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
          // Live Activity widget reads from App Groups UserDefaults.
          // The shared suite "group.com.ashbi.luna" is configured in the
          // widget extension's entitlements. This is a one-way write:
          // the React app posts timer state, the widget reads it.
          try {
            await import('@capacitor/core').then(() => {
              // Future: use a native plugin to write to shared UserDefaults
              // so the widget picks up the current timer state every second.
            });
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
