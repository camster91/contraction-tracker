import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the client persists separate host and PIN access capabilities', async () => {
  const relay = await source('src/lib/relay.ts');
  assert.match(relay, /olive:share-host-token:/);
  assert.match(relay, /olive:share-access-token:/);
  assert.match(relay, /Authorization.*Bearer/s);
  assert.match(relay, /getShareEventStreamUrl/);
});

test('message identity uses a separate persistent secret', async () => {
  const identity = await source('src/lib/identity.ts');
  const feed = await source('src/lib/feed.ts');
  assert.match(identity, /olive:client-secret/);
  assert.match(identity, /getOrCreateClientSecret/);
  assert.match(feed, /clientSecret/);
});

test('the host replaces pre-capability local shares instead of reusing them', async () => {
  const shareSheet = await source('src/components/ShareSheet.tsx');
  assert.match(shareSheet, /getShareCapability\(existing\.id\)/);
  assert.match(shareSheet, /revokeShare\(existing\.id\)/);
});
