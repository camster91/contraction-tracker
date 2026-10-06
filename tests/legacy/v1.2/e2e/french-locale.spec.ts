import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { waitForApp } from './helpers';

test.describe('Canadian French production locale', () => {
  test.use({ locale: 'fr-CA' });

  test('a fresh French-device install renders the core safety journey in French', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('contraction-tracker:onboarding-seen', '1');
      localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
    });
    await page.goto('/');
    await waitForApp(page);

    await expect(page.locator('html')).toHaveAttribute('lang', 'fr-CA');
    await expect(page).toHaveTitle('Olive — Minuteur de contractions');
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest-fr-ca.webmanifest');
    await expect(page.getByRole('button', { name: /Démarrer Touchez dès que/i })).toBeVisible();
    await page.getByText('Besoin d’aide maintenant?', { exact: true }).click();
    await expect(page.getByText(/N’attendez pas qu’un schéma de chronométrage apparaisse/i)).toBeVisible();
    await page.getByRole('button', { name: 'Réglages' }).click();
    const settings = page.getByRole('dialog', { name: 'Réglages' });
    await expect(settings.getByLabel('Langue')).toHaveValue('fr-CA');
    await expect(settings.getByRole('link', { name: 'Contacter le soutien Olive' })).toHaveAttribute('href', '/fr-ca/support/');
    await expect(settings.getByRole('link', { name: /Confidentialité/ })).toHaveAttribute('href', '/fr-ca/privacy/');
    const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
});

test('choosing Canadian French persists and reloads the complete interface', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('olive:locale-test-seeded') !== '1') {
      localStorage.clear();
      localStorage.setItem('olive:locale-test-seeded', '1');
      localStorage.setItem('contraction-tracker:onboarding-seen', '1');
      localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
      localStorage.setItem('olive:message-locale', 'en');
    }
  });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Language').selectOption('fr-CA');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByRole('button', { name: /Démarrer Touchez dès que/i })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('olive:message-locale'))).toBe('fr-CA');
});

test('the memory-book PDF renders translated French copy', async ({ page }) => {
  await page.addInitScript(() => {
    const now = Date.now();
    localStorage.clear();
    localStorage.setItem('olive:message-locale', 'fr-CA');
    localStorage.setItem('contraction-tracker:shares', JSON.stringify([{
      id: 'frpdf2', sessionId: 'fr-session', mode: 'full', state: 'archived',
      createdAt: new Date(now).toISOString(), expiresAt: new Date(now + 3_600_000).toISOString(), revoked: false,
    }]));
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: [{
      id: 'fr-c1', sessionId: 'fr-session', start: new Date(now - 120_000).toISOString(),
      end: new Date(now - 60_000).toISOString(), durationMs: 60_000, intensity: 5,
    }] }));
  });
  await page.goto('/?share=frpdf2');
  const downloadLink = page.getByRole('link', { name: 'Télécharger le PDF' });
  await expect(downloadLink).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await downloadLink.click();
  const download = await downloadPromise;
  const destination = join(tmpdir(), `olive-fr-${Date.now()}.pdf`);
  await download.saveAs(destination);
  expect(readFileSync(destination).subarray(0, 5).toString('ascii')).toBe('%PDF-');
  const extracted = execFileSync('pdftotext', [destination, '-'], { encoding: 'utf8', timeout: 10_000 });
  expect(extracted).toContain('Album-souvenir du travail');
  expect(extracted).toContain('Nombre total de contractions : 1');
  expect(extracted).toContain('Généré par Olive');
});

test('destructive and update confirmations remain French and cancellation changes nothing', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('olive:message-locale', 'fr-CA');
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('olive:confirm-test-record', 'keep');
  });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: 'Réglages' }).click();

  const dialogMessages: string[] = [];
  page.on('dialog', async (dialog) => {
    dialogMessages.push(dialog.message());
    if (dialogMessages.length === 2) await dialog.accept();
    else await dialog.dismiss();
  });

  await page.getByRole('button', { name: 'Installer la dernière version' }).click();
  await expect.poll(() => dialogMessages.length).toBe(1);
  expect(dialogMessages[0]).toBe('Mettre Olive à jour vers la dernière version? Vos données seront conservées et restaurées.');

  await page.getByRole('button', { name: 'Supprimer toutes les données Olive' }).click();
  await expect.poll(() => dialogMessages.length).toBe(3);
  expect(dialogMessages[1]).toBe('Supprimer de cet appareil toutes les sessions Olive, les entrées du parcours, les réglages et les sauvegardes locales? Cette action est irréversible.');
  expect(dialogMessages[2]).toBe('Dernière confirmation : exportez d’abord une sauvegarde si vous pourriez avoir besoin de ces données. Tout supprimer maintenant?');
  expect(await page.evaluate(() => localStorage.getItem('olive:confirm-test-record'))).toBe('keep');
});
