#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { platform, release, arch } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));

const args = process.argv.slice(2);
const artifacts = [];
let outputPath;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--ios-artifact' && args[index + 1]) artifacts.push({ platform: 'ios', input: args[++index] });
  else if (arg === '--android-artifact' && args[index + 1]) artifacts.push({ platform: 'android', input: args[++index] });
  else if (arg === '--output' && args[index + 1]) outputPath = args[++index];
  else if (arg === '--help') {
    console.log('Usage: npm run evidence:release -- --ios-artifact <ipa-path> --android-artifact <aab-path> --output <path>');
    process.exit(0);
  } else {
    console.error(`Unknown or incomplete argument: ${arg}`);
    process.exit(2);
  }
}

if (!outputPath || artifacts.length !== 2 || !artifacts.some((item) => item.platform === 'ios') || !artifacts.some((item) => item.platform === 'android')) {
  console.error('Provide exactly one --ios-artifact, one --android-artifact, and one --output path. Use --help for usage.');
  process.exit(2);
}

const git = (...gitArgs) => execFileSync('git', gitArgs, { cwd: repositoryRoot, encoding: 'utf8' }).trim();
const status = git('status', '--porcelain');
if (status) {
  console.error('Refusing to create release evidence from a dirty worktree. Commit the exact candidate first.');
  process.exit(1);
}

function inspectNativeWebPayload(archivePath) {
  let entries;
  try {
    entries = execFileSync('unzip', ['-Z1', archivePath], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
      .split(/\r?\n/).filter(Boolean);
  } catch {
    console.error(`Native artifact is not a readable IPA/AAB ZIP archive: ${archivePath}`);
    process.exit(1);
  }
  const matches = entries.filter((entry) => entry.endsWith('/olive-build-provenance.json'));
  if (matches.length !== 1) {
    console.error(`Native artifact must contain exactly one olive-build-provenance.json: ${archivePath}`);
    process.exit(1);
  }
  const provenanceEntry = matches[0];
  const prefix = provenanceEntry.slice(0, -'olive-build-provenance.json'.length);
  let provenance;
  try {
    provenance = JSON.parse(execFileSync('unzip', ['-p', archivePath, provenanceEntry], { encoding: 'utf8' }));
  } catch {
    console.error(`Native artifact contains unreadable web provenance: ${archivePath}`);
    process.exit(1);
  }
  const payloadEntries = entries
    .filter((entry) => entry.startsWith(prefix) && !entry.endsWith('/') && entry !== provenanceEntry)
    .sort();
  const payloadHash = createHash('sha256');
  for (const entry of payloadEntries) {
    const relative = entry.slice(prefix.length);
    const content = execFileSync('unzip', ['-p', archivePath, entry], { encoding: 'buffer', maxBuffer: 50 * 1024 * 1024 });
    payloadHash.update(relative).update('\0').update(content).update('\0');
  }
  const actualPayloadSha256 = payloadHash.digest('hex');
  if (actualPayloadSha256 !== provenance.webPayloadSha256 || payloadEntries.length !== provenance.fileCount) {
    console.error(`Embedded web payload does not match its provenance: ${archivePath}`);
    process.exit(1);
  }
  return { ...provenance, actualPayloadSha256, archiveEntry: provenanceEntry };
}

const resolvedArtifacts = artifacts.map(({ platform: artifactPlatform, input }) => {
  const path = resolve(input);
  if (!existsSync(path)) {
    console.error(`Artifact does not exist: ${path}`);
    process.exit(1);
  }
  const content = readFileSync(path);
  return {
    platform: artifactPlatform,
    filename: basename(path),
    path,
    bytes: content.byteLength,
    sha256: createHash('sha256').update(content).digest('hex'),
    webProvenance: inspectNativeWebPayload(path),
  };
});

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const androidBuildFile = readFileSync(new URL('../android/app/build.gradle', import.meta.url), 'utf8');
const iosProjectFile = readFileSync(new URL('../ios/App/App.xcodeproj/project.pbxproj', import.meta.url), 'utf8');
const androidBuild = androidBuildFile.match(/versionCode\s+(\d+)/)?.[1];
const androidVersion = androidBuildFile.match(/versionName\s+["']([^"']+)["']/)?.[1];
const iosBuilds = [...iosProjectFile.matchAll(/CURRENT_PROJECT_VERSION\s*=\s*([^;]+);/g)].map((match) => match[1].trim());
const iosVersions = [...iosProjectFile.matchAll(/MARKETING_VERSION\s*=\s*([^;]+);/g)].map((match) => match[1].trim());
const uniqueIosBuilds = [...new Set(iosBuilds)];
const uniqueIosVersions = [...new Set(iosVersions)];
if (!androidBuild || !androidVersion || uniqueIosBuilds.length !== 1 || uniqueIosVersions.length !== 1) {
  console.error('Cannot determine one consistent native version/build from Android and iOS project files.');
  process.exit(1);
}
const iosBuild = uniqueIosBuilds[0];
const iosVersion = uniqueIosVersions[0];
if (androidVersion !== pkg.version || iosVersion !== pkg.version || androidBuild !== iosBuild) {
  console.error(`Native version drift: package ${pkg.version}; Android ${androidVersion} (${androidBuild}); iOS ${iosVersion} (${iosBuild}).`);
  process.exit(1);
}
const sourceRevision = git('rev-parse', 'HEAD');
for (const artifact of resolvedArtifacts) {
  const provenance = artifact.webProvenance;
  if (provenance.schema !== 'olive-native-web-provenance-v1'
      || provenance.clean !== true
      || provenance.sourceRevision !== sourceRevision
      || provenance.appVersion !== pkg.version
      || String(provenance.nativeBuild) !== String(androidBuild)
      || provenance.distribution !== 'native-only') {
    console.error(`${artifact.platform} artifact web provenance does not match this clean production candidate.`);
    process.exit(1);
  }
}
if (new Set(resolvedArtifacts.map((artifact) => artifact.webProvenance.webPayloadSha256)).size !== 1) {
  console.error('The IPA and AAB do not contain the identical production web payload.');
  process.exit(1);
}
const record = {
  schema: 'olive-release-evidence-v2',
  generatedAt: new Date().toISOString(),
  source: {
    revision: sourceRevision,
    branch: git('branch', '--show-current') || null,
    clean: true,
    repository: git('remote', 'get-url', 'origin'),
  },
  app: {
    version: pkg.version,
    build: androidBuild,
    nativeBuilds: {
      ios: { marketingVersion: iosVersion, currentProjectVersion: iosBuild },
      android: { versionName: androidVersion, versionCode: androidBuild },
    },
  },
  environment: {
    os: `${platform()} ${release()} ${arch()}`,
    node: process.version,
    npm: execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(),
  },
  artifacts: resolvedArtifacts,
  attestations: {
    signedArtifactIdentityVerifiedSeparately: false,
    internalTrackArtifactHashMatchedSeparately: false,
    physicalDeviceValidationAttachedSeparately: false,
  },
};

const resolvedOutput = resolve(outputPath);
mkdirSync(dirname(resolvedOutput), { recursive: true });
writeFileSync(resolvedOutput, `${JSON.stringify(record, null, 2)}\n`, { flag: 'wx' });
console.log(`Wrote release evidence for ${resolvedArtifacts.length} artifact(s) to ${resolvedOutput}.`);
console.log('Signer identity, uploaded-artifact hash, and physical-device validation still require independent evidence.');
