-- Phase 9: Manual SaaS subscriptions (plans, school subscriptions, payments)
-- No payment gateways. Separate from future student fee ledgers.

-- ---------------------------------------------------------------------------
-- subscription_plans (catalog)
-- ---------------------------------------------------------------------------

create table public.subscription_plans (
  id text primary key,
  name text not null,
  summary text not null,
  billing_interval text not null default 'monthly',
  example_amount numeric(12, 2),
  currency_code text not null default 'PKR',
  highlights jsonb not null default '[]'::jsonb,
  entitlements jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_plans_id_format check (
    id ~ '^[a-z][a-z0-9_]{1,62}$'
  ),
  constraint subscription_plans_name_not_blank check (length(trim(name)) > 0),
  constraint subscription_plans_summary_not_blank check (
    length(trim(summary)) > 0
  ),
  constraint subscription_plans_billing_interval_valid check (
    billing_interval in ('monthly', 'yearly')
  ),
  constraint subscription_plans_example_amount_non_negative check (
    example_amount is null or example_amount >= 0
  ),
  constraint subscription_plans_currency_format check (
    currency_code ~ '^[A-Z]{3}$'
  ),
  constraint subscription_plans_highlights_is_array check (
    jsonb_typeof(highlights) = 'array'
  ),
  constraint subscription_plans_entitlements_is_object check (
    jsonb_typeof(entitlements) = 'object'
  )
);

comment on table public.subscription_plans is
  'ILMOFAHM SaaS plan catalog. Not student fee plans.';

create trigger subscription_plans_set_updated_at
before update on public.subscription_plans
for each row
execute function public.set_updated_at();

insert into public.subscription_plans (
  id, name, summary, billing_interval, example_amount, currency_code,
  highlights, entitlements, is_public, is_active, sort_order
)
values
  (
    'starter',
    'Starter',
    'For a single campus beginning structured digital operations.',
    'monthly',
    null,
    'PKR',
    '["One school workspace","Owner and administrator seats","Core administration modules as they ship","Email support during onboarding"]'::jsonb,
    '{"campus_limit":1,"support_level":"email"}'::jsonb,
    true,
    true,
    10
  ),
  (
    'growth',
    'Growth',
    'For schools expanding campuses, staff roles, and reporting needs.',
    'monthly',
    null,
    'PKR',
    '["Multi-campus structure","Extended role set","Priority onboarding guidance","Reporting as modules become available"]'::jsonb,
    '{"campus_limit":5,"support_level":"priority"}'::jsonb,
    true,
    true,
    20
  ),
  (
    'institution',
    'Institution',
    'For larger networks needing tailored limits and operational support.',
    'monthly',
    null,
    'PKR',
    '["Custom campus and seat limits","Coordinated rollout planning","Manual subscription management","Named operator contact"]'::jsonb,
    '{"campus_limit":null,"support_level":"named"}'::jsonb,
    true,
    true,
    30
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- school_subscriptions
-- ---------------------------------------------------------------------------

create table public.school_subscriptions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  plan_id text not null
    references public.subscription_plans (id)
    on delete restrict,
  status text not null default 'trial',
  billing_interval text not null default 'monthly',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  trial_ends_at timestamptz,
  renewal_at timestamptz,
  cancelled_at timestamptz,
  billing_contact_name text,
  billing_contact_email text,
  notes text,
  is_current boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_subscriptions_status_valid check (
    status in (
      'trial',
      'active',
      'past_due',
      'grace',
      'cancelled',
      'suspended',
      'expired'
    )
  ),
  constraint school_subscriptions_billing_interval_valid check (
    billing_interval in ('monthly', 'yearly')
  ),
  constraint school_subscriptions_billing_email_format check (
    billing_contact_email is null
    or (
      billing_contact_email = lower(trim(billing_contact_email))
      and billing_contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    )
  ),
  constraint school_subscriptions_billing_name_not_blank check (
    billing_contact_name is null
    or length(trim(billing_contact_name)) > 0
  )
);

comment on table public.school_subscriptions is
  'ILMOFAHM SaaS subscription per school. Distinct from schools.status lifecycle.';

create index school_subscriptions_school_id_idx
  on public.school_subscriptions (school_id);

create index school_subscriptions_status_idx
  on public.school_subscriptions (status);

create unique index school_subscriptions_one_current_per_school
  on public.school_subscriptions (school_id)
  where is_current;

create trigger school_subscriptions_set_updated_at
before update on public.school_subscriptions
for each row
execute function public.set_updated_at();

create trigger school_subscriptions_reject_school_id_change
before update on public.school_subscriptions
for each row
execute function public.reject_school_id_change();

-- ---------------------------------------------------------------------------
-- subscription_payments (manual)
-- ---------------------------------------------------------------------------

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  school_subscription_id uuid not null
    references public.school_subscriptions (id)
    on delete restrict,
  amount numeric(12, 2) not null,
  currency_code text not null default 'PKR',
  status text not null default 'recorded',
  paid_at timestamptz not null default now(),
  period_start date,
  period_end date,
  method text not null default 'bank_transfer',
  reference text,
  notes text,
  idempotency_key text,
  recorded_by uuid references public.profiles (id) on delete set null,
  voided_by uuid references public.profiles (id) on delete set null,
  void_reason text,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_payments_amount_positive check (amount > 0),
  constraint subscription_payments_currency_format check (
    currency_code ~ '^[A-Z]{3}$'
  ),
  constraint subscription_payments_status_valid check (
    status in ('recorded', 'confirmed', 'voided')
  ),
  constraint subscription_payments_method_valid check (
    method in ('bank_transfer', 'cash', 'cheque', 'other')
  ),
  constraint subscription_payments_period_order check (
    period_start is null
    or period_end is null
    or period_end >= period_start
  ),
  constraint subscription_payments_void_consistency check (
    (status = 'voided' and voided_at is not null)
    or (status <> 'voided' and voided_at is null)
  )
);

comment on table public.subscription_payments is
  'Manual SaaS payment records for ILMOFAHM subscriptions. No payment gateway. Never mix with student fee ledgers.';

create unique index subscription_payments_idempotency_key_unique
  on public.subscription_payments (idempotency_key)
  where idempotency_key is not null;

create index subscription_payments_school_id_idx
  on public.subscription_payments (school_id);

create index subscription_payments_subscription_id_idx
  on public.subscription_payments (school_subscription_id);

create trigger subscription_payments_set_updated_at
before update on public.subscription_payments
for each row
execute function public.set_updated_at();

create trigger subscription_payments_reject_school_id_change
before update on public.subscription_payments
for each row
execute function public.reject_school_id_change();

-- ---------------------------------------------------------------------------
-- RLS + grants (operator manage via RPC; authenticated read plans/public)
-- ---------------------------------------------------------------------------

alter table public.subscription_plans enable row level security;
alter table public.subscription_plans force row level security;
alter table public.school_subscriptions enable row level security;
alter table public.school_subscriptions force row level security;
alter table public.subscription_payments enable row level security;
alter table public.subscription_payments force row level security;

revoke all on table public.subscription_plans from anon, authenticated;
revoke all on table public.school_subscriptions from anon, authenticated;
revoke all on table public.subscription_payments from anon, authenticated;

grant select on table public.subscription_plans to anon, authenticated;
grant select on table public.school_subscriptions to authenticated;
grant select on table public.subscription_payments to authenticated;

create policy subscription_plans_select_public_or_operator
on public.subscription_plans
for select
to anon, authenticated
using (
  (is_public and is_active)
  or public.is_platform_operator()
);

create policy school_subscriptions_select_member_or_operator
on public.school_subscriptions
for select
to authenticated
using (
  public.is_platform_operator()
  or public.is_active_school_member(school_id)
);

create policy subscription_payments_select_operator
on public.subscription_payments
for select
to authenticated
using (public.is_platform_operator());

-- ---------------------------------------------------------------------------
-- ensure_school_trial_subscription (idempotent; used by provision)
-- ---------------------------------------------------------------------------

create or replace function public.ensure_school_trial_subscription(
  p_school_id uuid,
  p_plan_id text default 'starter',
  p_trial_days integer default 30
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
  v_plan_id text := coalesce(nullif(trim(p_plan_id), ''), 'starter');
  v_existing uuid;
  v_id uuid;
  v_interval text;
begin
  if p_school_id is null then
    raise exception 'school_id is required'
      using errcode = '22023';
  end if;

  if not exists (select 1 from public.schools as s where s.id = p_school_id) then
    raise exception 'School not found'
      using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.subscription_plans as p
    where p.id = v_plan_id and p.is_active
  ) then
    v_plan_id := 'starter';
  end if;

  select s.id
  into v_existing
  from public.school_subscriptions as s
  where s.school_id = p_school_id
    and s.is_current
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  select p.billing_interval
  into v_interval
  from public.subscription_plans as p
  where p.id = v_plan_id;

  insert into public.school_subscriptions (
    school_id,
    plan_id,
    status,
    billing_interval,
    starts_at,
    trial_ends_at,
    is_current,
    created_by,
    updated_by
  )
  values (
    p_school_id,
    v_plan_id,
    'trial',
    coalesce(v_interval, 'monthly'),
    now(),
    now() + make_interval(days => greatest(coalesce(p_trial_days, 30), 1)),
    true,
    v_actor,
    v_actor
  )
  returning id into v_id;

  perform public.write_audit_event(
    null,
    v_actor,
    'platform.subscription.created',
    'school_subscription',
    v_id,
    jsonb_build_object(
      'school_id', p_school_id,
      'plan_id', v_plan_id,
      'status', 'trial',
      'source', 'provision'
    ),
    'success',
    'operator',
    p_school_id
  );

  return v_id;
end;
$$;

revoke all on function public.ensure_school_trial_subscription(uuid, text, integer)
  from public, anon;
grant execute on function public.ensure_school_trial_subscription(uuid, text, integer)
  to authenticated;

-- ---------------------------------------------------------------------------
-- assign_school_subscription
-- ---------------------------------------------------------------------------

create or replace function public.assign_school_subscription(
  p_school_id uuid,
  p_plan_id text,
  p_status text default 'active',
  p_billing_interval text default null,
  p_billing_contact_name text default null,
  p_billing_contact_email text default null,
  p_notes text default null,
  p_trial_ends_at timestamptz default null,
  p_renewal_at timestamptz default null
)
returns table (
  subscription_id uuid,
  school_id uuid,
  plan_id text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
  v_plan text := nullif(trim(p_plan_id), '');
  v_status text := coalesce(nullif(trim(p_status), ''), 'active');
  v_interval text := nullif(trim(p_billing_interval), '');
  v_name text := nullif(trim(p_billing_contact_name), '');
  v_email text := lower(nullif(trim(p_billing_contact_email), ''));
  v_notes text := nullif(trim(p_notes), '');
  v_plan_interval text;
  v_id uuid;
begin
  if v_actor is null or not public.is_platform_operator() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  if p_school_id is null then
    raise exception 'school_id is required'
      using errcode = '22023';
  end if;

  if v_plan is null then
    raise exception 'plan_id is required'
      using errcode = '22023';
  end if;

  if v_status not in (
    'trial', 'active', 'past_due', 'grace', 'cancelled', 'suspended', 'expired'
  ) then
    raise exception 'Invalid subscription status'
      using errcode = '22023';
  end if;

  select p.billing_interval
  into v_plan_interval
  from public.subscription_plans as p
  where p.id = v_plan
    and p.is_active;

  if not found then
    raise exception 'Plan not found or inactive'
      using errcode = 'P0002';
  end if;

  if v_interval is null then
    v_interval := v_plan_interval;
  elsif v_interval not in ('monthly', 'yearly') then
    raise exception 'Invalid billing_interval'
      using errcode = '22023';
  end if;

  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Valid billing contact email is required when provided'
      using errcode = '22023';
  end if;

  if not exists (select 1 from public.schools as s where s.id = p_school_id) then
    raise exception 'School not found'
      using errcode = 'P0002';
  end if;

  update public.school_subscriptions as s
  set
    is_current = false,
    updated_by = v_actor,
    updated_at = now()
  where s.school_id = p_school_id
    and s.is_current;

  insert into public.school_subscriptions (
    school_id,
    plan_id,
    status,
    billing_interval,
    starts_at,
    trial_ends_at,
    renewal_at,
    billing_contact_name,
    billing_contact_email,
    notes,
    is_current,
    created_by,
    updated_by
  )
  values (
    p_school_id,
    v_plan,
    v_status,
    v_interval,
    now(),
    case when v_status = 'trial' then coalesce(p_trial_ends_at, now() + interval '30 days') else p_trial_ends_at end,
    p_renewal_at,
    v_name,
    v_email,
    v_notes,
    true,
    v_actor,
    v_actor
  )
  returning id into v_id;

  perform public.write_audit_event(
    null,
    v_actor,
    'platform.subscription.assigned',
    'school_subscription',
    v_id,
    jsonb_build_object(
      'school_id', p_school_id,
      'plan_id', v_plan,
      'status', v_status
    ),
    'success',
    'operator',
    p_school_id
  );

  subscription_id := v_id;
  school_id := p_school_id;
  plan_id := v_plan;
  status := v_status;
  return next;
end;
$$;

revoke all on function public.assign_school_subscription(
  uuid, text, text, text, text, text, text, timestamptz, timestamptz
) from public, anon;
grant execute on function public.assign_school_subscription(
  uuid, text, text, text, text, text, text, timestamptz, timestamptz
) to authenticated;

-- ---------------------------------------------------------------------------
-- set_school_subscription_status
-- ---------------------------------------------------------------------------

create or replace function public.set_school_subscription_status(
  p_subscription_id uuid,
  p_status text,
  p_notes text default null
)
returns table (
  subscription_id uuid,
  school_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
  v_status text := nullif(trim(p_status), '');
  v_notes text := nullif(trim(p_notes), '');
  v_row public.school_subscriptions%rowtype;
begin
  if v_actor is null or not public.is_platform_operator() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  if p_subscription_id is null then
    raise exception 'subscription_id is required'
      using errcode = '22023';
  end if;

  if v_status is null or v_status not in (
    'trial', 'active', 'past_due', 'grace', 'cancelled', 'suspended', 'expired'
  ) then
    raise exception 'Invalid subscription status'
      using errcode = '22023';
  end if;

  select *
  into v_row
  from public.school_subscriptions as s
  where s.id = p_subscription_id
  for update;

  if not found then
    raise exception 'Subscription not found'
      using errcode = 'P0002';
  end if;

  update public.school_subscriptions as s
  set
    status = v_status,
    cancelled_at = case when v_status = 'cancelled' then coalesce(s.cancelled_at, now()) else s.cancelled_at end,
    notes = coalesce(v_notes, s.notes),
    updated_by = v_actor,
    updated_at = now()
  where s.id = p_subscription_id;

  perform public.write_audit_event(
    null,
    v_actor,
    'platform.subscription.status_changed',
    'school_subscription',
    p_subscription_id,
    jsonb_build_object(
      'before', v_row.status,
      'after', v_status,
      'school_id', v_row.school_id
    ),
    'success',
    'operator',
    v_row.school_id
  );

  subscription_id := p_subscription_id;
  school_id := v_row.school_id;
  status := v_status;
  return next;
end;
$$;

revoke all on function public.set_school_subscription_status(uuid, text, text)
  from public, anon;
grant execute on function public.set_school_subscription_status(uuid, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- record_subscription_payment
-- ---------------------------------------------------------------------------

create or replace function public.record_subscription_payment(
  p_school_subscription_id uuid,
  p_amount numeric,
  p_currency_code text default 'PKR',
  p_method text default 'bank_transfer',
  p_reference text default null,
  p_notes text default null,
  p_paid_at timestamptz default null,
  p_period_start date default null,
  p_period_end date default null,
  p_idempotency_key text default null,
  p_confirm boolean default false
)
returns table (
  payment_id uuid,
  school_id uuid,
  status text,
  already_recorded boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
  v_sub public.school_subscriptions%rowtype;
  v_currency text := upper(coalesce(nullif(trim(p_currency_code), ''), 'PKR'));
  v_method text := coalesce(nullif(trim(p_method), ''), 'bank_transfer');
  v_reference text := nullif(trim(p_reference), '');
  v_notes text := nullif(trim(p_notes), '');
  v_key text := nullif(trim(p_idempotency_key), '');
  v_status text := case when p_confirm then 'confirmed' else 'recorded' end;
  v_existing public.subscription_payments%rowtype;
  v_id uuid;
begin
  if v_actor is null or not public.is_platform_operator() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  if p_school_subscription_id is null then
    raise exception 'school_subscription_id is required'
      using errcode = '22023';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero'
      using errcode = '22023';
  end if;

  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid currency code'
      using errcode = '22023';
  end if;

  if v_method not in ('bank_transfer', 'cash', 'cheque', 'other') then
    raise exception 'Invalid payment method'
      using errcode = '22023';
  end if;

  select *
  into v_sub
  from public.school_subscriptions as s
  where s.id = p_school_subscription_id
  for update;

  if not found then
    raise exception 'Subscription not found'
      using errcode = 'P0002';
  end if;

  if v_key is not null then
    select *
    into v_existing
    from public.subscription_payments as p
    where p.idempotency_key = v_key;

    if found then
      payment_id := v_existing.id;
      school_id := v_existing.school_id;
      status := v_existing.status;
      already_recorded := true;
      return next;
      return;
    end if;
  end if;

  insert into public.subscription_payments (
    school_id,
    school_subscription_id,
    amount,
    currency_code,
    status,
    paid_at,
    period_start,
    period_end,
    method,
    reference,
    notes,
    idempotency_key,
    recorded_by
  )
  values (
    v_sub.school_id,
    p_school_subscription_id,
    p_amount,
    v_currency,
    v_status,
    coalesce(p_paid_at, now()),
    p_period_start,
    p_period_end,
    v_method,
    v_reference,
    v_notes,
    v_key,
    v_actor
  )
  returning id into v_id;

  perform public.write_audit_event(
    null,
    v_actor,
    'platform.payment.recorded',
    'subscription_payment',
    v_id,
    jsonb_build_object(
      'school_id', v_sub.school_id,
      'subscription_id', p_school_subscription_id,
      'amount', p_amount,
      'currency_code', v_currency,
      'method', v_method,
      'status', v_status
    ),
    'success',
    'operator',
    v_sub.school_id
  );

  payment_id := v_id;
  school_id := v_sub.school_id;
  status := v_status;
  already_recorded := false;
  return next;
end;
$$;

revoke all on function public.record_subscription_payment(
  uuid, numeric, text, text, text, text, timestamptz, date, date, text, boolean
) from public, anon;
grant execute on function public.record_subscription_payment(
  uuid, numeric, text, text, text, text, timestamptz, date, date, text, boolean
) to authenticated;

-- ---------------------------------------------------------------------------
-- void_subscription_payment
-- ---------------------------------------------------------------------------

create or replace function public.void_subscription_payment(
  p_payment_id uuid,
  p_void_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
  v_reason text := nullif(trim(p_void_reason), '');
  v_row public.subscription_payments%rowtype;
begin
  if v_actor is null or not public.is_platform_operator() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  if p_payment_id is null then
    raise exception 'payment_id is required'
      using errcode = '22023';
  end if;

  if v_reason is null then
    raise exception 'Void reason is required'
      using errcode = '22023';
  end if;

  select *
  into v_row
  from public.subscription_payments as p
  where p.id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment not found'
      using errcode = 'P0002';
  end if;

  if v_row.status = 'voided' then
    return p_payment_id;
  end if;

  update public.subscription_payments as p
  set
    status = 'voided',
    voided_by = v_actor,
    void_reason = v_reason,
    voided_at = now(),
    updated_at = now()
  where p.id = p_payment_id;

  perform public.write_audit_event(
    null,
    v_actor,
    'platform.payment.voided',
    'subscription_payment',
    p_payment_id,
    jsonb_build_object(
      'school_id', v_row.school_id,
      'amount', v_row.amount,
      'void_reason', v_reason
    ),
    'success',
    'operator',
    v_row.school_id
  );

  return p_payment_id;
end;
$$;

revoke all on function public.void_subscription_payment(uuid, text)
  from public, anon;
grant execute on function public.void_subscription_payment(uuid, text)
  to authenticated;
