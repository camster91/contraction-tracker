import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('the production static server applies browser security headers', async () => {
  const config = JSON.parse(await readFile(new URL('../serve.json', import.meta.url), 'utf8'));
  const allPaths = config.headers.find((rule) => rule.source === '**/*');
  assert.ok(allPaths, 'serve.json must configure every response path');

  const headers = Object.fromEntries(
    allPaths.headers.map(({ key, value }) => [key.toLowerCase(), value]),
  );
  assert.match(headers['content-security-policy'], /frame-ancestors 'none'/);
  assert.equal(headers['x-frame-options'], 'DENY');
  assert.equal(headers['x-content-type-options'], 'nosniff');
  assert.equal(headers['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.match(headers['strict-transport-security'], /max-age=31536000/);
});

test('production builds do not publish source maps', async () => {
  const viteConfig = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8');
  assert.match(viteConfig, /sourcemap:\s*false/);
});

test('the container loads the config from outside the served directory', async () => {
  const dockerfile = await readFile(new URL('../Dockerfile', import.meta.url), 'utf8');
  assert.match(dockerfile, /"--config", "\.\.\/serve\.json"/);
});

test('serve emits the configured headers on an actual response', async () => {
  const port = 49124;
  const child = spawn(process.execPath, [
    'node_modules/serve/build/main.js', 'dist', '-l', String(port),
    '--no-clipboard', '--config', '../serve.json',
  ], { cwd: fileURLToPath(new URL('..', import.meta.url)), stdio: 'ignore' });
  try {
    let response;
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        response = await fetch(`http://127.0.0.1:${port}/`);
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    assert.ok(response?.ok, 'static server did not become ready');
    assert.match(response.headers.get('content-security-policy') || '', /frame-ancestors 'none'/);
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.match(response.headers.get('strict-transport-security') || '', /max-age=31536000/);
  } finally {
    child.kill();
    await new Promise((resolve) => child.once('exit', resolve));
  }
});
