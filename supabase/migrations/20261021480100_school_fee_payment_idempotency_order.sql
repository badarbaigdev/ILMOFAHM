-- Fix: resolve idempotency key before "already paid" guards so retries are safe.

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
