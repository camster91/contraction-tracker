#!/usr/bin/env bash
# Contraction-tracker + relay Caddyfile guard.
#
# Re-adds the contractions.ashbi.ca + relay.ashbi.ca Caddy routes to
# BOTH /opt/caddy/Caddyfile and /etc/caddy/Caddyfile if a fleet-wide
# edit wipes them, and soft-reloads caddy if the running caddy has
# the admin API. Mirrors the markup-clone/scripts/markup-caddy-guard.sh
# pattern (proven 2026-06-13).
#
# Cron entry (one row, /etc/cron.d/contraction-caddy-guard):
#   * * * * * /root/contraction-tracker/scripts/caddy-guard.sh >> /var/log/contraction-caddy-guard.log 2>&1
#
# Why every minute: the worst-case window for a missing contraction
# route is bounded at 60 seconds. The actual caddy reload is only
# triggered if a file changed, so the steady-state cost is two
# greps per minute.
#
# Env vars (override before cron, defaults match production):
#   TRACKER_HOSTNAME  default contractions.ashbi.ca
#   TRACKER_PORT      default 3031
#   RELAY_HOSTNAME    default relay.ashbi.ca
#   RELAY_PORT        default 3032
#   APP_NAME          default contraction-tracker
#   LIVE_CADDYFILE    default /opt/caddy/Caddyfile
#   BASE_CADDYFILE    default /etc/caddy/Caddyfile

set -euo pipefail

TRACKER_HOSTNAME="${TRACKER_HOSTNAME:-contractions.ashbi.ca}"
TRACKER_PORT="${TRACKER_PORT:-3031}"
RELAY_HOSTNAME="${RELAY_HOSTNAME:-relay.ashbi.ca}"
RELAY_PORT="${RELAY_PORT:-3032}"
APP_NAME="${APP_NAME:-contraction-tracker}"
LIVE_CADDYFILE="${LIVE_CADDYFILE:-/opt/caddy/Caddyfile}"
BASE_CADDYFILE="${BASE_CADDYFILE:-/etc/caddy/Caddyfile}"
LOG_PREFIX="[$(date -u +%Y-%m-%dT%H:%M:%SZ)]"

# Escape dots for the regex match
TRACKER_RE="${TRACKER_HOSTNAME//./\\.}"
RELAY_RE="${RELAY_HOSTNAME//./\\.}"

changed=0
for f in "$LIVE_CADDYFILE" "$BASE_CADDYFILE"; do
  [ -f "$f" ] || continue
  if ! grep -qE "^${TRACKER_RE}\\s*\\{" "$f"; then
    echo "$LOG_PREFIX missing ${TRACKER_HOSTNAME} route in $f, re-adding"
    cat >> "$f" <<ROUTE_EOF

# ${APP_NAME} tracker (auto-added by caddy-guard.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ))
${TRACKER_HOSTNAME} {
    reverse_proxy 127.0.0.1:${TRACKER_PORT}
}
ROUTE_EOF
    changed=1
  fi
  if ! grep -qE "^${RELAY_RE}\\s*\\{" "$f"; then
    echo "$LOG_PREFIX missing ${RELAY_HOSTNAME} route in $f, re-adding"
    cat >> "$f" <<ROUTE_EOF

# ${APP_NAME} relay (auto-added by caddy-guard.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ))
${RELAY_HOSTNAME} {
    reverse_proxy 127.0.0.1:${RELAY_PORT}
}
ROUTE_EOF
    changed=1
  fi
done

[ "$changed" -eq 0 ] && exit 0

# File changed. Reload caddy softly via the admin API if available,
# else via systemctl restart.
if curl -sf --max-time 1 http://127.0.0.1:2019/config/ >/dev/null 2>&1; then
  caddy adapt --config "$LIVE_CADDYFILE" --pretty 2>/dev/null > /tmp/contraction-caddy-guard.json || {
    echo "$LOG_PREFIX caddy adapt failed; falling back to systemctl restart caddy"
    systemctl restart caddy >/dev/null 2>&1 || true
    exit 0
  }
  curl -sf -X POST -H "Content-Type: application/json" --data @/tmp/contraction-caddy-guard.json http://127.0.0.1:2019/load >/dev/null 2>&1 && \
    echo "$LOG_PREFIX caddy reloaded via admin API" || \
    echo "$LOG_PREFIX admin API POST failed; falling back to systemctl restart"
else
  systemctl restart caddy >/dev/null 2>&1 && \
    echo "$LOG_PREFIX caddy restarted" || \
    echo "$LOG_PREFIX caddy restart failed"
fi
