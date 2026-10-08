#!/usr/bin/env node
// Native apps bundle these files locally; no service worker or relay is required.
import { readFile, readdir, stat, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
const dist = resolve(import.meta.dirname, '../dist');
const index = await readFile(resolve(dist, 'index.html'), 'utf8');
const refs = [...index.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m => m[1]);
for (const ref of refs) {
  if (/^https?:|^\/\//.test(ref)) throw new Error(`External first-load dependency: ${ref}`);
  await access(resolve(dist, ref.replace(/^\//, '')));
}
let assetCount = 0;
async function visit(dir) {
  for (const name of await readdir(dir)) {
    const file = resolve(dir, name);
    if ((await stat(file)).isDirectory()) await visit(file);
    else if (/\.(js|css)$/.test(name)) {
      const text = await readFile(file, 'utf8');
      if (/relay\.ashbi\.ca|navigator\.serviceWorker\.register/.test(text)) throw new Error(`Retired network route in ${file}`);
      if (name.endsWith('.css')) {
        for (const m of text.matchAll(/url\((?:["']?)([^)'" ]+)/g)) {
          if (m[1].startsWith('data:')) continue;
          if (/^https?:|^\/\//.test(m[1])) throw new Error('Remote CSS dependency');
          await access(resolve(m[1].startsWith('/') ? dist : dirname(file), m[1].replace(/^\//, '')));
        }
      }
      assetCount++;
    }
  }
}
await visit(resolve(dist, 'assets'));
console.log(`PASS: ${refs.length} first-load references and ${assetCount} local JS/CSS assets; no relay/service-worker route. Native airplane-mode testing remains required.`);
