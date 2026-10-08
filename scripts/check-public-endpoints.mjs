#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
// English is the current launch scope. Check deferred French pages only when
// explicitly requested; never treat that opt-in as localization approval.
const includeFrench = process.argv.includes('--include-fr-ca');
const checks = [
  {
    name: 'support',
    url: 'https://olive.ashbi.ca/support',
    localPath: resolve(root, 'public/support/index.html'),
    required: ['<title>Olive Support</title>', 'mailto:cameron@ashbi.ca?subject=Olive%20support', 'not an emergency or clinical service'],
  },
  {
    name: 'support (fr-CA)',
    url: 'https://olive.ashbi.ca/fr-ca/support/',
    localPath: resolve(root, 'public/fr-ca/support/index.html'),
    required: ['<html lang="fr-CA">', '<title>Soutien Olive</title>', 'mailto:cameron@ashbi.ca?subject=Soutien%20Olive', "n’est ni un service d’urgence ni un service clinique", 'services d’urgence locaux'],
  },
  {
    name: 'privacy',
    url: 'https://olive.ashbi.ca/privacy',
    localPath: resolve(root, 'public/privacy/index.html'),
    required: ['<title>Olive — Privacy Policy</title>', 'October 2026', 'system share sheet', 'uninstalling', 'does not diagnose labor', 'excluded from automatic device backups'],
  },
  {
    name: 'privacy (fr-CA)',
    url: 'https://olive.ashbi.ca/fr-ca/privacy/',
    localPath: resolve(root, 'public/fr-ca/privacy/index.html'),
    required: ['<html lang="fr-CA">', '<title>Olive — Politique de confidentialité</title>', '1er septembre 2026', 'pièces jointes héritées sous forme de photo ou de mémo vocal', 'un aperçu avant l’envoi', 'ne diagnostique pas le travail'],
  },
].filter(check => includeFrench || !check.name.includes('fr-CA'));

const failures = [];
const normalize = (value) => value.replace(/\r\n/g, '\n').trim();

for (const check of checks) {
  let response;
  try {
    response = await fetch(check.url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
      headers: { 'user-agent': 'Olive release-readiness verifier/1.0' },
    });
  } catch (error) {
    failures.push(`${check.name}: request failed (${error instanceof Error ? error.message : String(error)}).`);
    continue;
  }

  const body = await response.text();
  if (response.status !== 200) failures.push(`${check.name}: expected HTTP 200, received ${response.status}.`);
  if (!(response.headers.get('content-type') || '').toLowerCase().includes('text/html')) {
    failures.push(`${check.name}: expected an HTML content type.`);
  }
  for (const text of check.required) {
    if (!body.includes(text)) failures.push(`${check.name}: live page is missing required text "${text}".`);
  }

  const local = await readFile(check.localPath, 'utf8');
  if (normalize(body) !== normalize(local)) {
    failures.push(`${check.name}: live HTML differs from the reviewed repository artifact.`);
  }
}

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} public endpoint issue${failures.length === 1 ? '' : 's'}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`OK: public ${includeFrench ? 'English and Canadian French' : 'English'} support and privacy endpoints return the reviewed repository artifacts over HTTPS.`);
