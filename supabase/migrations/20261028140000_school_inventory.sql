-- School inventory: catalogue items + stock in/out movements with quantity tracking.

-- ---------------------------------------------------------------------------
-- Auth helper
-- ---------------------------------------------------------------------------

create or replace function public.is_school_inventory_manager(p_school_id uuid)
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
      and m.role in ('owner', 'admin', 'staff')
  );
$$;

comment on function public.is_school_inventory_manager(uuid) is
  'True when the current user may manage school inventory stock.';

revoke all on function public.is_school_inventory_manager(uuid) from public;
grant execute on function public.is_school_inventory_manager(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- school_inventory_items
-- ---------------------------------------------------------------------------

create table if not exists public.school_inventory_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  name text not null,
  sku text,
  category text not null,
  quantity integer not null default 0,
  reorder_level integer not null default 0,
  condition text not null default 'good',
  unit text not null default 'pcs',
  location text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_inventory_items_name_not_blank
    check (length(trim(name)) > 0),
  constraint school_inventory_items_category_valid check (
    category in (
      'furniture',
      'stationery',
      'lab',
      'sports',
      'electronics',
      'books',
      'cleaning',
      'uniforms',
      'other'
    )
  ),
  constraint school_inventory_items_condition_valid check (
    condition in ('new', 'good', 'fair', 'poor', 'damaged')
  ),
  constraint school_inventory_items_quantity_nonneg check (quantity >= 0),
  constraint school_inventory_items_reorder_nonneg check (reorder_level >= 0),
  constraint school_inventory_items_unit_not_blank
    check (length(trim(unit)) > 0),
  constraint school_inventory_items_notes_length check (
    notes is null or length(notes) <= 500
  ),
  constraint school_inventory_items_status_valid check (
    status in ('active', 'archived')
  )
);

comment on table public.school_inventory_items is
  'School-owned inventory catalogue with on-hand quantity and condition.';

create unique index if not exists school_inventory_items_school_sku_unique
  on public.school_inventory_items (school_id, lower(sku))
  where sku is not null and length(trim(sku)) > 0;

create index if not exists school_inventory_items_school_id_idx
  on public.school_inventory_items (school_id);
create index if not exists school_inventory_items_school_category_idx
  on public.school_inventory_items (school_id, category);
create index if not exists school_inventory_items_school_status_idx
  on public.school_inventory_items (school_id, status);

drop trigger if exists school_inventory_items_set_updated_at
  on public.school_inventory_items;
create trigger school_inventory_items_set_updated_at
before update on public.school_inventory_items
for each row execute function public.set_updated_at();

drop trigger if exists school_inventory_items_reject_school_id_change
  on public.school_inventory_items;
create trigger school_inventory_items_reject_school_id_change
before update on public.school_inventory_items
for each row execute function public.reject_school_id_change();

alter table public.school_inventory_items enable row level security;
alter table public.school_inventory_items force row level security;
revoke all on table public.school_inventory_items from anon, authenticated;
grant select on table public.school_inventory_items to authenticated;

drop policy if exists school_inventory_items_select_member
  on public.school_inventory_items;
create policy school_inventory_items_select_member
on public.school_inventory_items
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- school_inventory_movements
-- ---------------------------------------------------------------------------

create table if not exists public.school_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  item_id uuid not null
    references public.school_inventory_items (id)
    on delete restrict,
  movement_type text not null,
  quantity integer not null,
  occurred_on date not null default (current_date),
  notes text,
  recorded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint school_inventory_movements_type_valid check (
    movement_type in ('stock_in', 'issue')
  ),
  constraint school_inventory_movements_quantity_positive check (quantity > 0),
  constraint school_inventory_movements_notes_length check (
    notes is null or length(notes) <= 500
  )
);

comment on table public.school_inventory_movements is
  'Stock-in and issue history for school inventory items.';

create index if not exists school_inventory_movements_school_id_idx
  on public.school_inventory_movements (school_id);
create index if not exists school_inventory_movements_item_id_idx
  on public.school_inventory_movements (item_id);
create index if not exists school_inventory_movements_occurred_idx
  on public.school_inventory_movements (school_id, occurred_on desc);

alter table public.school_inventory_movements enable row level security;
alter table public.school_inventory_movements force row level security;
revoke all on table public.school_inventory_movements from anon, authenticated;
grant select on table public.school_inventory_movements to authenticated;

drop policy if exists school_inventory_movements_select_member
  on public.school_inventory_movements;
create policy school_inventory_movements_select_member
on public.school_inventory_movements
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- create_school_inventory_item
-- ---------------------------------------------------------------------------

create or replace function public.create_school_inventory_item(
  p_school_id uuid,
  p_name text,
  p_category text,
  p_quantity integer,
  p_reorder_level integer,
  p_condition text,
  p_unit text default 'pcs',
  p_sku text default null,
  p_location text default null,
  p_notes text default null
)
returns table (
  item_id uuid,
  school_id uuid,
  name text,
  quantity integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_name text := nullif(trim(p_name), '');
  v_category text := lower(nullif(trim(p_category), ''));
  v_condition text := lower(nullif(trim(p_condition), ''));
  v_unit text := coalesce(nullif(trim(p_unit), ''), 'pcs');
  v_sku text := nullif(trim(p_sku), '');
  v_location text := nullif(trim(p_location), '');
  v_notes text := nullif(trim(p_notes), '');
  v_qty integer := coalesce(p_quantity, 0);
  v_reorder integer := coalesce(p_reorder_level, 0);
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_school_inventory_manager(p_school_id) then
    raise exception 'Not authorized to manage inventory'
      using errcode = '42501';
  end if;
  if not public.school_supports_school_workflows(p_school_id) then
    raise exception 'Inventory requires a school or mixed institution'
      using errcode = '22023';
  end if;
  if v_name is null then
    raise exception 'Item name is required' using errcode = '22023';
  end if;
  if v_category is null or v_category not in (
    'furniture', 'stationery', 'lab', 'sports', 'electronics',
    'books', 'cleaning', 'uniforms', 'other'
  ) then
    raise exception 'Invalid inventory category' using errcode = '22023';
  end if;
  if v_condition is null or v_condition not in (
    'new', 'good', 'fair', 'poor', 'damaged'
  ) then
    raise exception 'Invalid item condition' using errcode = '22023';
  end if;
  if v_qty < 0 or v_reorder < 0 then
    raise exception 'Quantity and reorder level must be zero or greater'
      using errcode = '22023';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = p_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.school_inventory_items (
    school_id, name, sku, category, quantity, reorder_level,
    condition, unit, location, notes
  )
  values (
    p_school_id, v_name, v_sku, v_category, v_qty, v_reorder,
    v_condition, v_unit, v_location, v_notes
  )
  returning id into v_id;

  if v_qty > 0 then
    insert into public.school_inventory_movements (
      school_id, item_id, movement_type, quantity, occurred_on,
      notes, recorded_by
    )
    values (
      p_school_id, v_id, 'stock_in', v_qty, current_date,
      'Opening stock', v_user_id
    );
  end if;

  perform public.write_audit_event(
    null, v_user_id, 'school.inventory.item_created',
    'school_inventory_item', v_id,
    jsonb_build_object(
      'name', v_name,
      'category', v_category,
      'quantity', v_qty
    ),
    'success', v_role, p_school_id
  );

  item_id := v_id;
  school_id := p_school_id;
  name := v_name;
  quantity := v_qty;
  return next;
end;
$$;

revoke all on function public.create_school_inventory_item(
  uuid, text, text, integer, integer, text, text, text, text, text
) from public, anon;
grant execute on function public.create_school_inventory_item(
  uuid, text, text, integer, integer, text, text, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- update_school_inventory_item (metadata; quantity via movements)
-- ---------------------------------------------------------------------------

create or replace function public.update_school_inventory_item(
  p_item_id uuid,
  p_name text,
  p_category text,
  p_reorder_level integer,
  p_condition text,
  p_unit text default 'pcs',
  p_sku text default null,
  p_location text default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_school_id uuid;
  v_name text := nullif(trim(p_name), '');
  v_category text := lower(nullif(trim(p_category), ''));
  v_condition text := lower(nullif(trim(p_condition), ''));
  v_unit text := coalesce(nullif(trim(p_unit), ''), 'pcs');
  v_sku text := nullif(trim(p_sku), '');
  v_location text := nullif(trim(p_location), '');
  v_notes text := nullif(trim(p_notes), '');
  v_reorder integer := coalesce(p_reorder_level, 0);
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select i.school_id into v_school_id
  from public.school_inventory_items as i
  where i.id = p_item_id
  for update;

  if not found then
    raise exception 'Inventory item not found' using errcode = 'P0002';
  end if;
  if not public.is_school_inventory_manager(v_school_id) then
    raise exception 'Not authorized to manage inventory'
      using errcode = '42501';
  end if;
  if v_name is null then
    raise exception 'Item name is required' using errcode = '22023';
  end if;
  if v_category is null or v_category not in (
    'furniture', 'stationery', 'lab', 'sports', 'electronics',
    'books', 'cleaning', 'uniforms', 'other'
  ) then
    raise exception 'Invalid inventory category' using errcode = '22023';
  end if;
  if v_condition is null or v_condition not in (
    'new', 'good', 'fair', 'poor', 'damaged'
  ) then
    raise exception 'Invalid item condition' using errcode = '22023';
  end if;
  if v_reorder < 0 then
    raise exception 'Reorder level must be zero or greater'
      using errcode = '22023';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.school_inventory_items
  set name = v_name,
      sku = v_sku,
      category = v_category,
      reorder_level = v_reorder,
      condition = v_condition,
      unit = v_unit,
      location = v_location,
      notes = v_notes,
      status = 'active'
  where id = p_item_id;

  perform public.write_audit_event(
    null, v_user_id, 'school.inventory.item_updated',
    'school_inventory_item', p_item_id,
    jsonb_build_object('name', v_name, 'category', v_category),
    'success', v_role, v_school_id
  );
end;
$$;

revoke all on function public.update_school_inventory_item(
  uuid, text, text, integer, text, text, text, text, text
) from public, anon;
grant execute on function public.update_school_inventory_item(
  uuid, text, text, integer, text, text, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- archive_school_inventory_item
-- ---------------------------------------------------------------------------

create or replace function public.archive_school_inventory_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_school_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select i.school_id into v_school_id
  from public.school_inventory_items as i
  where i.id = p_item_id
  for update;

  if not found then
    raise exception 'Inventory item not found' using errcode = 'P0002';
  end if;
  if not public.is_school_inventory_manager(v_school_id) then
    raise exception 'Not authorized to manage inventory'
      using errcode = '42501';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.school_inventory_items
  set status = 'archived'
  where id = p_item_id;

  perform public.write_audit_event(
    null, v_user_id, 'school.inventory.item_archived',
    'school_inventory_item', p_item_id,
    jsonb_build_object('status', 'archived'),
    'success', v_role, v_school_id
  );
end;
$$;

revoke all on function public.archive_school_inventory_item(uuid)
  from public, anon;
grant execute on function public.archive_school_inventory_item(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- record_school_inventory_movement
-- ---------------------------------------------------------------------------

create or replace function public.record_school_inventory_movement(
  p_item_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_occurred_on date default current_date,
  p_notes text default null
)
returns table (
  movement_id uuid,
  item_id uuid,
  quantity_after integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_school_id uuid;
  v_status text;
  v_qty integer;
  v_type text := lower(nullif(trim(p_movement_type), ''));
  v_move_qty integer := p_quantity;
  v_notes text := nullif(trim(p_notes), '');
  v_new_qty integer;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select i.school_id, i.status, i.quantity
  into v_school_id, v_status, v_qty
  from public.school_inventory_items as i
  where i.id = p_item_id
  for update;

  if not found then
    raise exception 'Inventory item not found' using errcode = 'P0002';
  end if;
  if not public.is_school_inventory_manager(v_school_id) then
    raise exception 'Not authorized to manage inventory'
      using errcode = '42501';
  end if;
  if v_status <> 'active' then
    raise exception 'Cannot move stock for an archived item'
      using errcode = '22023';
  end if;
  if v_type is null or v_type not in ('stock_in', 'issue') then
    raise exception 'Movement type must be stock_in or issue'
      using errcode = '22023';
  end if;
  if v_move_qty is null or v_move_qty <= 0 then
    raise exception 'Quantity must be greater than zero'
      using errcode = '22023';
  end if;

  if v_type = 'stock_in' then
    v_new_qty := v_qty + v_move_qty;
  else
    if v_move_qty > v_qty then
      raise exception 'Cannot issue more than available stock (%)', v_qty
        using errcode = '22023';
    end if;
    v_new_qty := v_qty - v_move_qty;
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.school_inventory_movements (
    school_id, item_id, movement_type, quantity, occurred_on, notes, recorded_by
  )
  values (
    v_school_id, p_item_id, v_type, v_move_qty,
    coalesce(p_occurred_on, current_date), v_notes, v_user_id
  )
  returning id into v_id;

  update public.school_inventory_items
  set quantity = v_new_qty
  where id = p_item_id;

  perform public.write_audit_event(
    null, v_user_id, 'school.inventory.movement_recorded',
    'school_inventory_movement', v_id,
    jsonb_build_object(
      'item_id', p_item_id,
      'movement_type', v_type,
      'quantity', v_move_qty,
      'quantity_after', v_new_qty
    ),
    'success', v_role, v_school_id
  );

  movement_id := v_id;
  item_id := p_item_id;
  quantity_after := v_new_qty;
  return next;
end;
$$;

revoke all on function public.record_school_inventory_movement(
  uuid, text, integer, date, text
) from public, anon;
grant execute on function public.record_school_inventory_movement(
  uuid, text, integer, date, text
) to authenticated;
