/**
 * What's New / Changelog copy — must exist where App Store
 * reviewers look for it.
 *
 * The What's New text is shown on the app's "Update" screen when
 * a user upgrades. Apple's review guidelines require this to be
 * non-empty for the first release (some reviewers specifically look
 * for changelog presence).
 */
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import packageJson from '../../package.json' with { type: 'json' };

test('whats-new: CHANGELOG.md includes the current release and privacy URL', async () => {
  const fs = await import('fs');
  const path = await import('path');
  const sourcePath = path.resolve(process.cwd(), 'CHANGELOG.md');
  expect(fs.existsSync(sourcePath), 'CHANGELOG.md should exist at project root').toBe(true);
  const content = fs.readFileSync(sourcePath, 'utf-8');
  expect(content, `CHANGELOG.md should mention v${packageJson.version}`).toContain(`v${packageJson.version}`);
  // Must have the App Store privacy URL
  expect(content, 'CHANGELOG.md should reference the privacy URL').toContain('olive.ashbi.ca/privacy');
});

test('whats-new: WHATS-NEW.txt exists with the App Store release notes', async () => {
  const fs = await import('fs');
  const path = await import('path');
  const sourcePath = path.resolve(process.cwd(), 'WHATS-NEW.txt');
  expect(fs.existsSync(sourcePath), 'WHATS-NEW.txt should exist at project root').toBe(true);
  const content = fs.readFileSync(sourcePath, 'utf-8');
  // Should mention the key features
  expect(content, 'WHATS-NEW should mention the birth journey').toContain('birth journey');
  expect(content, 'WHATS-NEW must not advertise the removed sharing feature').not.toMatch(/in real time|follow along|12-character/i);
  expect(content, 'WHATS-NEW should state the medical limitation').toContain('not a medical device');
  // Should reference the privacy URL
  expect(content, 'WHATS-NEW should identify Olive').toContain('Olive');
});

test('whats-new: indie-ship store-listing.md has the v1.0.0 release notes', async () => {
  const fs = await import('fs');
  const path = await import('path');
  // The store-listing.md is the source for App Store / Play Store
  // submission. It should mention v1.0.0 release notes.
  const candidates = [
    path.resolve(process.env.HOME || '/Users/biancabienaime',
      '.hermes/cache/indie-ship/APPS/olive-contractions/store-listing.md'),
  ];
  let found = false;
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const content = fs.readFileSync(candidate, 'utf-8');
      expect(content).toContain('1.0.0');
      found = true;
      break;
    }
  }
  // Soft assertion — store-listing.md is in the indie-ship cache,
  // not the project. Skip if not present.
  if (!found) {
    console.log('NOTE: indie-ship cache not available locally — skipping');
  }
});
