# Olive production monitoring

## Scope and privacy boundary

Monitor only the public PWA root and the relay's public health endpoint. Do
not monitor share URLs, session IDs, timer records, messages, care-card data,
or any endpoint that can return user content.

The repository probe is read-only:

```powershell
npm run monitor:production
```

It exits non-zero if either endpoint is unavailable, if the relay health
response is not Olive Relay, or if required browser security headers are
missing from the PWA response. Its JSON output contains endpoint status,
latency, and header-presence only.

## Alert configuration

Configure an external uptime service to make these checks every five minutes:

| Check | URL | Success condition |
| --- | --- | --- |
| Olive PWA | `https://contractions.ashbi.ca/` | HTTPS `200` |
| Olive relay | `https://relay.ashbi.ca/api/health` | HTTPS `200`, JSON `ok: true` |

Send failures to the designated release owner through the approved private
channel. Do not include response bodies or request URLs beyond the two fixed
public endpoints in notifications.

## Incident runbook

1. Run `npm run monitor:production` to distinguish the PWA from relay health.
2. Check the public HTTPS response and the current container state. Do not
   call share endpoints during an incident.
3. If a release caused the failure, restore the retained Olive source and
   Docker image snapshot documented in `SHIPPING.md`, then re-run the probe.
4. If relay persistence is involved, restore only from the verified relay
   database backup using an isolated rehearsal first; never overwrite the
   production volume blindly.
5. Record the time, affected public endpoint, rollback decision, and recovery
   time. Never record user content.

## First 48 hours after a mobile rollout

The release owner records one probe result after deployment, then checks the
two monitors daily for 48 hours. Close the observation only after both public
endpoints stay healthy, no rollback is required, and the Android/iOS testing
evidence is attached to their release issues.
