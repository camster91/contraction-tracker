> Historical review or plan. Use [RELEASE-PLAN.md](RELEASE-PLAN.md) for current v1.3.0 gates; this record is not current signed-binary, console, or launch evidence.

# Olive dependency security evidence

Status: current locked dependency snapshot has no known vulnerabilities in npm or OSV. This is dated evidence, not a permanent guarantee.

Evidence date: 2026-09-01. npm production/full and OSV scans passed against the current locked dirty-worktree snapshot. Rerun on the clean immutable release revision and retain the command output with the candidate evidence.

## Locked dependency sources

- npm: `package-lock.json`
- SwiftPM: `ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved`
- Android/Gradle: `android/app/gradle.lockfile`

The Gradle lock is generated from `releaseRuntimeClasspath`; `android/build.gradle` enables dependency locking for all projects.

## Findings and remediation

- `npm audit --omit=dev` initially reported zero production vulnerabilities across 49 production dependencies.
- The complete npm audit initially reported one moderate build-time chain: Capacitor CLI → `xcode@3.0.1` → `uuid@7.0.3`.
- The affected UUID behavior is not shipped in the mobile application, but it is reachable while Capacitor edits Xcode projects.
- `package.json` now overrides `uuid` to patched `11.1.1`. The actual `xcode` parser, PBX project parse, and 24-character UUID generation path pass with that version.
- After remediation, the complete npm audit reports zero known vulnerabilities.
- OSV Scanner 2.5.1 identified 457 packages from the three lockfiles and reported zero known vulnerabilities.

## Reproduce

```bash
npm run audit:dependencies
```

This is a network-backed release check and is intentionally separate from the offline-friendly `npm run verify` command.

## Evidence limits

- A clean scan means no matching advisory was known to the selected databases at scan time; it does not prove absence of vulnerabilities.
- Gradle resolution still emits a `flatDir` repository warning inherited from the Capacitor Cordova compatibility project. Olive currently packages no third-party local JAR in that directory; remove the compatibility repository if Capacitor no longer generates or requires it.
- Android release signing configuration and upload keystore are absent from this worktree. That is a release-provenance gate, not a dependency vulnerability; the account owner must create and securely retain the long-lived upload identity.
- Dependency scans do not replace source review, platform privacy declarations, signed-artifact inspection, or physical-device validation.
