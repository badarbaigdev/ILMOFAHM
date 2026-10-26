-- Phase 11 continued: school student fee heads, charges, and manual payments
-- Separate from platform SaaS subscriptions. No payment gateways / refunds yet.

-- ---------------------------------------------------------------------------
-- Fee manager helper (owner / admin / accountant)
-- ---------------------------------------------------------------------------

create or replace function public.is_school_fee_manager(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.school_memberships as m
    where m.school_id = p_school_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'accountant')
  );
$$;

comment on function public.is_school_fee_manager(uuid) is
  'True when the current auth user may manage school student fee records.';

revoke all on function public.is_school_fee_manager(uuid) from public;
grant execute on function public.is_school_fee_manager(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- school_fee_heads
-- ---------------------------------------------------------------------------

create table public.school_fee_heads (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  code text not null,
  name text not null,
  default_amount numeric(12, 2) not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_fee_heads_code_not_blank
    check (length(trim(code)) > 0),
  constraint school_fee_heads_name_not_blank
    check (length(trim(name)) > 0),
  constraint school_fee_heads_default_amount_non_negative
    check (default_amount >= 0),
  constraint school_fee_heads_status_valid check (
    status in ('active', 'archived')
  ),
  constraint school_fee_heads_school_code_unique unique (school_id, code)
);

comment on table public.school_fee_heads is
  'Named fee types (tuition, transport, …) with a default amount per school.';

create index school_fee_heads_school_id_idx on public.school_fee_heads (school_id);

create trigger school_fee_heads_set_updated_at
before update on public.school_fee_heads
for each row execute function public.set_updated_at();

create trigger school_fee_heads_reject_school_id_change
before update on public.school_fee_heads
for each row execute function public.reject_school_id_change();

alter table public.school_fee_heads enable row level security;
alter table public.school_fee_heads force row level security;
revoke all on table public.school_fee_heads from anon, authenticated;
grant select on table public.school_fee_heads to authenticated;

create policy school_fee_heads_select_member
on public.school_fee_heads
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- school_fee_charges
-- ---------------------------------------------------------------------------

create table public.school_fee_charges (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  student_id uuid not null
    references public.school_students (id)
    on delete restrict,
  fee_head_id uuid not null
    references public.school_fee_heads (id)
    on delete restrict,
  amount numeric(12, 2) not null,
  amount_paid numeric(12, 2) not null default 0,
  due_date date not null,
  status text not null default 'due',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_fee_charges_amount_positive check (amount > 0),
  constraint school_fee_charges_amount_paid_non_negative check (amount_paid >= 0),
  constraint school_fee_charges_amount_paid_lte_amount check (amount_paid <= amount),
  constraint school_fee_charges_status_valid check (
    status in ('due', 'partial', 'paid', 'cancelled')
  )
);

comment on table public.school_fee_charges is
  'Student fee obligations (challans). amount_paid maintained by payment RPC.';

create index school_fee_charges_school_id_idx on public.school_fee_charges (school_id);
create index school_fee_charges_student_id_idx on public.school_fee_charges (student_id);
create index school_fee_charges_status_idx
  on public.school_fee_charges (school_id, status);

create trigger school_fee_charges_set_updated_at
before update on public.school_fee_charges
for each row execute function public.set_updated_at();

create trigger school_fee_charges_reject_school_id_change
before update on public.school_fee_charges
for each row execute function public.reject_school_id_change();

alter table public.school_fee_charges enable row level security;
alter table public.school_fee_charges force row level security;
revoke all on table public.school_fee_charges from anon, authenticated;
grant select on table public.school_fee_charges to authenticated;

create policy school_fee_charges_select_member
on public.school_fee_charges
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- school_fee_payments
-- ---------------------------------------------------------------------------

create table public.school_fee_payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  charge_id uuid not null
    references public.school_fee_charges (id)
    on delete restrict,
  amount numeric(12, 2) not null,
  method text not null,
  paid_on date not null default (current_date),
  receipt_number text not null,
  idempotency_key text,
  notes text,
  created_at timestamptz not null default now(),
  constraint school_fee_payments_amount_positive check (amount > 0),
  constraint school_fee_payments_method_valid check (
    method in ('cash', 'bank_transfer', 'cheque', 'other')
  ),
  constraint school_fee_payments_receipt_not_blank
    check (length(trim(receipt_number)) > 0)
);

comment on table public.school_fee_payments is
  'Append-only manual fee collections. Completed payments are never edited.';

create index school_fee_payments_school_id_idx on public.school_fee_payments (school_id);
create index school_fee_payments_charge_id_idx on public.school_fee_payments (charge_id);

create unique index school_fee_payments_school_receipt_unique
  on public.school_fee_payments (school_id, receipt_number);

create unique index school_fee_payments_school_idempotency_unique
  on public.school_fee_payments (school_id, idempotency_key)
  where idempotency_key is not null;

create trigger school_fee_payments_reject_school_id_change
before update on public.school_fee_payments
for each row execute function public.reject_school_id_change();

-- Block updates/deletes from authenticated path; only security definer may insert.
alter table public.school_fee_payments enable row level security;
alter table public.school_fee_payments force row level security;
revoke all on table public.school_fee_payments from anon, authenticated;
grant select on table public.school_fee_payments to authenticated;

create policy school_fee_payments_select_member
on public.school_fee_payments
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- create_school_fee_head
-- ---------------------------------------------------------------------------

create or replace function public.create_school_fee_head(
  p_school_id uuid,
  p_code text,
  p_name text,
  p_default_amount numeric
)
returns table (
  fee_head_id uuid,
  school_id uuid,
  code text,
  name text,
  default_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_code text := upper(nullif(trim(p_code), ''));
  v_name text := nullif(trim(p_name), '');
  v_amount numeric(12, 2) := p_default_amount;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_school_id is null then
    raise exception 'school_id is required' using errcode = '22023';
  end if;
  if not public.is_school_fee_manager(p_school_id) then
    raise exception 'Not authorized to manage fees' using errcode = '42501';
  end if;
  if not public.school_supports_school_workflows(p_school_id) then
    raise exception 'Fees require a school or mixed institution'
      using errcode = '22023';
  end if;
  if v_code is null or v_name is null then
    raise exception 'Code and name are required' using errcode = '22023';
  end if;
  if v_amount is null or v_amount < 0 then
    raise exception 'Default amount must be zero or greater' using errcode = '22023';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = p_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.school_fee_heads (
    school_id, code, name, default_amount
  )
  values (p_school_id, v_code, v_name, v_amount)
  returning id into v_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.fee_head.created',
    'school_fee_head',
    v_id,
    jsonb_build_object(
      'code', v_code,
      'name', v_name,
      'default_amount', v_amount
    ),
    'success',
    v_role,
    p_school_id
  );

  fee_head_id := v_id;
  school_id := p_school_id;
  code := v_code;
  name := v_name;
  default_amount := v_amount;
  return next;
end;
$$;

revoke all on function public.create_school_fee_head(
  uuid, text, text, numeric
) from public, anon;
grant execute on function public.create_school_fee_head(
  uuid, text, text, numeric
) to authenticated;

-- ---------------------------------------------------------------------------
-- create_school_fee_charge
-- ---------------------------------------------------------------------------

create or replace function public.create_school_fee_charge(
  p_school_id uuid,
  p_student_id uuid,
  p_fee_head_id uuid,
  p_amount numeric,
  p_due_date date
)
returns table (
  charge_id uuid,
  school_id uuid,
  student_id uuid,
  amount numeric,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_amount numeric(12, 2) := p_amount;
  v_student_school uuid;
  v_head_school uuid;
  v_head_status text;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_school_id is null or p_student_id is null or p_fee_head_id is null then
    raise exception 'school_id, student_id, and fee_head_id are required'
      using errcode = '22023';
  end if;
  if p_due_date is null then
    raise exception 'due_date is required' using errcode = '22023';
  end if;
  if not public.is_school_fee_manager(p_school_id) then
    raise exception 'Not authorized to manage fees' using errcode = '42501';
  end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'Charge amount must be greater than zero' using errcode = '22023';
  end if;

  select s.school_id into v_student_school
  from public.school_students as s
  where s.id = p_student_id;

  select h.school_id, h.status into v_head_school, v_head_status
  from public.school_fee_heads as h
  where h.id = p_fee_head_id;

  if v_student_school is null then
    raise exception 'Student not found' using errcode = 'P0002';
  end if;
  if v_head_school is null then
    raise exception 'Fee head not found' using errcode = 'P0002';
  end if;
  if v_student_school is distinct from p_school_id
     or v_head_school is distinct from p_school_id then
    raise exception 'Student and fee head must belong to the school'
      using errcode = '22023';
  end if;
  if v_head_status <> 'active' then
    raise exception 'Fee head is not active' using errcode = '22023';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = p_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.school_fee_charges (
    school_id, student_id, fee_head_id, amount, due_date, status
  )
  values (
    p_school_id, p_student_id, p_fee_head_id, v_amount, p_due_date, 'due'
  )
  returning id into v_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.fee_charge.created',
    'school_fee_charge',
    v_id,
    jsonb_build_object(
      'student_id', p_student_id,
      'fee_head_id', p_fee_head_id,
      'amount', v_amount,
      'due_date', p_due_date
    ),
    'success',
    v_role,
    p_school_id
  );

  charge_id := v_id;
  school_id := p_school_id;
  student_id := p_student_id;
  amount := v_amount;
  status := 'due';
  return next;
end;
$$;

revoke all on function public.create_school_fee_charge(
  uuid, uuid, uuid, numeric, date
) from public, anon;
grant execute on function public.create_school_fee_charge(
  uuid, uuid, uuid, numeric, date
) to authenticated;

-- ---------------------------------------------------------------------------
-- record_school_fee_payment
-- ---------------------------------------------------------------------------

create or replace function public.record_school_fee_payment(
  p_charge_id uuid,
  p_amount numeric,
  p_method text,
  p_receipt_number text,
  p_paid_on date default current_date,
  p_idempotency_key text default null,
  p_notes text default null
)
returns table (
  payment_id uuid,
  school_id uuid,
  charge_id uuid,
  amount numeric,
  charge_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_amount numeric(12, 2) := p_amount;
  v_method text := nullif(trim(p_method), '');
  v_receipt text := nullif(trim(p_receipt_number), '');
  v_key text := nullif(trim(p_idempotency_key), '');
  v_notes text := nullif(trim(p_notes), '');
  v_paid_on date := coalesce(p_paid_on, current_date);
  v_school_id uuid;
  v_charge_amount numeric(12, 2);
  v_amount_paid numeric(12, 2);
  v_charge_status text;
  v_new_paid numeric(12, 2);
  v_new_status text;
  v_existing uuid;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_charge_id is null then
    raise exception 'charge_id is required' using errcode = '22023';
  end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'Payment amount must be greater than zero' using errcode = '22023';
  end if;
  if v_method is null
     or v_method not in ('cash', 'bank_transfer', 'cheque', 'other') then
    raise exception 'Valid payment method is required' using errcode = '22023';
  end if;
  if v_receipt is null then
    raise exception 'Receipt number is required' using errcode = '22023';
  end if;

  select
    c.school_id, c.amount, c.amount_paid, c.status
  into
    v_school_id, v_charge_amount, v_amount_paid, v_charge_status
  from public.school_fee_charges as c
  where c.id = p_charge_id
  for update;

  if v_school_id is null then
    raise exception 'Charge not found' using errcode = 'P0002';
  end if;
  if not public.is_school_fee_manager(v_school_id) then
    raise exception 'Not authorized to manage fees' using errcode = '42501';
  end if;

  -- Idempotent replay before status guards so retries after success are safe.
  if v_key is not null then
    select p.id into v_existing
    from public.school_fee_payments as p
    where p.school_id = v_school_id
      and p.idempotency_key = v_key;

    if v_existing is not null then
      select
        p.id, p.school_id, p.charge_id, p.amount, c.status
      into
        payment_id, school_id, charge_id, amount, charge_status
      from public.school_fee_payments as p
      join public.school_fee_charges as c on c.id = p.charge_id
      where p.id = v_existing;
      return next;
      return;
    end if;
  end if;

  if v_charge_status = 'cancelled' then
    raise exception 'Cannot pay a cancelled charge' using errcode = '22023';
  end if;
  if v_charge_status = 'paid' then
    raise exception 'Charge is already paid in full' using errcode = '22023';
  end if;

  v_new_paid := v_amount_paid + v_amount;
  if v_new_paid > v_charge_amount then
    raise exception 'Payment would exceed charge amount' using errcode = '22023';
  end if;

  if v_new_paid = v_charge_amount then
    v_new_status := 'paid';
  elsif v_new_paid > 0 then
    v_new_status := 'partial';
  else
    v_new_status := 'due';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.school_fee_payments (
    school_id, charge_id, amount, method, paid_on,
    receipt_number, idempotency_key, notes
  )
  values (
    v_school_id, p_charge_id, v_amount, v_method, v_paid_on,
    v_receipt, v_key, v_notes
  )
  returning id into v_id;

  update public.school_fee_charges as c
  set amount_paid = v_new_paid,
      status = v_new_status
  where c.id = p_charge_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.fee_payment.recorded',
    'school_fee_payment',
    v_id,
    jsonb_build_object(
      'charge_id', p_charge_id,
      'amount', v_amount,
      'method', v_method,
      'receipt_number', v_receipt,
      'charge_status', v_new_status
    ),
    'success',
    v_role,
    v_school_id
  );

  payment_id := v_id;
  school_id := v_school_id;
  charge_id := p_charge_id;
  amount := v_amount;
  charge_status := v_new_status;
  return next;
end;
$$;

revoke all on function public.record_school_fee_payment(
  uuid, numeric, text, text, date, text, text
) from public, anon;
grant execute on function public.record_school_fee_payment(
  uuid, numeric, text, text, date, text, text
) to authenticated;
