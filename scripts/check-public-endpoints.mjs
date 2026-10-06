#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const checks = [
  {
    name: 'support',
    url: 'https://contractions.ashbi.ca/support',
    localPath: resolve(root, 'public/support/index.html'),
    required: ['<title>Olive Support</title>', 'mailto:cameron@ashbi.ca?subject=Olive%20support', 'not an emergency or clinical service'],
  },
  {
    name: 'support (fr-CA)',
    url: 'https://contractions.ashbi.ca/fr-ca/support/',
    localPath: resolve(root, 'public/fr-ca/support/index.html'),
    required: ['<html lang="fr-CA">', '<title>Soutien Olive</title>', 'mailto:cameron@ashbi.ca?subject=Soutien%20Olive', "n’est ni un service d’urgence ni un service clinique", 'services d’urgence locaux'],
  },
  {
    name: 'privacy',
    url: 'https://contractions.ashbi.ca/privacy',
    localPath: resolve(root, 'public/privacy/index.html'),
    required: ['<title>Olive — Privacy Policy</title>', 'September 1, 2026', 'legacy photo or voice-memo attachments', 'preview before sending'],
  },
  {
    name: 'privacy (fr-CA)',
    url: 'https://contractions.ashbi.ca/fr-ca/privacy/',
    localPath: resolve(root, 'public/fr-ca/privacy/index.html'),
    required: ['<html lang="fr-CA">', '<title>Olive — Politique de confidentialité</title>', '1er septembre 2026', 'pièces jointes héritées sous forme de photo ou de mémo vocal', 'un aperçu avant l’envoi', 'ne diagnostique pas le travail'],
  },
];

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

console.log('OK: public English and Canadian French support and privacy endpoints return the reviewed repository artifacts over HTTPS.');
