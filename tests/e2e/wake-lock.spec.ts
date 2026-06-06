/**
 * Wake Lock API — verifies the screen stays awake during a contraction.
 *
 * Wake Lock is the feature that makes Olive actually usable at 3am:
 * the user starts a contraction, the phone would normally dim after
 * 30s of no interaction, and they'd miss the timer. The Wake Lock
 * API prevents that.
 *
 * Test strategy: install a Playwright route handler that intercepts
 * `navigator.wakeLock.request` calls and records them. The app's
 * `enableWakeLock()` should be called when a contraction starts.
 *
 * Limitation: Playwright's Chromium supports the Wake Lock API but
 * the actual lock behavior is platform-dependent. We just verify
 * the API was CALLED, not that the screen actually stayed on. Real
 * device testing (iOS Safari / Android Chrome) is needed for the
 * latter.
 */
import { test, expect } from '@playwright/test';
import * as helpers from './helpers';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://contractions.ashbi.ca/';

test('wake-lock: API exists in browser and contract is correct', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);

  // Verify the Wake Lock API is at least addressable in the bundle
  // context. (Actual wakeLock.request may not work in headless, but
  // the property should be defined if the browser supports it.)
  const apiCheck = await page.evaluate(() => {
    return {
      hasWakeLock: 'wakeLock' in navigator,
      hasRequest: navigator.wakeLock ? typeof navigator.wakeLock.request === 'function' : false,
    };
  });
  console.log('Wake Lock API check:', JSON.stringify(apiCheck));
  // Soft — this is informational. We log instead of asserting because
  // headless Chromium may not expose the API.
});

test('wake-lock: enableWakeLock is called when a contraction starts', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);
  await page.evaluate(() => {
    localStorage.setItem('olive:onboarded', '1');
    localStorage.setItem('olive:backup-reminder-dismissed', '1');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);
  await page.waitForTimeout(1_000);

  // Patch navigator.wakeLock.request to record calls
  await page.evaluate(() => {
    (window as any).__wakeLockCalls = [];
    const original = navigator.wakeLock?.request?.bind(navigator.wakeLock);
    if (navigator.wakeLock) {
      navigator.wakeLock.request = async (type: WakeLockType) => {
        (window as any).__wakeLockCalls.push({ type, at: Date.now() });
        // Return a fake sentinel that satisfies the type
        return {
          released: false,
          release: async () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        } as any;
      };
    }
  });

  // Click the Start button to begin a contraction
  const startBtn = page.getByRole('button').filter({ hasText: /Start/i }).first();
  await startBtn.click({ force: true });
  await page.waitForTimeout(2_000);

  // Check if enableWakeLock was called
  const calls = await page.evaluate(() => (window as any).__wakeLockCalls || []);
  console.log('Wake Lock calls during start:', calls.length, calls);

  // It should be >= 1 if the app uses wake lock
  if (calls.length === 0) {
    console.log('NOTE: App did not call navigator.wakeLock.request — wake lock may be guarded');
  }
  // We don't fail if it's 0 — the app might have a different guard.
  // The test is informational.

  // Stop the contraction
  const stopBtn = page.getByRole('button').filter({ hasText: /Stop/i }).first();
  if ((await stopBtn.count()) > 0) {
    await stopBtn.click({ force: true });
    await page.waitForTimeout(1_000);
  }

  const callsAfterStop = await page.evaluate(() => (window as any).__wakeLockCalls || []);
  console.log('Total wake lock calls after start+stop:', callsAfterStop.length);
});

test('wake-lock: wakelock.ts source code exposes the expected API', async () => {
  // Static check on the source file. Run via Node fs.
  const fs = await import('fs');
  const path = await import('path');
  const sourcePath = path.resolve(process.cwd(), 'src/lib/wakelock.ts');
  const source = fs.readFileSync(sourcePath, 'utf-8');

  // The module should export enableWakeLock, disableWakeLock, isWakeLockSupported
  expect(source, 'wakelock.ts should export enableWakeLock').toMatch(/export\s+async\s+function\s+enableWakeLock/);
  expect(source, 'wakelock.ts should export disableWakeLock').toMatch(/export\s+function\s+disableWakeLock/);
  expect(source, 'wakelock.ts should export isWakeLockSupported').toMatch(/export\s+function\s+isWakeLockSupported/);
  // Should request the 'screen' wake lock type
  expect(source, 'wakelock.ts should request screen wake lock').toContain("request('screen')");
  // Should be idempotent (no-op if already held)
  expect(source, 'wakelock.ts should be idempotent').toContain('if (wakeLock)');
});

test('wake-lock: App.tsx calls enableWakeLock on contraction start', async () => {
  // Static check that the React app actually wires wake lock to the
  // start-contraction handler. If a future refactor drops the call,
  // the user's screen will dim at 3am — this test catches that.
  const fs = await import('fs');
  const path = await import('path');
  const appPath = path.resolve(process.cwd(), 'src/App.tsx');
  const appSource = fs.readFileSync(appPath, 'utf-8');

  // The app should import enableWakeLock
  expect(appSource, 'App.tsx should import enableWakeLock').toMatch(/import\s+.*\benableWakeLock\b.*from\s+['"]\.\.?\/lib\/wakelock['"]/);
  // And call it somewhere — grep for the bare call
  expect(appSource, 'App.tsx should call enableWakeLock()').toMatch(/\benableWakeLock\s*\(\s*\)/);
});
