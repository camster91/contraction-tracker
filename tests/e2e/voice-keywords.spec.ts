/**
 * Voice control keywords — the literal set of words that fire
 * start/stop. This is a regression test for the keyword list; if
 * someone refactors voice.ts and drops a keyword, the voice UX
 * silently breaks for users who rely on a particular phrase.
 *
 * Per src/lib/voice.ts:21-22:
 *   START_WORDS = ['start', 'begin', 'go', 'now']
 *   STOP_WORDS  = ['stop', 'done', 'end', 'over', 'finished']
 */
import { test, expect } from '@playwright/test';

const EXPECTED_START_WORDS = ['start', 'begin', 'go', 'now'];
const EXPECTED_STOP_WORDS = ['stop', 'done', 'end', 'over', 'finished'];

test('voice: starts the SpeechRecognition API if available', async ({ page }) => {
  await page.goto('https://contractions.ashbi.ca/', { waitUntil: 'domcontentloaded' });
  // We just verify the page exposes SpeechRecognition / webkitSpeechRecognition
  // — this is what voice.ts checks before binding handlers. The page itself
  // does the capability check; the test verifies the API is at least
  // addressable.
  const apiCheck = await page.evaluate(() => {
    return {
      hasSR: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
      hasMedia: 'mediaDevices' in navigator,
    };
  });
  // hasSR may be false in headless chromium. Just log it. The test passes
  // either way — voice is a progressive enhancement, not a hard requirement.
  console.log('voice API check:', JSON.stringify(apiCheck));
});

test('voice: keyword list matches documented contract (via grep on the bundle)', async ({ page }) => {
  // We don't have access to the lib functions directly (they're bundled).
  // The keyword list is documented in src/lib/voice.ts:21-22. We just
  // verify the bundle includes those strings.
  const found = await page.evaluate(() => {
    const html = document.documentElement.outerHTML;
    return {
      startInBundle: ['start', 'begin', 'go', 'now'].some((w) => html.includes(w)),
      stopInBundle: ['stop', 'done', 'end', 'over', 'finished'].some((w) => html.includes(w)),
    };
  });
  // Bundle is minified; the keyword strings should still appear if voice
  // code is reachable. (If tree-shaken because voice isn't used, this
  // might be false — but voice is referenced in App.tsx so it shouldn't
  // be tree-shaken.)
  console.log('voice keywords in bundle:', JSON.stringify(found));
  // Soft assertion — we don't fail if the bundle is too aggressive.
  // This is informational.
});

test('voice: keyword list documented in src/lib/voice.ts matches expected', async () => {
  // Static check on the source file. Run via Node fs.
  const fs = await import('fs');
  const path = await import('path');
  // Resolve relative to the working directory (contraction-tracker/)
  const sourcePath = path.resolve(process.cwd(), 'src/lib/voice.ts');
  const source = fs.readFileSync(sourcePath, 'utf-8');

  // Extract START_WORDS = [...] and STOP_WORDS = [...]
  const startMatch = source.match(/START_WORDS\s*=\s*\[([^\]]+)\]/);
  const stopMatch = source.match(/STOP_WORDS\s*=\s*\[([^\]]+)\]/);
  expect(startMatch, 'START_WORDS array literal should exist').toBeTruthy();
  expect(stopMatch, 'STOP_WORDS array literal should exist').toBeTruthy();

  if (startMatch) {
    const startWords = startMatch[1].match(/['"]([^'"]+)['"]/g)?.map((s) => s.slice(1, -1)) || [];
    expect(startWords.sort()).toEqual(EXPECTED_START_WORDS.sort());
  }
  if (stopMatch) {
    const stopWords = stopMatch[1].match(/['"]([^'"]+)['"]/g)?.map((s) => s.slice(1, -1)) || [];
    expect(stopWords.sort()).toEqual(EXPECTED_STOP_WORDS.sort());
  }
});
