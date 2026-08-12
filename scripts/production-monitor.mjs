#!/usr/bin/env node

/**
 * Read-only Olive production liveness probe.
 *
 * This intentionally requests only public, content-free endpoints. Do not add
 * share, timer, session, analytics, or user-content requests to this script.
 */

const appUrl = process.env.OLIVE_APP_URL ?? 'https://contractions.ashbi.ca/';
const relayUrl = process.env.OLIVE_RELAY_HEALTH_URL ?? 'https://relay.ashbi.ca/api/health';
const timeoutMs = Number(process.env.OLIVE_MONITOR_TIMEOUT_MS ?? 10_000);

const requiredAppHeaders = [
  'content-security-policy',
  'strict-transport-security',
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
];

async function request(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'user-agent': 'olive-production-monitor/1.0' },
      redirect: 'error',
      signal: controller.signal,
    });
    const body = await response.text();
    return {
      url,
      ok: response.ok,
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      headers: Object.fromEntries(response.headers.entries()),
      body,
    };
  } finally {
    clearTimeout(timer);
  }
}

function checkApp(result) {
  const missingHeaders = requiredAppHeaders.filter((header) => !result.headers[header]);
  return {
    endpoint: 'app',
    url: result.url,
    ok: result.ok && missingHeaders.length === 0,
    status: result.status,
    durationMs: result.durationMs,
    missingHeaders,
  };
}

function checkRelay(result) {
  let health;
  try {
    health = JSON.parse(result.body);
  } catch {
    health = null;
  }
  return {
    endpoint: 'relay-health',
    url: result.url,
    ok: result.ok && health?.ok === true && health?.service === 'olive-relay',
    status: result.status,
    durationMs: result.durationMs,
    service: health?.service ?? null,
    version: health?.version ?? null,
  };
}

async function main() {
  const checkedAt = new Date().toISOString();
  const results = await Promise.allSettled([request(appUrl), request(relayUrl)]);
  const checks = results.map((result, index) => {
    const endpoint = index === 0 ? 'app' : 'relay-health';
    if (result.status === 'rejected') {
      return { endpoint, url: index === 0 ? appUrl : relayUrl, ok: false, error: result.reason?.name ?? 'request-failed' };
    }
    return index === 0 ? checkApp(result.value) : checkRelay(result.value);
  });
  const report = { checkedAt, ok: checks.every((check) => check.ok), checks };
  console.log(JSON.stringify(report));
  process.exitCode = report.ok ? 0 : 1;
}

main();
