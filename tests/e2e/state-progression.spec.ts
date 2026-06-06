/**
 * State auto-progress: when host records 3+ contractions in 10 minutes,
 * any active shares of that session should auto-progress from 'prenatal'
 * to 'labor' on the relay.
 *
 * Per App.tsx:262-294, this is a client-side check (host is the only
 * thing that knows the contraction history). The relay just stores
 * whatever state we tell it. So the test must:
 * 1. Set up: create a share, then push 3 contractions within 10 min
 * 2. Trigger: call the auto-progress logic (we test it via direct
 *    manipulation — create share, push contractions, then verify the
 *    share's state can be programmatically transitioned)
 * 3. Assert: share state on relay transitions to 'labor'
 *
 * The real test of auto-progress would require running the actual
 * useEffect — but that requires React mounting, browser context, etc.
 * For now, this test verifies the relay supports the state transition
 * contract that the auto-progress logic depends on.
 *
 * RATE LIMITING: The relay caps POST /api/shares at 20/hr per IP and
 * PATCH at 10/min per (IP, code). To avoid hammering the rate limit
 * during a full test run, we reuse one share across all transitions.
 * The relay can transition a single share through multiple states.
 *
 * SKIP-IN-CI: These tests hit the live relay and burn the rate limit.
 * Run them locally with `npx playwright test e2e/state-progression.spec.ts`
 * before releases. The CI gauntlet skips them. To opt in for a specific
 * release test run, set SKIP_RATE_LIMITED_TESTS=0 in the env.
 */
import { test, expect } from '@playwright/test';

const SKIP_RATE_LIMITED = process.env.SKIP_RATE_LIMITED_TESTS !== '0';
const RELAY = process.env.RELAY_URL ?? 'https://relay.ashbi.ca';
const skip = (msg: string) => test.skip(SKIP_RATE_LIMITED, msg);

let sharedCode: string | null = null;

test.beforeAll(async ({ request }) => {
  if (SKIP_RATE_LIMITED) return;
  const res = await request.post(`${RELAY}/api/shares`, {
    headers: { 'Content-Type': 'application/json' },
    data: { sessionId: 'state-progression-suite', ttlHours: 1, mode: 'full', state: 'prenatal' },
  });
  if (!res.ok()) {
    console.log(`beforeAll: createShare got ${res.status()}, tests will skip`);
    return;
  }
  sharedCode = (await res.json()).code;
  console.log(`Suite: created shared share ${sharedCode} in 'prenatal' state`);
});

test('state auto-progress: relay accepts prenatal -> labor', async ({ request }) => {
  if (SKIP_RATE_LIMITED) { skip('rate-limited; set SKIP_RATE_LIMITED_TESTS=0'); return; }
  expect(sharedCode).toBeTruthy();
  const progressRes = await request.patch(`${RELAY}/api/shares/${sharedCode}`, {
    headers: { 'Content-Type': 'application/json' },
    data: { action: 'set-state', state: 'labor' },
  });
  expect(progressRes.ok(), `prenatal -> labor should succeed, got ${progressRes.status()}`).toBe(true);

  const afterRes = await request.get(`${RELAY}/api/shares/${sharedCode}`);
  expect(afterRes.ok()).toBe(true);
  const afterBody = await afterRes.json();
  expect(afterBody.state).toBe('labor');
  console.log(`Share ${sharedCode}: prenatal -> labor confirmed`);
});

test('state auto-progress: relay accepts labor -> postpartum', async ({ request }) => {
  if (SKIP_RATE_LIMITED) { skip('rate-limited'); return; }
  expect(sharedCode).toBeTruthy();
  const res = await request.patch(`${RELAY}/api/shares/${sharedCode}`, {
    headers: { 'Content-Type': 'application/json' },
    data: { action: 'set-state', state: 'postpartum' },
  });
  expect(res.ok(), `labor -> postpartum should succeed, got ${res.status()}`).toBe(true);

  const afterRes = await request.get(`${RELAY}/api/shares/${sharedCode}`);
  expect(afterRes.ok()).toBe(true);
  expect((await afterRes.json()).state).toBe('postpartum');
  console.log(`Share ${sharedCode}: labor -> postpartum confirmed`);
});

test('state auto-progress: relay accepts postpartum -> archived', async ({ request }) => {
  if (SKIP_RATE_LIMITED) { skip('rate-limited'); return; }
  expect(sharedCode).toBeTruthy();
  const res = await request.patch(`${RELAY}/api/shares/${sharedCode}`, {
    headers: { 'Content-Type': 'application/json' },
    data: { action: 'set-state', state: 'archived' },
  });
  expect(res.ok(), `postpartum -> archived should succeed, got ${res.status()}`).toBe(true);

  const afterRes = await request.get(`${RELAY}/api/shares/${sharedCode}`);
  expect(afterRes.ok()).toBe(true);
  expect((await afterRes.json()).state).toBe('archived');
  console.log(`Share ${sharedCode}: postpartum -> archived confirmed`);
});

test('state auto-progress: relay rejects invalid state values', async ({ request }) => {
  if (SKIP_RATE_LIMITED) { skip('rate-limited'); return; }
  const createRes = await request.post(`${RELAY}/api/shares`, {
    headers: { 'Content-Type': 'application/json' },
    data: { sessionId: 'invalid-state-suite', ttlHours: 1, mode: 'full', state: 'prenatal' },
  });
  // Allow the rate-limited path: skip if 429
  if (createRes.status() === 429) {
    skip('createShare rate-limited; run again later');
    return;
  }
  const code = (await createRes.json()).code;

  const badRes = await request.patch(`${RELAY}/api/shares/${code}`, {
    headers: { 'Content-Type': 'application/json' },
    data: { action: 'set-state', state: 'invalid-state-name' },
  });
  expect(badRes.status(), 'Relay should reject invalid state').toBeGreaterThanOrEqual(400);
  expect(badRes.status()).toBeLessThan(500);
});
