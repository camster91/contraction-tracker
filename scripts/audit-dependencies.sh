#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if command -v osv-scanner >/dev/null 2>&1; then
  OSV_SCANNER=$(command -v osv-scanner)
elif [ -x "$HOME/.local/bin/osv-scanner" ]; then
  OSV_SCANNER="$HOME/.local/bin/osv-scanner"
else
  echo "OSV Scanner is required. Install the verified official binary or follow https://github.com/google/osv-scanner." >&2
  exit 1
fi

echo "==> npm production dependency audit"
npm audit --omit=dev --audit-level=moderate

echo "==> npm complete dependency audit"
npm audit --audit-level=moderate

echo "==> OSV lockfile audit (npm, SwiftPM, and Gradle)"
"$OSV_SCANNER" scan source -r . --verbosity=warn

echo "Dependency audit passed. Re-run this network-backed gate on the clean release revision."
