#!/bin/bash
# Deploy contraction-tracker (frontend) + olive-relay (backend) to vps.ashbi.ca
# Pattern: docker-compose + main /opt/caddy/Caddyfile (no auto-snippet glob)
# Box: coolify alias → 187.77.26.99, root user
set -euo pipefail

BOX="coolify"
REMOTE="/opt/projects"

TRACKER_SRC="/Users/biancabienaime/projects/contraction-tracker"
RELAY_SRC="/Users/biancabienaime/projects/luna-relay"

TRACKER_PORT=3020
RELAY_PORT=3021

echo "=== 1. Verify local sources ==="
for d in "$TRACKER_SRC" "$RELAY_SRC"; do
    [ -d "$d" ] || { echo "MISSING: $d"; exit 1; }
done
[ -f "$TRACKER_SRC/Dockerfile" ] || { echo "missing tracker Dockerfile"; exit 1; }
[ -f "$RELAY_SRC/Dockerfile" ] || { echo "missing relay Dockerfile"; exit 1; }
echo "  tracker: $TRACKER_SRC"
echo "  relay:   $RELAY_SRC"

echo ""
echo "=== 2. Create project dirs on box ==="
ssh "$BOX" "mkdir -p $REMOTE/contraction-tracker/src $REMOTE/contraction-tracker-relay/src"

echo ""
echo "=== 3. Rsync source (no node_modules, no .git, no dist, no data) ==="
rsync -az --delete \
    --exclude='node_modules' --exclude='dist' --exclude='.git' \
    --exclude='.env' --exclude='android' --exclude='ios' \
    --exclude='playwright-report' --exclude='tests' \
    "$TRACKER_SRC/" "$BOX:$REMOTE/contraction-tracker/src/"

rsync -az --delete \
    --exclude='node_modules' --exclude='.git' --exclude='data' \
    "$RELAY_SRC/" "$BOX:$REMOTE/contraction-tracker-relay/src/"

echo ""
echo "=== 4. Write docker-compose.yml for tracker ==="
ssh "$BOX" "cat > $REMOTE/contraction-tracker/docker-compose.yml" <<'EOF'
services:
  app:
    build:
      context: ./src
      dockerfile: Dockerfile
    image: camster91/contraction-tracker:build-latest
    container_name: contraction-tracker
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "3020:3000"
    networks:
      - proxy

networks:
  proxy:
    name: proxy
    external: true
EOF

echo "=== 5. Write docker-compose.yml for tracker-relay ==="
ssh "$BOX" "cat > $REMOTE/contraction-tracker-relay/docker-compose.yml" <<'EOF'
services:
  app:
    build:
      context: ./src
      dockerfile: Dockerfile
    image: camster91/contraction-tracker-relay:build-latest
    container_name: contraction-tracker-relay
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - tracker-relay-data:/app/data
    ports:
      - "3021:3000"
    networks:
      - proxy

volumes:
  tracker-relay-data:

networks:
  proxy:
    name: proxy
    external: true
EOF

echo "=== 6. Write .env files ==="
# VITE_* are inlined at build time. relay.ashbi.ca is the public hostname.
ssh "$BOX" "cat > $REMOTE/contraction-tracker/.env" <<'EOF'
VITE_RELAY_URL=https://relay.ashbi.ca
VITE_PUBLIC_URL=https://contractions.ashbi.ca
EOF

ssh "$BOX" "cat > $REMOTE/contraction-tracker-relay/.env" <<'EOF'
PORT=3000
DB_PATH=/app/data/relay.db
ALLOWED_ORIGIN=https://contractions.ashbi.ca
EOF

echo "=== 7. Append Caddy blocks to /opt/caddy/Caddyfile ==="
# Add at end of file. Check if not already there.
ssh "$BOX" "grep -q 'contractions.ashbi.ca' /opt/caddy/Caddyfile && { echo '  already in Caddyfile, skipping append'; } || cat >> /opt/caddy/Caddyfile <<'EOF'

# Contraction tracker (Olive) — Vite SPA, node:24-alpine + serve
contractions.ashbi.ca {
    reverse_proxy 127.0.0.1:3020
}

# Contraction tracker relay (Olive SSE) — Express + sql.js
relay.ashbi.ca {
    reverse_proxy 127.0.0.1:3021
}
EOF"

echo ""
echo "=== 8. Build images (this is the slow part — ~3-5 min on the box) ==="
echo "  building tracker..."
ssh "$BOX" "cd $REMOTE/contraction-tracker && docker compose build 2>&1 | tail -10"
echo "  building relay..."
ssh "$BOX" "cd $REMOTE/contraction-tracker-relay && docker compose build 2>&1 | tail -10"

echo ""
echo "=== 9. Start containers ==="
ssh "$BOX" "cd $REMOTE/contraction-tracker && docker compose up -d"
ssh "$BOX" "cd $REMOTE/contraction-tracker-relay && docker compose up -d"

echo ""
echo "=== 10. Wait 5s, then verify both containers are up ==="
sleep 5
ssh "$BOX" "docker ps --filter name=contraction-tracker --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
ssh "$BOX" "docker ps --filter name=contraction-tracker-relay --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

echo ""
echo "=== 11. Smoke test from box localhost ==="
ssh "$BOX" "echo 'tracker (3020):'; curl -sI -o /dev/null -w '  HTTP %{http_code}\n' --max-time 5 http://127.0.0.1:3020"
ssh "$BOX" "echo 'relay (3021):';   curl -sI -o /dev/null -w '  HTTP %{http_code}\n' --max-time 5 http://127.0.0.1:3021"

echo ""
echo "=== 12. Validate + reload Caddy ==="
ssh "$BOX" "caddy validate --config /opt/caddy/Caddyfile 2>&1 | tail -5"
ssh "$BOX" "systemctl reload caddy 2>&1 || pkill -USR1 caddy 2>&1 || true"

echo ""
echo "=== 13. Smoke test the public hostnames (HTTPS, ACME certs may take ~30s) ==="
sleep 30
echo "contractions.ashbi.ca:"
curl -sI -o /dev/null -w "  HTTP %{http_code} in %{time_total}s\n" --max-time 15 https://contractions.ashbi.ca
echo "relay.ashbi.ca:"
curl -sI -o /dev/null -w "  HTTP %{http_code} in %{time_total}s\n" --max-time 15 https://relay.ashbi.ca

echo ""
echo "DONE. If both HTTPS probes return 200, ship-ready."
