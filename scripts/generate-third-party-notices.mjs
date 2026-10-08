// Preserve the licences of bundled runtime fonts, icons and software offline.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
// Scheduler ships with React DOM; Tailwind supplies the generated CSS runtime.
const packages = [...Object.keys(pkg.dependencies), 'scheduler', 'tailwindcss'].sort();
const sections = packages.map(name => {
  const directory = resolve(root, 'node_modules', name);
  const dependency = JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8'));
  const licence = readFileSync(resolve(directory, 'LICENSE'), 'utf8').trim();
  return `${name} ${dependency.version}\n${'='.repeat(72)}\n${licence}`;
});
writeFileSync(resolve(root, 'public/third-party-notices.txt'),
  `Olive — Third-party notices\n\nBundled fonts, icons and software retain the following licences.\n\n${sections.join('\n\n')}\n`);
console.log(`Bundled ${packages.length} third-party licence notices.`);
