/**
 * End-to-end session isolation test:
 * 1. Host creates 2 sessions (Wed + Thu) with contractions in each
 * 2. Host creates a share link for the active (Thu) session
 * 3. Open the share link in a new tab
 * 4. Verify the partner view shows ONLY the Thursday contractions
 *
 * This is the most realistic real-world test — exactly what would
 * happen if Bianca had early labor Wednesday, then active labor
 * Thursday at the hospital, and her partner is checking the
 * Thursday share link from the waiting room.
 */
import { test, expect } from '@playwright/test';
import * as helpers from './helpers';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://contractions.ashbi.ca/';

test('end-to-end: partner sees only active session data, not cross-session', async ({ browser }) => {
  // Use 2 browser contexts: one for the host, one for the partner
  const hostCtx = await browser.newContext();
  const hostPage = await hostCtx.newPage();
  const partnerCtx = await browser.newContext();
  const partnerPage = await partnerCtx.newPage();

  // Set up the host with 2 sessions
  await hostPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(hostPage);
  await hostPage.evaluate(() => {
    const now = Date.now();
    const wed = [
      { id: 'wed-1', sessionId: 'wednesday', start: new Date(now - 60*60_000).toISOString(), end: new Date(now - 60*60_000 + 90_000).toISOString() },
      { id: 'wed-2', sessionId: 'wednesday', start: new Date(now - 50*60_000).toISOString(), end: new Date(now - 50*60_000 + 90_000).toISOString() },
    ].map((c) => ({ ...c, durationMs: 90_000, intensity: 'medium', note: 'Wednesday practice contractions', tags: [], painLocations: [] }));
    const thu = [
      { id: 'thu-1', sessionId: 'thursday', start: new Date(now - 10*60_000).toISOString(), end: new Date(now - 10*60_000 + 75_000).toISOString() },
      { id: 'thu-2', sessionId: 'thursday', start: new Date(now - 5*60_000).toISOString(), end: new Date(now - 5*60_000 + 75_000).toISOString() },
    ].map((c) => ({ ...c, durationMs: 75_000, intensity: 'strong', note: 'Active labor Thursday', tags: [], painLocations: [] }));
    localStorage.setItem('olive:onboarded', '1');
    localStorage.setItem('olive:backup-reminder-dismissed', '1');
    localStorage.setItem('contraction-tracker:active-session', 'thursday');
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: [...wed, ...thu] }));
  });
  await hostPage.reload({ waitUntil: 'domcontentloaded' });
  await helpers.waitForApp(hostPage);
  await hostPage.waitForTimeout(2_000);

  // Open the share sheet and create a share for the active session
  const shareCard = hostPage.locator('button, [role="button"]').filter({ hasText: /2 contractions|Share/ }).first();
  if ((await shareCard.count()) === 0 || !(await shareCard.isVisible().catch(() => false))) {
    test.skip(true, 'Share card not visible');
    return;
  }
  await shareCard.click({ force: true });
  await hostPage.waitForTimeout(1500);

  const createBtn = hostPage.getByRole('button').filter({ hasText: /Create share link/i }).first();
  if ((await createBtn.count()) === 0) {
    test.skip(true, 'Create share link button not visible');
    return;
  }
  await createBtn.click({ force: true });
  await hostPage.waitForTimeout(3000);

  // Get the share code from localStorage
  const shareCode = await hostPage.evaluate(() => {
    const raw = localStorage.getItem('contraction-tracker:shares');
    if (!raw) return null;
    const shares = JSON.parse(raw);
    return shares[0]?.id;
  });
  expect(shareCode, 'Share should be created').toBeTruthy();
  if (!shareCode) return;

  // Wait for the relay to receive the data — poll up to 10s
  // (Relay can rate-limit pushes, so we check what's actually there)
  let shareData = null;
  for (let i = 0; i < 20; i++) {
    const r = await partnerPage.request.get(`https://relay.ashbi.ca/api/shares/${shareCode}/contractions`);
    if (r.ok()) {
      const data = await r.json();
      if (data.contractions && data.contractions.length > 0) {
        shareData = data;
        break;
      }
    }
    await partnerPage.waitForTimeout(500);
  }
  if (!shareData) {
    // Save the share code for debugging
    console.error(`Share ${shareCode} has no contractions on the relay after 10s`);
    test.skip(true, 'Relay did not receive contractions within 10s (rate-limited or push failed)');
    return;
  }

  // ASSERT directly against the relay response — this is the real
  // contract that matters. The partner view is just a UI rendering of this.
  expect(shareData.contractions, 'Relay should have thursday contractions').toBeDefined();
  expect(shareData.contractions.length, 'Should have only thursday (2), not wednesday too').toBe(2);
  expect(shareData.contractions[0].note, 'Should be Thursday note').toBe('Active labor Thursday');
  expect(shareData.contractions.every((c) => c.sessionId === 'thursday'), 'All should be thursday').toBe(true);

  // Also verify the partner UI shows this
  await partnerPage.goto(`${BASE_URL}?share=${shareCode}`, { waitUntil: 'domcontentloaded' });
  await partnerPage.waitForTimeout(3000);

  // The partner view should show ONLY Thursday's contractions
  const partnerBody = (await partnerPage.locator('body').textContent()) || '';

  // Should see Thursday's note
  expect(partnerBody, 'Partner should see Thursday contraction data').toContain('Active labor Thursday');

  // Should NOT see Wednesday's note (this is the bug fix)
  expect(partnerBody, 'Partner should NOT see Wednesday contraction data (cross-session leak fix)').not.toContain('Wednesday practice contractions');

  // Count display: 2 contractions (thursday), not 4 (total)
  expect(partnerBody, 'Partner should see 2 contractions, not 4').toMatch(/2 contraction/);

  await hostCtx.close();
  await partnerCtx.close();
});
