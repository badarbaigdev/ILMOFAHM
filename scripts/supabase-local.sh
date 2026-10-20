#!/usr/bin/env bash
# Helper for ILM-SETUP-003 local Supabase workflow.
# Usage (from repository root):
#   ./scripts/supabase-local.sh start|status|reset|stop|migration-new <name>

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

die() {
  echo "error: $*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "'$1' is not installed or not on PATH"
}

cmd="${1:-}"
shift || true

case "$cmd" in
  start)
    need_cmd docker
    need_cmd supabase
    supabase start
    supabase status
    ;;
  status)
    need_cmd supabase
    supabase status
    ;;
  reset)
    need_cmd docker
    need_cmd supabase
    supabase db reset
    ;;
  stop)
    need_cmd supabase
    supabase stop
    ;;
  migration-new)
    need_cmd supabase
    name="${1:-}"
    [[ -n "$name" ]] || die "usage: $0 migration-new <short_snake_description>"
    supabase migration new "$name"
    ;;
  *)
    cat <<'EOF'
Usage: ./scripts/supabase-local.sh <command>

Commands:
  start            Start local Supabase (Docker) and print status
  status           Show local API/DB/Studio URLs and demo keys
  reset            Drop local DB, re-apply all migrations, run seed.sql
  stop             Stop local Supabase containers
  migration-new X  Create supabase/migrations/<timestamp>_X.sql

See supabase/README.md for the full workflow.
EOF
    exit 1
    ;;
esac
