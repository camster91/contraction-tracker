#!/usr/bin/env node
// Shoot fresh App Store listing screenshots from the real v1.3.0 UI.
// Replaces the stale set that still shows the removed Share feature.
// Usage: node scripts/shoot-store-screenshots.mjs [--out store-assets/screenshots]

import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { expect } from '@playwright/test';

const root = new URL('..', import.meta.url).pathname;
const profile = process.env.OLIVE_PROFILE || 'iphone67';
const PROFILES = {
  iphone67: { dir: '6.7_iphone', W: 430, H: 932, DSF: 3 },
  iphone61: { dir: '6.1_iphone', W: 393, H: 852, DSF: 3 },
  iphone55: { dir: '5.5_iphone', W: 414, H: 736, DSF: 3 },
  ipad129: { dir: '12.9_ipad', W: 1024, H: 1366, DSF: 2 },
  play: { dir: 'play_phone', W: 360, H: 640, DSF: 3 },
  playTablet7: { dir: 'play_tablet_7', W: 720, H: 1280, DSF: 2 },
  playTablet10: { dir: 'play_tablet_10', W: 900, H: 1600, DSF: 2 },
};
if (!PROFILES[profile]) throw new Error(`Unknown screenshot profile: ${profile}`);
const { dir, W, H, DSF } = PROFILES[profile];
const outFlag = process.argv.indexOf('--out');
const outputRoot = outFlag >= 0 ? process.argv[outFlag + 1] : path.join(root, 'store-assets/screenshots');
if (!outputRoot || outputRoot.startsWith('--')) throw new Error('--out requires a directory');
const out = `${path.resolve(outputRoot, dir)}/`;
mkdirSync(out, { recursive: true });

const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();

const seedBase = {
  'contraction-tracker:onboarding-seen': '1',
  'contraction-tracker:backup-dismissed': JSON.stringify(Date.now()),
};

function contraction(startMin, durSec, extra = {}) {
  const start = new Date(Date.now() - startMin * 60_000);
  const end = new Date(start.getTime() + durSec * 1000);
  return {
    id: `shot-${startMin}-${durSec}`,
    start: start.toISOString(),
    end: end.toISOString(),
    intensity: extra.intensity ?? null,
    note: extra.note ?? '',
    tags: extra.tags ?? [],
    sessionId: 'primary',
    ...(extra.painLocations ? { painLocations: extra.painLocations } : {}),
  };
}

async function freshPage(browser, seed = {}) {
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: DSF,
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  await page.addInitScript((s) => {
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  }, { ...seedBase, ...seed });
  await page.goto(server, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Olive', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sessions', exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  return { context, page };
}

const browser = await chromium.launch();
const server = process.env.OLIVE_URL || 'http://127.0.0.1:5173/';

try {
  // 01 — hero timer (honest fresh install: Start button and care access)
  {
    const { context, page } = await freshPage(browser);
    await expect(page.getByRole('button', { name: /^Start/ })).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: `${out}01-hero-timer.png` });
    await context.close();
  }

  // 02 — contraction in progress (started 45s ago)
  {
    const { context, page } = await freshPage(browser, {
      'contraction-tracker:current': JSON.stringify({
        id: 'shot-active',
        start: new Date(Date.now() - 45_000).toISOString(),
        end: null,
        intensity: null,
      }),
    });
    await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: `${out}02-contraction-active.png` });
    await context.close();
  }

  // 03 — history (5 contractions across 38 min, resting between)
  {
    const { context, page } = await freshPage(browser, {
      'contraction-tracker:v1': JSON.stringify({
        contractions: [
          contraction(38, 55),
          contraction(29, 70, { intensity: 4 }),
          contraction(22, 60),
          contraction(13, 75, { intensity: 6, tags: ['back labor'] }),
          contraction(5, 65),
        ],
      }),
    });
    await page.waitForTimeout(800);
    await page.getByText('History', { exact: true }).evaluate(element => element.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: `${out}03-history.png` });
    await context.close();
  }

  // 04 — forgot to tap (manual entry sheet) — replaces the removed share shot
  {
    const { context, page } = await freshPage(browser, {
      'contraction-tracker:v1': JSON.stringify({
        contractions: [contraction(12, 60), contraction(21, 55)],
      }),
    });
    await page.getByText('Forgot to tap').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}04-add-missed.png` });
    await context.close();
  }

  // 05 — care-plan reminder matched (call button visible)
  {
    const { context, page } = await freshPage(browser, {
      'contraction-tracker:care-plan': JSON.stringify({
        enabled: true,
        providerName: 'Example care team',
        providerPhone: '+1 (416) 555-0134',
        intervalMinutes: 5,
        durationSeconds: 45,
        windowMinutes: 20,
      }),
      'contraction-tracker:v1': JSON.stringify({
        contractions: [
          contraction(19, 60, { intensity: 5 }),
          contraction(14, 60),
          contraction(9, 65),
          contraction(4, 60, { intensity: 7 }),
        ],
      }),
    });
    const reminder = page.getByText('Saved care-plan reminder', { exact: true });
    await expect(reminder).toBeVisible();
    await reminder.evaluate(element => element.parentElement.parentElement.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: `${out}05-care-plan-reminder.png` });
    await context.close();
  }

  console.log(`Shot fresh screenshots into ${out}`);
} finally {
  await browser.close();
}
