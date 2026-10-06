> Historical review or plan. Use [RELEASE-PLAN.md](RELEASE-PLAN.md) for current v1.3.0 gates; this record is not current signed-binary, console, or launch evidence.

# Olive relay security and reliability review

Status: audited and remediated locally; production rollout and post-deploy verification remain blocked on owner release approval.

Review date: 2026-08-28  
Repository: `camster91/luna-relay` at audited revision `230ba2b27784ac429df19fd69a55e90a2c02b4ba`  
Codex Security scan: `8ee75bea-de1d-446a-83ce-a20a0140cfa7`

## Validated findings and local remediation

| Finding | Severity | Local remediation | Evidence |
| --- | --- | --- | --- |
| Stats-only SSE exposed individual timing | High | Stats streams now emit an update signal without contractions or current timing. | Adversarial SSE regression passes. |
| Requester-controlled forwarding header bypassed limits | High | Safe default uses the direct peer; forwarded addresses require an explicit trusted-proxy hop configuration. | Rotating `X-Forwarded-For` no longer resets PIN attempts. |
| SSE connections and heartbeat timers were unbounded | Medium | Global, per-share, and per-IP ceilings plus idempotent disconnect cleanup were added. | Capacity and replacement-after-disconnect test passes. |
| Event history had unbounded replay cost | Medium | A configurable hard per-share event ceiling bounds retained events and replay work. | Boundary test accepts normal events and rejects the next event at the ceiling. |
| Reusable viewer bearer appeared in SSE URLs | Medium | A 60-second, single-use, share-bound stream ticket replaces the reusable query bearer; all app callers request a new ticket on reconnect. | Reusable query token rejection, ticket success, and replay rejection pass. |
| Persistence failures were silently acknowledged | Medium | Saves use a flushed temporary file and atomic rename; failures restore the last durable in-memory image, return 503, and degrade health. Revoke purge and audit are persisted before notification. | Forced write-failure, rollback, degraded-health, and recovery test passes. |

An independent patch review then found and resolved four regressions: backpressured sockets escaping cap accounting, expired-ticket accumulation, post-unmount EventSource creation, and an inconsistent persistence-outage status on share creation.

Relay verification: `npm test` — 25 passed, 0 failed, including a contract that aggregate stats expose facts without a generic clinical timing inference. `npm ci` reported 0 known dependency vulnerabilities. App verification after the ticket migration: `npm run verify` passed lint, service-worker version check, store metadata, TypeScript, and production build; the focused client security contract passed 3 tests. The full Chromium iPhone-profile Playwright run passed 120 tests with 23 expected relay-dependent or legacy-feature skips. Fresh Capacitor syncs completed for both platforms, followed by successful unsigned iOS Simulator and Android debug builds.

## Production release gates

- [ ] Configure and verify the exact Coolify reverse-proxy hop count; keep the origin inaccessible directly.
- [ ] Confirm `/app/data` is a durable mounted volume and complete backup/restore evidence.
- [ ] Configure query-string redaction in proxy/platform logs even though only short-lived tickets remain.
- [ ] Add alerts for relay health 503, disk pressure, restarts, and abnormal SSE connection pressure.
- [ ] Deploy the relay and coordinated Olive client in one approved rollout with rollback artifacts.
- [ ] Re-run PIN, stats sharing, ticket replay, revoke, expiry, outage, and reconnection journeys against production.

No production release occurred during this review.
