/**
 * Plain helpers — no fixtures, no persona context.
 * Imported by smoke tests that want to skip the persona-based fixture
 * to avoid a race with the live PWA's slow React mount.
 */
import type { Page } from '@playwright/test';

export async function waitForApp(page: Page) {
  await page.waitForFunction(
    () => {
      const root = document.getElementById('root');
      return root && root.children.length > 0 && (root.textContent || '').length > 50;
    },
    { timeout: 60_000, polling: 1000 },
  );
  await page.waitForTimeout(500);
}

export async function skipOnboardingIfPresent(page: Page) {
  const skip = page.getByRole('button', { name: /^Skip$/i }).first();
  const gotIt = page.getByRole('button', { name: /^(Got it|Next|Continue|Get started)$/i }).first();
  const start = page.getByRole('button').filter({ hasText: /^Start$/i }).first();

  // Try Skip first — fastest path
  if ((await skip.count()) > 0 && (await skip.isVisible().catch(() => false))) {
    try {
      await skip.click({ timeout: 2000 });
      await page.waitForTimeout(800);
      return;
    } catch {
      // fall through
    }
  }

  // Walk "Got it" up to 6 times (the onboarding has 3+ slides)
  for (let i = 0; i < 6; i++) {
    if ((await start.count()) > 0 && (await start.isVisible().catch(() => false))) {
      return;
    }
    if ((await gotIt.count()) > 0 && (await gotIt.isVisible().catch(() => false))) {
      try {
        await gotIt.click({ timeout: 2000 });
        await page.waitForTimeout(600);
      } catch {
        break;
      }
    } else {
      break;
    }
  }
}
