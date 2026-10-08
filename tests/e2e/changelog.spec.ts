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

test('whats-new: repository store metadata matches the current release and medical boundary', async () => {
  const listing = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'store-assets/listing-metadata.json'), 'utf8'));
  expect(listing.version).toBe(packageJson.version);
  expect(listing.name).toBe('Olive — Contraction Timer');
  expect(listing.description).toContain('does not replace professional care');
  expect(listing.privacyUrl).toBe('https://olive.ashbi.ca/privacy/');
  expect(listing.description).not.toMatch(/live partner sharing|guaranteed|clinically proven/i);
});
