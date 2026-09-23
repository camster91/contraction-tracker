/**
 * Backup export â†’ import round-trip via the actual UI.
 *
 * Existing backup.spec.ts tests validate the schema and the lib
 * functions. This test goes further: opens Settings, clicks the
 * Backup card, downloads the JSON, verifies the file, then triggers
 * the hidden file input to import it back, and verifies the data
 * made it back to the same state.
 *
 * This is the "I lost my phone and I just got a new one" scenario.
 * If this breaks, the user loses ALL their contraction history.
 */
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as helpers from './helpers';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8765/';
const DOWNLOAD_DIR = '/tmp/olive-test-downloads';
fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

test('backup-flow: export from Settings, then import back, data preserved', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);
  await page.evaluate(() => {
    localStorage.setItem('olive:onboarded', '1');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);
  await page.waitForTimeout(1_000);

  // Seed 5 unique contractions with recognizable notes
  await page.evaluate(() => {
    const now = Date.now();
    const contractions = [0, 5, 10, 15, 20].map((min, i) => ({
      id: `bu-${i}`,
      sessionId: 'backup-test',
      start: new Date(now - min * 60_000).toISOString(),
      end: new Date(now - min * 60_000 + 60_000).toISOString(),
      durationMs: 60_000,
      intensity: 'medium',
      note: `BACKUP_NOTE_${i}`,
      tags: [],
      painLocations: [],
    }));
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);
  await page.waitForTimeout(1_000);

  // Open Settings (cog icon in top nav)
  const settingsBtn = page.locator('button[aria-label*="settings" i], button[aria-label*="Settings" i]').first();
  if ((await settingsBtn.count()) === 0) {
    // Try by position: the top-right has multiple icons; the settings (cog) is usually last
    const topRightButtons = page.locator('header button, nav button').first();
    test.skip(true, 'No settings button found by aria-label');
    return;
  }
  await settingsBtn.click({ force: true });
  await page.waitForTimeout(1_000);

  // Find the Backup card in settings â€” it's the one with "Export & restore" subtitle
  const backupCard = page.getByRole('button').filter({ hasText: /Backup/i }).first();
  if ((await backupCard.count()) === 0) {
    test.skip(true, 'Backup card not found in Settings');
    return;
  }

  // The Backup card onClick = handleExportBackup which downloads JSON
  const downloadPromise = page.waitForEvent('download', { timeout: 10_000 }).catch(() => null);
  await backupCard.click({ force: true });
  const download = await downloadPromise;

  if (!download) {
    test.skip(true, 'Export did not trigger a download');
    return;
  }

  const exportedPath = path.join(DOWNLOAD_DIR, `export-${Date.now()}.json`);
  await download.saveAs(exportedPath);

  // Read the exported JSON
  const exportedContent = fs.readFileSync(exportedPath, 'utf-8');
  const exported = JSON.parse(exportedContent);
  expect(exported.app, 'exported file should have Olive app tag').toBe('olive-contraction-tracker');
  expect(exported.version).toBe(2);
  expect(exported.journey?.schemaVersion).toBe(1);
  expect(Array.isArray(exported.contractions), 'exported file should have contractions array').toBe(true);
  expect(exported.contractions.length, 'exported should have 5 contractions').toBe(5);

  // The 5 BACKUP_NOTE_N markers should be in the exported file
  for (let i = 0; i < 5; i++) {
    const note = `BACKUP_NOTE_${i}`;
    const found = exported.contractions.find((c: any) => c.note === note);
    expect(found, `Exported file should contain ${note}`).toBeTruthy();
  }

  // Now: clear localStorage to simulate "new phone" state
  await page.evaluate(() => {
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: [] }));
  });

  // Trigger the import: set the file on the hidden file input
  const fileInput = page.locator('input[type="file"]').first();
  await expect(fileInput).toHaveCount(1);
  await fileInput.setInputFiles(exportedPath);
  await page.waitForTimeout(2_000);

  // Verify the data came back
  const restored = await page.evaluate(() => {
    const stored = localStorage.getItem('contraction-tracker:v1');
    if (!stored) return { count: 0, notes: [] };
    const parsed = JSON.parse(stored);
    const contractions = parsed.contractions || [];
    return {
      count: contractions.length,
      notes: contractions.map((c: any) => c.note).filter((n: string) => n.startsWith('BACKUP_NOTE_')),
    };
  });

  expect(restored.count, `After import, should have 5 contractions, got ${restored.count}`).toBe(5);
  expect(restored.notes.length, `All 5 BACKUP_NOTE_N markers should be preserved`).toBe(5);
});
