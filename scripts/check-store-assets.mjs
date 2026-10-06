#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const expected = new Map([
  ['store-assets/app-icon-1024.png', [1024, 1024]],
  ['store-assets/app-icon-512.png', [512, 512]],
  ['store-assets/play-feature-graphic-1024x500.png', [1024, 500]],
]);
const groups = new Map([
  ['6.7_iphone', [1290, 2796]],
  ['6.1_iphone', [1179, 2556]],
  ['5.5_iphone', [1242, 2208]],
  ['12.9_ipad', [2048, 2732]],
  ['play_phone', [1080, 1920]],
  ['play_tablet_7', [1440, 2560]],
  ['play_tablet_10', [1800, 3200]],
]);
const shots = ['01-hero-timer', '02-contraction-active', '03-history', '04-add-missed', '05-care-plan-reminder'];
for (const [group, dimensions] of groups) {
  for (const shot of shots) expected.set(`store-assets/screenshots/${group}/${shot}.png`, dimensions);
}

const pngDimensions = (content) => {
  const signature = content.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error('not a PNG');
  return [content.readUInt32BE(16), content.readUInt32BE(20)];
};
const pngHasAlpha = (content) => [4, 6].includes(content[25]) || content.includes(Buffer.from('tRNS'));

const failures = [];
const hashes = [];
const captionPath = new URL('../store-assets/captions.json', import.meta.url);
let captions;
try {
  captions = JSON.parse(readFileSync(captionPath, 'utf8'));
} catch (error) {
  failures.push(`store-assets/captions.json is missing or invalid JSON: ${error.message}`);
}
if (captions) {
  if (captions.schemaVersion !== 1 || captions.locale !== 'en' || !captions.screenshots || typeof captions.screenshots !== 'object') {
    failures.push('store-assets/captions.json has an invalid schema, locale, or screenshots map');
  } else {
    const keys = Object.keys(captions.screenshots).sort();
    if (JSON.stringify(keys) !== JSON.stringify([...shots].sort())) failures.push('store caption keys do not match the five screenshot states');
    const unsafeClaim = /diagnos|predict|safe to stay|true labor|go to (the )?hospital|medical device|guarantee/i;
    for (const shot of shots) {
      const entry = captions.screenshots[shot];
      if (!entry || typeof entry.headline !== 'string' || entry.headline.trim().length < 12 || entry.headline.length > 80) {
        failures.push(`${shot} needs a 12-80 character marketing headline`);
      }
      if (!entry || typeof entry.accessibilityDescription !== 'string' || entry.accessibilityDescription.trim().length < 30 || entry.accessibilityDescription.length > 240) {
        failures.push(`${shot} needs a 30-240 character accessibility description`);
      }
      if (entry && unsafeClaim.test(`${entry.headline} ${entry.accessibilityDescription}`)) {
        failures.push(`${shot} caption contains a prohibited diagnostic or reassurance claim`);
      }
    }
  }
}
for (const [path, wanted] of expected) {
  const url = new URL(`../${path}`, import.meta.url);
  if (!existsSync(url)) {
    failures.push(`${path} is missing`);
    continue;
  }
  const content = readFileSync(url);
  let actual;
  try { actual = pngDimensions(content); } catch (error) {
    failures.push(`${path}: ${error.message}`);
    continue;
  }
  if (actual[0] !== wanted[0] || actual[1] !== wanted[1]) {
    failures.push(`${path} is ${actual.join('x')}; expected ${wanted.join('x')}`);
  }
  if (pngHasAlpha(content)) failures.push(`${path} contains transparency; store PNGs must be opaque`);
  hashes.push(`${createHash('sha256').update(content).digest('hex')}  ${path}`);
}

if (failures.length) {
  console.error(`FAIL: ${failures.length} store asset issue${failures.length === 1 ? '' : 's'}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const storeMaster = readFileSync(new URL('../store-assets/app-icon-1024.png', import.meta.url));
const iosMaster = readFileSync(new URL('../ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png', import.meta.url));
if (!storeMaster.equals(iosMaster)) {
  console.error('FAIL: the App Store icon master differs from the iOS marketing icon.');
  process.exit(1);
}
console.log(`OK: ${expected.size} durable PNG assets exist at the required dimensions; the store and iOS marketing icons match.`);
console.log(hashes.join('\n'));
