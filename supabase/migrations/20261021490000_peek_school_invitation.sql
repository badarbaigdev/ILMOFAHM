-- Allow invitees to see which email an activation token expects (token is the secret).

create or replace function public.peek_school_invitation(p_token text)
returns table (
  invitation_email text,
  school_name text,
  invitation_status text
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_token text := nullif(trim(p_token), '');
  v_token_hash text;
begin
  if v_token is null or length(v_token) < 32 then
    return;
  end if;

  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  return query
  select
    inv.email,
    s.name,
    inv.status
  from public.school_invitations as inv
  join public.schools as s on s.id = inv.school_id
  where inv.token_hash = v_token_hash
  limit 1;
end;
$$;

comment on function public.peek_school_invitation(text) is
  'Returns invited email + school name for a raw activation token. Token possession is the access check.';

revoke all on function public.peek_school_invitation(text) from public, anon;
grant execute on function public.peek_school_invitation(text) to anon, authenticated;
