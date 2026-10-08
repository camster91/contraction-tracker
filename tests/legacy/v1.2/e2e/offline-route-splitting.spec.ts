import { expect, test } from '@playwright/test';
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { waitForApp } from './helpers';

test('route-split host and unvisited lazy modules remain available after the network goes offline', async ({ page, context }) => {
  await page.addInitScript(() => {
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
  });
  await page.goto('/');
  await waitForApp(page);

  const cacheEvidence = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    const serviceWorkerSource = await fetch('/sw.js', { cache: 'no-store' }).then((response) => response.text());
    const cacheName = serviceWorkerSource.match(/const CACHE_NAME = '([^']+)'/)?.[1];
    if (!cacheName) throw new Error('Unable to resolve the deployed service-worker cache name');
    const manifest = await fetch('/build-manifest.json').then((response) => response.json());
    const manifestFiles = [...new Set(Object.values(manifest).flatMap((entry: any) => (
      entry && typeof entry === 'object'
        ? [entry.file, ...(entry.css || []), ...(entry.assets || [])]
        : []
    )).filter((file): file is string => typeof file === 'string').map((file) => `/${file.replace(/^\//, '')}`))];
    const routeFiles = Object.values(manifest)
      .filter((entry: any) => entry?.isDynamicEntry && typeof entry.file === 'string')
      .map((entry: any) => `/${entry.file}`);
    const viewerFile = routeFiles.find((file: string) => file.includes('/ShareView-'));
    const cache = await caches.open(cacheName);
    const missing: string[] = [];
    for (const file of ['/index.html', '/build-manifest.json', ...manifestFiles]) {
      if (!(await cache.match(file))) missing.push(file);
    }
    return { routeFiles, viewerFile, manifestFiles, missing };
  });

  expect(cacheEvidence.routeFiles.length).toBeGreaterThanOrEqual(2);
  expect(cacheEvidence.viewerFile).toBeTruthy();
  expect(cacheEvidence.manifestFiles.some((file) => file.includes('fontkit'))).toBe(true);
  expect(cacheEvidence.manifestFiles.some((file) => file.includes('pdf-lib'))).toBe(true);
  expect(cacheEvidence.manifestFiles.filter((file) => file.includes('noto-sans-arabic')).length).toBe(4);
  expect(cacheEvidence.missing).toEqual([]);

  // A service worker cannot intercept the navigation that installed it.
  // Reload once online to establish the returning-user, controlled-page state
  // that the offline launch guarantee applies to.
  await page.reload();
  await waitForApp(page);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Start Tap when it begins/i })).toBeVisible();

    const viewerModuleType = await page.evaluate(async (file) => {
      const loadModule = new Function('path', 'return import(path)');
      const module = await loadModule(file);
      return typeof module.default;
    }, cacheEvidence.viewerFile!);
    expect(viewerModuleType).toBe('function');
  } finally {
    await context.setOffline(false);
  }
});

test('an unvisited Canadian French memory-book PDF downloads with the network offline', async ({ page, context }) => {
  await page.addInitScript(() => {
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('olive:message-locale', 'fr-CA');
  });
  await page.goto('/');
  await waitForApp(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await waitForApp(page);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.evaluate(() => {
    const now = Date.now();
    localStorage.setItem('contraction-tracker:shares', JSON.stringify([{
      id: 'offpdf', sessionId: 'offline-pdf', mode: 'full', state: 'archived',
      createdAt: new Date(now).toISOString(), expiresAt: new Date(now + 3_600_000).toISOString(), revoked: false,
    }]));
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: [{
      id: 'off-c1', sessionId: 'offline-pdf', start: new Date(now - 120_000).toISOString(),
      end: new Date(now - 60_000).toISOString(), durationMs: 60_000, intensity: 6,
    }] }));
  });
  // Load the read-only share shell online, then prove its lazily imported PDF
  // stack and bundled fonts work after the network is removed.
  await page.goto('/?share=offpdf');
  const link = page.getByRole('link', { name: 'Télécharger le PDF' });
  await expect(link).toBeVisible();

  await context.setOffline(true);
  try {
    const downloadPromise = page.waitForEvent('download');
    await link.click();
    const download = await downloadPromise;
    const destination = join(tmpdir(), `olive-fr-offline-${Date.now()}.pdf`);
    await download.saveAs(destination);
    expect(readFileSync(destination).subarray(0, 5).toString('ascii')).toBe('%PDF-');
    const extracted = execFileSync('pdftotext', [destination, '-'], { encoding: 'utf8', timeout: 10_000 });
    expect(extracted).toContain('Album-souvenir du travail');
    expect(extracted).toContain('Nombre total de contractions : 1');
  } finally {
    await context.setOffline(false);
  }
});
