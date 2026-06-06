import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the Luna Contraction Timer gauntlet.
 *
 * Targets the live PWA at contractions.ashbi.ca by default. Override with
 * PLAYWRIGHT_BASE_URL=http://localhost:5173 for local dev.
 *
 * The gauntlet runs scripted user paths across a persona matrix — see
 * tests/e2e/personas.ts for the matrix and tests/e2e/paths/ for the paths.
 *
 * Single project (chromium) by default. Add webkit/firefox once we have
 * the bugs ironed out — adding too many browsers in v1 produces noise.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list'], ['html', { open: 'never' }]],
  outputDir: 'playwright-report/test-results',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'https://contractions.ashbi.ca',
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
  ],

  // Output dirs are gitignored — Playwright writes to playwright-report/ and
  // test-results/ which we keep out of the repo.
});
