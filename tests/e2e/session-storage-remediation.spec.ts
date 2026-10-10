import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

const primarySession = {
  id: 'primary',
  name: 'Primary',
  startedAt: '2026-10-01T12:00:00.000Z',
  endedAt: null,
};

const secondarySession = {
  id: 'session-secondary',
  name: 'Hospital visit',
  startedAt: '2026-10-02T12:00:00.000Z',
  endedAt: null,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:muted', '1');
  });
});

test('recovers valid sessions from the shadow after malformed primary storage', async ({ page }) => {
  await page.addInitScript(({ primary, secondary }) => {
    localStorage.setItem('contraction-tracker:sessions', '{malformed');
    localStorage.setItem('contraction-tracker:sessions::shadow', JSON.stringify([primary, secondary]));
  }, { primary: primarySession, secondary: secondarySession });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Sessions', exact: true });
  await expect(sheet.getByText('Hospital visit', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('contraction-tracker:sessions')))
    .toBe(JSON.stringify([primarySession, secondarySession]));
});

test('recovers a saved hospital bag checklist from its shadow', async ({ page }) => {
  const savedChecklist = [{ id: 'saved-item', text: 'Support person badge', packed: false }];
  await page.addInitScript((items) => {
    localStorage.setItem('contraction-tracker:checklist:primary', '{malformed');
    localStorage.setItem('contraction-tracker:checklist:primary::shadow', JSON.stringify(items));
  }, savedChecklist);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.getByRole('button', { name: 'Open birth journey' }).click();
  await page.getByRole('button', { name: /Hospital bag/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Hospital bag' });
  await expect(sheet.getByRole('button', { name: 'Mark Support person badge as packed' })).toBeVisible();
  await expect(sheet.getByText('0 of 1 packed')).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('contraction-tracker:checklist:primary')))
    .toBe(JSON.stringify(savedChecklist));
});

test('does not delete a session that contains saved records', async ({ page }) => {
  const populatedSession = {
    id: 'session-populated',
    name: 'Populated session',
    startedAt: '2026-10-03T12:00:00.000Z',
    endedAt: null,
  };
  await page.addInitScript(({ primary, session }) => {
    localStorage.setItem('contraction-tracker:sessions', JSON.stringify([primary, session]));
    localStorage.setItem('contraction-tracker:active-session', 'primary');
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: [{
      id: 'saved-contraction',
      start: '2026-10-03T12:30:00.000Z',
      end: '2026-10-03T12:31:00.000Z',
      intensity: null,
      sessionId: session.id,
      source: 'timer',
    }] }));
  }, { primary: primarySession, session: populatedSession });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Sessions', exact: true });
  const row = sheet.locator('li').filter({ hasText: 'Populated session' });
  const deleteButton = row.getByRole('button', { name: 'Delete' });
  await deleteButton.click();
  await row.getByRole('button', { name: 'Tap again to confirm delete' }).click();
  await expect(sheet.getByRole('alert')).toContainText('Cannot delete Populated session');
  await expect(sheet.getByRole('alert')).toContainText('contraction');
  await expect(page.getByText('Populated session', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('contraction-tracker:sessions') || '[]').some((s: { id: string }) => s.id === 'session-populated'))).toBe(true);
});

test('ended sessions remain view-only and active deletion falls back to primary', async ({ page }) => {
  const endedSession = {
    id: 'session-ended',
    name: 'Ended session',
    startedAt: '2026-10-03T12:00:00.000Z',
    endedAt: '2026-10-03T13:00:00.000Z',
  };
  const activeSession = {
    id: 'session-active',
    name: 'Active session',
    startedAt: '2026-10-04T12:00:00.000Z',
    endedAt: null,
  };
  await page.addInitScript(({ primary, ended, active }) => {
    localStorage.setItem('contraction-tracker:sessions', JSON.stringify([primary, ended, active]));
    localStorage.setItem('contraction-tracker:active-session', active.id);
  }, { primary: primarySession, ended: endedSession, active: activeSession });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Sessions', exact: true });
  const endedRow = sheet.locator('li').filter({ hasText: 'Ended session' });
  await expect(endedRow.getByRole('button', { name: 'View' })).toBeVisible();
  await expect(endedRow.locator('button').first()).toBeDisabled();
  const activeRow = sheet.locator('li').filter({ hasText: 'Active session' });
  await activeRow.getByRole('button', { name: 'Delete' }).click();
  await activeRow.getByRole('button', { name: 'Tap again to confirm delete' }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('contraction-tracker:active-session'))).toBe('primary');
  await expect(sheet).toBeHidden();
  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText('Active session', { exact: true })).toHaveCount(0);
  await expect(sheet.getByText('Current session:').locator('..')).toContainText('This birth');
});

test('requires stopping the active timer before creating or switching sessions', async ({ page }) => {
  await page.addInitScript(({ primary, secondary }) => {
    localStorage.setItem('contraction-tracker:sessions', JSON.stringify([primary, secondary]));
    localStorage.setItem('contraction-tracker:active-session', 'primary');
    localStorage.setItem('contraction-tracker:current', JSON.stringify({
      id: 'running-contraction',
      start: new Date(Date.now() - 1000).toISOString(),
      end: null,
      intensity: null,
      sessionId: 'primary',
      source: 'timer',
    }));
  }, { primary: primarySession, secondary: secondarySession });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Sessions', exact: true });
  await expect(sheet.getByRole('button', { name: 'New', exact: true })).toBeDisabled();
  await expect(sheet.getByRole('status')).toContainText('Stop the active contraction before changing sessions.');
  await expect(sheet.locator('li').filter({ hasText: 'Hospital visit' }).locator('button').first()).toBeDisabled();
  await expect(sheet.getByRole('status')).toContainText('Stop the active contraction before changing sessions.');
  await expect(sheet.getByText('Current session:').locator('..')).toContainText('This birth');
});
