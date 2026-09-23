import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the Olive Contraction Timer gauntlet.
 *
 * Targets a local production build by default. Set PLAYWRIGHT_BASE_URL to
 * the public URL only for an explicit post-deploy smoke run.
 *
 * The gauntlet runs scripted user paths across a persona matrix — see
 * tests/e2e/personas.ts for the matrix and tests/e2e/paths/ for the paths.
 *
 * Single project (chromium) by default. Add webkit/firefox once we have
 * the bugs ironed out — adding too many browsers in v1 produces noise.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8765/';

// Several legacy specs read PLAYWRIGHT_BASE_URL directly. Normalizing it here
// keeps those specs and Playwright's baseURL on the same target.
process.env.PLAYWRIGHT_BASE_URL = baseURL;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // iPhone 14 viewport — primary device for contraction timer
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },

  projects: [
    {
      name: 'iPhone 14 (chromium)',
      use: {
        // iPhone 14 dimensions, chromium engine.
        // Note: `devices['iPhone 14']` in Playwright maps to WebKit, not
        // Chromium. We want the chromium engine for our PWA testing, so
        // we explicitly set the iPhone-like viewport + touch + UA.
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      },
    },
    {
      // Real WebKit engine — closer to iOS Safari than chromium-fake-UA.
      // Opt-in: run with `npx playwright test --project='iPhone 14 (webkit)'`.
      // The shipped iOS app is a Capacitor wrapper around this same PWA,
      // so WebKit is the closer engine match for shipping bugs. CI does
      // not run this project by default — the CI workflow only installs
      // chromium. To run webkit in CI, also run
      // `npx playwright install --with-deps webkit` first.
      name: 'iPhone 14 (webkit)',
      use: {
        ...devices['iPhone 14'],
      },
    },
  ],

  webServer: baseURL.startsWith('http://127.0.0.1:8765') ? [{
      command: 'node node_modules/serve/build/main.js dist -l 8765 --no-clipboard',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    }] : [],

  // Output dirs are gitignored — Playwright writes to playwright-report/ and
  // test-results/ which we keep out of the repo.
});
