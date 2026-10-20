#!/usr/bin/env bash
# Install apps/web dependencies (including ILM-SETUP-004 Supabase packages).
# Run from any cwd; requires network access to the npm registry.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/apps/web"
npm install
echo "Installed. Next: copy .env.example to .env.local and fill from \`supabase status\`."
