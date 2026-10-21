#!/usr/bin/env bash
# Local-only: promote an existing Auth user via controlled first-operator bootstrap.
#
# Usage (repo root, local Supabase running):
#   ./scripts/bootstrap-platform-operator.sh operator@example.test
#
# Create the Auth user first via /auth/sign-up or Studio, then run this script.
# The database rejects bootstrap once any active operator exists.
# Never use production credentials or commit real emails/passwords.
#
# Prefer the in-app path when possible: sign in → /platform/bootstrap

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

# Escape single quotes for SQL literal
EMAIL_SQL="${EMAIL//\'/\'\'}"

psql "$DB_URL" -v ON_ERROR_STOP=1 <<SQL
do \$\$
declare
  v_user_id uuid;
  v_result uuid;
begin
  select u.id into v_user_id
  from auth.users as u
  where lower(u.email) = lower('${EMAIL_SQL}');

  if v_user_id is null then
    raise exception 'No Auth user found for email %', '${EMAIL_SQL}';
  end if;

  insert into public.profiles (id, full_name)
  select u.id, coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
  from auth.users as u
  where u.id = v_user_id
  on conflict (id) do nothing;

  -- Run bootstrap as the target authenticated user (honours FORCE RLS).
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';

  v_result := public.bootstrap_first_platform_operator();

  raise notice 'Bootstrapped platform operator % (%)', '${EMAIL_SQL}', v_result;
end;
\$\$;

select u.email, po.status as operator_status, po.role
from auth.users as u
join public.platform_operators as po on po.user_id = u.id
where lower(u.email) = lower('${EMAIL_SQL}');
SQL

echo "Done. Sign in at /auth/sign-in — you should land on /platform."
echo "In-app alternative: /platform/bootstrap (only while no active operator exists)."
