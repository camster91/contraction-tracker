#!/usr/bin/env node
// scripts/check-sw-cache-name.js
//
// Verifies that public/sw.js's CACHE_NAME was bumped in this commit
// when package.json was bumped. Fails the CI build if they drift.
//
// Run via: `node scripts/check-sw-cache-name.js`
//
// Rationale: deploy.yml's pre-flight check reads CACHE_NAME from
// the host's src/ and the runner's git checkout. If CACHE_NAME was
// forgotten on a source change, the host and runner will agree on
// the old CACHE_NAME and the deploy will silently ship stale JS
// bundles. This script fails CI before the deploy ever runs when
// the names diverge.
//
// We compare against the previous git HEAD (HEAD~1) to detect
// drift within the current commit. If both CACHE_NAME and
// package.json version are unchanged from HEAD~1, no drift.
// If CACHE_NAME changed but version didn't (cache-only bump), OK.
// If version changed but CACHE_NAME didn't, ERROR - user forgot.

import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

function readAt(ref, path) {
  try {
    return execSync(`git show ${ref}:${path}`, { cwd: root, encoding: 'utf8' })
  } catch {
    return null
  }
}

function extractCacheName(swContent) {
  if (!swContent) return null
  const m = swContent.match(/const CACHE_NAME = 'olive-v(\d+)'/)
  return m ? parseInt(m[1], 10) : null
}

function extractVersion(pkgContent) {
  if (!pkgContent) return null
  try {
    return JSON.parse(pkgContent).version
  } catch {
    return null
  }
}

const swNow = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
const pkgNow = readFileSync(new URL('../package.json', import.meta.url), 'utf8')
const swHead = readAt('HEAD', 'public/sw.js')
const pkgHead = readAt('HEAD', 'package.json')
const hasWorktreeReleaseChange = swNow !== swHead || pkgNow !== pkgHead
const baselineRef = hasWorktreeReleaseChange ? 'HEAD' : 'HEAD~1'
const swPrev = readAt(baselineRef, 'public/sw.js')
const pkgPrev = readAt(baselineRef, 'package.json')

const cacheNow = extractCacheName(swNow)
const cachePrev = extractCacheName(swPrev)
const versionNow = extractVersion(pkgNow)
const versionPrev = extractVersion(pkgPrev)

if (cacheNow == null) {
  console.error("FAIL: public/sw.js does not contain `const CACHE_NAME = 'olive-v<NUM>'`.")
  console.error('      Add the constant before running this check.')
  process.exit(1)
}

const versionChanged = versionNow !== versionPrev
const cacheChanged = cacheNow !== cachePrev

if (versionChanged && !cacheChanged) {
  console.error(
    `FAIL: package.json version bumped (${versionPrev} -> ${versionNow}) but CACHE_NAME unchanged (${cachePrev} -> ${cacheNow}).`,
  )
  console.error('      Bump CACHE_NAME in public/sw.js when bumping package.json version.')
  console.error('      Convention: bump CACHE_NAME by at least 1 per release.')
  process.exit(1)
}

if (cacheChanged && !versionChanged && cacheNow < (cachePrev ?? 0)) {
  console.error(
    `FAIL: CACHE_NAME went BACKWARDS (${cachePrev} -> ${cacheNow}). It must be monotonically increasing.`,
  )
  process.exit(1)
}

if (versionChanged && cacheChanged) {
  console.log(
    `OK: package.json version ${versionPrev} -> ${versionNow}, CACHE_NAME v${cachePrev} -> v${cacheNow}.`,
  )
} else {
  console.log(
    `OK: package.json version ${versionNow}, CACHE_NAME v${cacheNow}. (No drift.)`,
  )
}
