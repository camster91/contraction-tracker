#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = path.join(root, 'dist');
const provenanceName = 'olive-build-provenance.json';
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

if (git('status', '--porcelain')) {
  console.error('Refusing to write native provenance from a dirty worktree.');
  process.exit(1);
}

const files = [];
const visit = (directory) => {
  for (const name of readdirSync(directory).sort()) {
    const absolute = path.join(directory, name);
    if (statSync(absolute).isDirectory()) visit(absolute);
    else if (name !== provenanceName) files.push(absolute);
  }
};
visit(dist);

const payloadHash = createHash('sha256');
for (const absolute of files) {
  const relative = path.relative(dist, absolute).split(path.sep).join('/');
  payloadHash.update(relative).update('\0').update(readFileSync(absolute)).update('\0');
}

const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const android = readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8');
const ios = readFileSync(path.join(root, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8');
const androidBuild = android.match(/versionCode\s+(\d+)/)?.[1];
const iosBuilds = [...ios.matchAll(/CURRENT_PROJECT_VERSION\s*=\s*([^;]+);/g)].map((match) => match[1].trim());
const uniqueIosBuilds = [...new Set(iosBuilds)];
if (!androidBuild || uniqueIosBuilds.length !== 1 || androidBuild !== uniqueIosBuilds[0]) {
  console.error('Native provenance requires matching native build numbers.');
  process.exit(1);
}

const record = {
  schema: 'olive-native-web-provenance-v1',
  generatedAt: new Date().toISOString(),
  sourceRevision: git('rev-parse', 'HEAD'),
  clean: true,
  appVersion: pkg.version,
  nativeBuild: androidBuild,
  distribution: 'native-only',
  webPayloadSha256: payloadHash.digest('hex'),
  fileCount: files.length,
};
writeFileSync(path.join(dist, provenanceName), `${JSON.stringify(record, null, 2)}\n`);
console.log(`Embedded ${provenanceName} for ${record.sourceRevision} (${record.webPayloadSha256}).`);
