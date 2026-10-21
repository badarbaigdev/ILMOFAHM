#!/usr/bin/env bash
# Local-only: mark an existing Auth user as an active platform operator (Superadmin).
#
# Usage (repo root, local Supabase running):
#   ./scripts/bootstrap-platform-operator.sh operator@example.test
#
# Create the Auth user first via /auth/sign-up or Studio, then run this script.
# Never use production credentials or commit real emails/passwords.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

EMAIL="${1:-}"
if [[ -z "$EMAIL" ]]; then
  echo "usage: $0 <auth-user-email>" >&2
  exit 1
fi

DB_URL="$(supabase status -o env 2>/dev/null | sed -n 's/^DB_URL=//p' | tr -d '"')"
if [[ -z "$DB_URL" ]]; then
  DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
fi

psql "$DB_URL" -v ON_ERROR_STOP=1 <<SQL
insert into public.profiles (id, full_name)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
from auth.users as u
where lower(u.email) = lower('${EMAIL}')
on conflict (id) do nothing;

insert into public.platform_operators (user_id, role, status)
select u.id, 'operator', 'active'
from auth.users as u
where lower(u.email) = lower('${EMAIL}')
on conflict (user_id) do update
  set status = 'active',
      role = 'operator',
      updated_at = now();

select u.email, po.status as operator_status
from auth.users as u
join public.platform_operators as po on po.user_id = u.id
where lower(u.email) = lower('${EMAIL}');
SQL

echo "Done. Sign in at /auth/sign-in — you should land on /platform."
