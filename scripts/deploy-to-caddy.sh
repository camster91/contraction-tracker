#!/usr/bin/env bash
# One-shot re-application of the contractions + relay Caddy routes.
# Calls the canonical guard. Idempotent: re-running on a clean
# Caddyfile is a no-op (only writes if a route is missing).
#
# Use this after:
#   - A fleet-wide Caddyfile churn wiped the contractions blocks
#   - The /opt/caddy/Caddyfile was restored from an old backup
#   - You just want to be sure both routes are present
#
# The every-minute /etc/cron.d/contraction-caddy-guard cron is the
# durable self-heal; this script is the human-driven equivalent.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/caddy-guard.sh"
