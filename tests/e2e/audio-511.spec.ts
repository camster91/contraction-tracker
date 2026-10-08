import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-07T12:00:00Z') });
  await page.addInitScript(() => {
    const state = window as unknown as { __spoken: string[]; __tones: number };
    state.__spoken = []; state.__tones = 0;
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => [], cancel: () => {}, speak: (utterance: { text: string }) => state.__spoken.push(utterance.text) } });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class { text: string; constructor(text: string) { this.text = text; } } });
    const param = { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} };
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: class {
      state = 'running'; currentTime = 0; destination = {};
      createBuffer() { return {}; }
      createBufferSource() { return { connect: () => {}, start: () => {} }; }
      createOscillator() { return { frequency: param, connect: () => {}, start: () => state.__tones++, stop: () => {} }; }
      createGain() { return { gain: param, connect: () => {} }; }
      createBiquadFilter() { return { frequency: {}, connect: () => {} }; }
    } });
    if (sessionStorage.getItem('reminder-fixture')) return;
    sessionStorage.setItem('reminder-fixture', '1');
    localStorage.clear();
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:care-plan', JSON.stringify({ enabled: true, providerName: 'Example care team', providerPhone: '+1 555 0100', intervalMinutes: 4, durationSeconds: 45, windowMinutes: 60 }));
    localStorage.setItem('contraction-tracker:v1', JSON.stringify({ contractions: Array.from({ length: 30 }, (_, i) => ({
      id: `reminder-${i}`, sessionId: 'primary', start: new Date(Date.now() - (59 - i * 2) * 60000).toISOString(), end: new Date(Date.now() - (59 - i * 2) * 60000 + 45000).toISOString(),
    })) }));
  });
});

const spoken = (page: import('@playwright/test').Page) => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);

test('saved reminder uses exact configured seconds and repeats after ten minutes', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await expect.poll(() => spoken(page)).toHaveLength(1);
  await expect(page.getByRole('button', { name: /^Start/ })).toBeInViewport({ ratio: 1 });
  expect((await spoken(page))[0]).toContain('every 4 minutes, lasting at least 45 seconds, for 60 minutes');
  await page.clock.fastForward(9 * 60000);
  expect(await spoken(page)).toHaveLength(1);
  await page.clock.fastForward(61000);
  await expect.poll(() => spoken(page)).toHaveLength(2);
  expect((await spoken(page))[1]).toContain('lasting at least 45 seconds');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __tones: number }).__tones)).toBeGreaterThanOrEqual(3);
});

test('pausing sounds persists across reload and retains factual summary and call access', async ({ page }, info) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.getByRole('button', { name: 'Pause reminder sounds for 24 hours' }).click();
  await expect(page.getByRole('status')).toContainText('Reminder sounds paused until');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await expect(page.getByText('Saved care-plan reminder', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume reminder sounds' })).toBeVisible();
  expect(await spoken(page)).toEqual([]);
  await expect(page.getByRole('navigation', { name: 'Care access' }).getByRole('link', { name: 'Call Example care team' })).toHaveAttribute('href', 'tel:+15550100');
  await page.screenshot({ path: info.outputPath('paused-reminder.png') });
  await page.getByRole('button', { name: 'Resume reminder sounds' }).click();
  await expect.poll(() => spoken(page)).toHaveLength(1);
});

for (const mode of ['muted', 'quiet hours'] as const) {
  test(`${mode} suppresses reminder tones and speech while preserving its summary`, async ({ page }) => {
    await page.addInitScript(mode => {
      if (mode === 'muted') localStorage.setItem('contraction-tracker:muted', 'true');
      else localStorage.setItem('contraction-tracker:mute-schedule', JSON.stringify({ enabled: true, startHour: 0, endHour: 23 }));
    }, mode);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByText('Saved care-plan reminder', { exact: true })).toBeVisible();
    await page.clock.fastForward(1000);
    expect(await spoken(page)).toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { __tones: number }).__tones)).toBe(0);
  });
}

test('saved and frequent notices leave the primary Stop fully visible', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.getByRole('button', { name: /^Start/ }).click();
  const stop = page.getByRole('button', { name: 'Stop', exact: true });
  await expect(stop).toBeInViewport({ ratio: 1 });
  await expect(stop).toHaveCount(1);
  await stop.click();
  await expect(page.getByRole('button', { name: /^Start/ })).toBeInViewport({ ratio: 1 });
});
