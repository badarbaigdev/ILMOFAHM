#!/usr/bin/env bash
# Load synthetic platform + full Northvale school fixtures.
#
# Local (default):
#   ./scripts/seed-dev-fixtures.sh
#
# Linked develop/remote project (confirm before running):
#   ./scripts/seed-dev-fixtures.sh --linked
#
# Also applied on local `supabase db reset` via supabase/seed.sql.
#
# Never run against production. Never commit real emails/passwords.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PLATFORM_FIXTURE="$ROOT/supabase/fixtures/dev_platform.sql"
RIVERBEND_FIXTURE="$ROOT/supabase/fixtures/dev_riverbend.sql"
TARGET="${1:-local}"
SCOPE="${2:-all}"

if [[ ! -f "$PLATFORM_FIXTURE" ]]; then
  echo "error: missing $PLATFORM_FIXTURE" >&2
  exit 1
fi

run_query() {
  local file="$1"
  case "$TARGET" in
    local | --local | "")
      supabase db query --local -f "$file"
      ;;
    --linked | linked)
      supabase db query --linked -f "$file"
      ;;
    *)
      echo "usage: $0 [--local|--linked] [all|platform|riverbend]" >&2
      exit 1
      ;;
  esac
}

case "$TARGET" in
  --linked | linked)
    echo "About to seed the LINKED remote Supabase project ($SCOPE)."
    echo "Type 'seed-develop' to continue:"
    read -r CONFIRM
    if [[ "$CONFIRM" != "seed-develop" ]]; then
      echo "Aborted."
      exit 1
    fi
    ;;
esac

case "$SCOPE" in
  all | "")
    echo "Seeding platform + Northvale…"
    run_query "$PLATFORM_FIXTURE"
    if [[ -f "$RIVERBEND_FIXTURE" ]]; then
      echo "Seeding Riverbend Coaching…"
      run_query "$RIVERBEND_FIXTURE" || echo "Riverbend skipped (school may not exist yet)."
    fi
    ;;
  platform | northvale)
    echo "Seeding platform + Northvale…"
    run_query "$PLATFORM_FIXTURE"
    ;;
  riverbend)
    if [[ ! -f "$RIVERBEND_FIXTURE" ]]; then
      echo "error: missing $RIVERBEND_FIXTURE" >&2
      exit 1
    fi
    echo "Seeding Riverbend Coaching…"
    run_query "$RIVERBEND_FIXTURE"
    ;;
  *)
    echo "usage: $0 [--local|--linked] [all|platform|riverbend]" >&2
    exit 1
    ;;
esac

cat <<'EOF'

Done. Sign in at /auth/sign-in (password for all: DevPass123!)

  operator@ilmofahm.test      → /platform (admin + pending school requests)
  owner@northvale.test        → /school  (full Northvale Academy data)
  teacher@northvale.test      → attendance / read-only elsewhere
  accountant@northvale.test   → fees manage

Northvale includes: academic year 2026-27, grades 1–3, sections, subjects,
6 students + enrolments, guardians, 3 teachers, fee heads/charges/payments,
submitted + draft attendance for Grade 1-A.

Riverbend Coaching (if provisioned): full batches/students/fees/attendance.
  teacher@riverbend-demo.com / DevPass123!
  accountant@riverbend-demo.com / DevPass123!
  Owner: the activated applicant for that school.

Re-seed Riverbend only:
  ./scripts/seed-dev-fixtures.sh --linked riverbend
EOF
