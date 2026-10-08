import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { waitForApp } from './helpers';

test('backup export from Settings restores records in a separate fresh installation', async ({ page, browser }, info) => {
  await page.addInitScript(() => {
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: Array.from({ length: 5 }, (_, i) => ({
      id: `backup-${i}`, sessionId: 'primary', start: new Date(Date.now() - (i + 1) * 5 * 60000).toISOString(), end: new Date(Date.now() - (i + 1) * 5 * 60000 + 60000).toISOString(), note: `BACKUP_NOTE_${i}`,
    })) }));
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export backup/  }).click();
  const exportedPath = info.outputPath('backup.json');
  await (await downloadPromise).saveAs(exportedPath);
  const exported = JSON.parse(await readFile(exportedPath, 'utf8'));
  expect(exported.app).toBe('olive-contraction-tracker');
  expect(exported.version).toBe(2);
  expect(exported.journey.schemaVersion).toBe(1);
  expect(exported.contractions).toHaveLength(5);
  for (let i = 0; i < 5; i++) expect(exported.contractions.some((record: { note: string }) => record.note === `BACKUP_NOTE_${i}`)).toBe(true);

  const fresh = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    await fresh.addInitScript(() => localStorage.setItem('contraction-tracker:onboarding-seen', '1'));
    const newPhone = await fresh.newPage();
    await newPhone.goto(process.env.PLAYWRIGHT_BASE_URL!, { waitUntil: 'domcontentloaded' });
    await waitForApp(newPhone);
    await expect(newPhone.getByText('History', { exact: true })).toHaveCount(0);
    await newPhone.locator('input[type="file"]').setInputFiles(exportedPath);
    await expect(newPhone.getByText(/Imported 5 contractions/)).toBeVisible();
    await expect.poll(() => newPhone.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:v1')!).contractions.map((record: { note: string }) => record.note).sort())).toEqual(Array.from({ length: 5 }, (_, i) => `BACKUP_NOTE_${i}`));
    await newPhone.reload({ waitUntil: 'domcontentloaded' });
    await waitForApp(newPhone);
    await expect(newPhone.getByRole('region', { name: 'Recent timing' })).toContainText('5 completed');
  } finally { await fresh.close(); }
});
