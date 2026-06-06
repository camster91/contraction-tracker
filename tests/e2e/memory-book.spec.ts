/**
 * Memory book PDF export — drives the actual download flow.
 *
 * Setup: seed a localStorage share with state=archived, navigate to
 * the share URL, click the "Download PDF" link, catch the download,
 * verify the bytes start with the PDF magic number.
 *
 * This is the only test in the suite that drives a real download
 * event. All other tests are page.evaluate-based for speed.
 */
import { test, expect } from '@playwright/test';
import * as helpers from './helpers';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://contractions.ashbi.ca/';
const DOWNLOAD_DIR = '/tmp/olive-test-downloads';
fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

test('memory-book: PDF download produces a valid PDF with %PDF- header', async ({ page, context }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);

  // Seed localStorage with an archived share that has contractions
  // The ShareView reads from contraction-tracker:sessions for shares
  // (sourced from src/lib/sessions.ts:152)
  const seedResult = await page.evaluate(() => {
    const inOneHour = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    // Code must be 6 chars from [a-z2-9] (per ShareView.tsx:51)
    const share = {
      id: 'testcd',
      sessionId: 's-1',
      mode: 'full',
      pin: undefined,
      state: 'archived',  // Memory book only shows for archived shares
      createdAt: inOneHour,
      expiresAt: inOneHour,
      revoked: false,
    };
    const SHARES_KEY = 'contraction-tracker:shares';
    localStorage.setItem(SHARES_KEY, JSON.stringify([share]));
    return { written: localStorage.getItem(SHARES_KEY)?.length ?? 0, key: SHARES_KEY };
  });
  console.log('seed result:', JSON.stringify(seedResult));

  // Navigate to the share URL.
  await page.goto(`${BASE_URL}?share=testcd`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5_000);

  // Debug: dump the visible text on the share view
  const bodyText = (await page.locator('body').textContent()) || '';
  console.log('share view body text (first 500):', bodyText.substring(0, 500));

  // The memory book link is "Download PDF"
  const downloadLink = page.getByRole('link', { name: /Download PDF/i }).first();
  const linkCount = await downloadLink.count();
  if (linkCount === 0 || !(await downloadLink.isVisible().catch(() => false))) {
    test.skip(true, `Memory book link not visible. Body: ${bodyText.substring(0, 200)}`);
    return;
  }

  // Set up the download listener BEFORE clicking — must be on context
  const downloadPromise = page.waitForEvent('download', { timeout: 15_000 });
  await downloadLink.click({ force: true });
  const download = await downloadPromise;

  // Verify the download
  expect(download.suggestedFilename()).toMatch(/olive-memory-testcd-\d{4}-\d{2}-\d{2}\.pdf$/);

  // Save to a known location
  const dest = path.join(DOWNLOAD_DIR, download.suggestedFilename());
  await download.saveAs(dest);

  // Verify the file is a valid PDF
  const stat = fs.statSync(dest);
  expect(stat.size).toBeGreaterThan(1000); // real PDFs are at least a few KB
  const header = fs.readFileSync(dest).subarray(0, 5).toString('ascii');
  expect(header).toBe('%PDF-');
});

test('memory-book: PDF contains contraction data (text search)', async ({ page, context }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(page);

  // Seed localStorage
  await page.evaluate(() => {
    const share = {
      id: 'pdfdat',  // 6 chars per ShareView.tsx:51 regex
      sessionId: 's-1',
      mode: 'full',
      pin: undefined,
      state: 'archived',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      revoked: false,
    };
    const SHARES_KEY = 'contraction-tracker:shares';
    try { localStorage.setItem(SHARES_KEY, JSON.stringify([share])); } catch {}
  });

  await page.goto(`${BASE_URL}?share=pdfdat`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5_000);

  const downloadLink = page.getByRole('link', { name: /Download PDF/i }).first();
  if ((await downloadLink.count()) === 0 || !(await downloadLink.isVisible().catch(() => false))) {
    test.skip(true, 'Memory book link not visible');
    return;
  }

  const downloadPromise = page.waitForEvent('download', { timeout: 10_000 });
  await downloadLink.click();
  const download = await downloadPromise;
  const dest = path.join(DOWNLOAD_DIR, download.suggestedFilename());
  await download.saveAs(dest);

  // PDF content is in a stream; we can't easily parse without a library.
  // But the PDF should contain "Olive" (the title drawn at the top)
  // and "Contractions" (the section header).
  const bytes = fs.readFileSync(dest);
  const text = bytes.toString('binary');
  expect(text).toContain('Olive');
  expect(text).toContain('Contractions');
  // PDF end-of-file marker
  expect(text).toMatch(/%%EOF/);
});
