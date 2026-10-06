#!/usr/bin/env node
// Local source/listing consistency, not a store upload or approval check.
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const field = (text, heading) => {
  const start = text.indexOf(`\n${heading}\n`);
  if (start < 0) return '';
  return text.slice(start + heading.length + 2).replace(/^[─═]+\n/, '').split('\n\n')[0].trim();
};
const pkg = JSON.parse(read('package.json'));
const apple = read('APP-STORE-CONNECT-FIELDS.txt');
const google = read('PLAY-STORE-CONSOLE-FIELDS.txt');
const android = read('android/app/build.gradle');
const ios = read('ios/App/App.xcodeproj/project.pbxproj');
const androidBuild = android.match(/versionCode\s+(\d+)/)?.[1];
check(android.match(/versionName\s+"([^"]+)"/)?.[1] === pkg.version, 'Android version differs from package version.');
const versions = [...ios.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map(m => m[1]);
const builds = [...ios.matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/g)].map(m => m[1]);
check(versions.length > 0 && versions.every(v => v === pkg.version), 'iOS target versions differ from package version.');
check(builds.length > 0 && builds.every(v => v === androidBuild), 'Native build numbers differ.');
check(/targetSdkVersion\s*=\s*36\b/.test(read('android/variables.gradle')), 'Android target SDK is not 36.');
for (const [name, value, max] of [
  ['Apple app name', field(apple, 'APP NAME'), 30],
  ['Apple subtitle', field(apple, 'SUBTITLE (max 30 chars, used in search results)').split('\n')[0], 30],
  ['Apple promotional text', field(apple, 'PROMOTIONAL TEXT (max 170 chars, editable anytime)'), 170],
  ['Apple keywords', field(apple, 'KEYWORDS (max 100 chars, comma-separated, no spaces in keywords)'), 100],
  ['Play short description', field(google, 'SHORT DESCRIPTION (max 80 chars)'), 80],
]) check(value.length > 0 && value.length <= max, `${name}: missing or exceeds ${max} characters (${value.length}).`);
for (const [name, text, heading] of [
  ['Apple', apple, 'DESCRIPTION (max 4000 chars)'], ['Play', google, 'FULL DESCRIPTION (max 4000 chars)'],
]) {
  const start = text.indexOf(`\n${heading}\n`);
  const description = text.slice(start + heading.length + 2).replace(/^[─═]+\n/, '').split(/\n[─═]{10,}\n/)[0].trim();
  check(start >= 0 && description.length > 0 && description.length <= 4000, `${name} description missing/too long.`);
  check(!/voice control|live partner sharing|memory.book PDF|guaranteed|clinically proven/i.test(description), `${name} description advertises removed or unsupported features.`);
  check(text.includes('https://olive.ashbi.ca/privacy'), `${name} privacy URL missing.`);
  check(text.includes(pkg.version), `${name} version missing.`);
}
check(field(apple, 'SUPPORT URL') === 'https://olive.ashbi.ca/support/', 'Apple support URL must point to prepared support page.');
const manifest = read('ios/App/App/PrivacyInfo.xcprivacy');
check(/<key>NSPrivacyCollectedDataTypes<\/key>\s*<array\s*\/>/.test(manifest), 'Privacy manifest still declares off-device collected data.');
check(manifest.includes('C617.1') && manifest.includes('CA92.1'), 'Required filesystem/preferences privacy reasons missing.');
check(/<key>NSPrivacyTracking<\/key>\s*<false\s*\/>/.test(manifest), 'Tracking must be disabled.');
check(read('public/support/index.html').includes('mailto:cameron@ashbi.ca'), 'Prepared support page has no contact.');
check(!/revoke active sharing links|enable voice control/i.test(read('public/support/index.html') + read('public/privacy/index.html')), 'Prepared public pages still advertise retired features.');
check(read('APP-STORE-REVIEW.md').includes('Apple acceptance is unverified'), 'Review notes overstate readiness.');
if (failures.length) { console.error(failures.map(f => `FAIL: ${f}`).join('\n')); process.exit(1); }
console.log(`PASS: v${pkg.version} (${androidBuild}) local metadata/native-source consistency. Signed binary, live pages and console validation remain separate gates.`);
