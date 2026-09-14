-- =============================================================================
-- CCTV FIX-IT — Initial Schema
-- Schema Version: 1.0.0 (docs/01-schema.md)
-- Creates all ENUMs, tables, indexes, triggers, and RLS policies.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUMs
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('ADMIN', 'COORDINATOR', 'TECHNICIAN', 'STORE_STAFF');

create type public.ticket_status as enum (
  'NEW', 'QUOTED', 'SCHEDULED', 'DISPATCHED', 'IN_PROGRESS',
  'COMPLETED', 'PAID', 'CLOSED', 'CANCELLED'
);

create type public.baguio_zone as enum (
  'ZONE_1_CENTER', 'ZONE_2_EAST', 'ZONE_3_WEST',
  'ZONE_4_SOUTH', 'ZONE_5_NORTH', 'ZONE_6_PERIPHERAL'
);

create type public.payment_method as enum ('GCASH', 'CASH', 'BANK_TRANSFER', 'MAYA');

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------

-- profiles ----------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'TECHNICIAN',
  full_name text not null,
  skills text[] not null default '{}'::text[],
  phone_number text,
  is_active boolean not null default true
);

-- customers ----------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  fb_messenger_id text unique,
  viber_id text unique,
  phone_number text,
  default_address text,
  zone public.baguio_zone,
  created_at timestamptz not null default now()
);

-- services -----------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  base_labour_price numeric(10,2) not null,
  est_duration_min int not null default 60
);

-- tickets ------------------------------------------------------------------
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id),
  assigned_tech_id uuid references public.profiles (id),
  status public.ticket_status not null default 'NEW',
  service_category text not null,
  issue_description text not null,
  photo_urls text[] not null default '{}'::text[],
  zone public.baguio_zone not null,
  quoted_labour numeric(10,2) not null default 0,
  quoted_materials numeric(10,2) not null default 0,
  final_total numeric(10,2) not null default 0,
  downpayment_amount numeric(10,2),
  downpayment_paid_at timestamptz,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  completed_at timestamptz,
  warranty_expires_at timestamptz,
  payment_method public.payment_method,
  is_paid boolean not null default false,
  cancellation_fee numeric(10,2) not null default 0,
  change_order_pending boolean not null default false,
  parent_ticket_id uuid references public.tickets (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- materials ----------------------------------------------------------------
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category text,
  cost_price numeric(10,2) not null,
  sell_price numeric(10,2) not null,
  stock_qty int not null default 0
);

-- ticket_materials ---------------------------------------------------------
create table public.ticket_materials (
  ticket_id uuid not null references public.tickets (id),
  material_id uuid not null references public.materials (id),
  quantity_used int not null default 1,
  primary key (ticket_id, material_id)
);

-- audit_log ----------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null,
  changed_by uuid references public.profiles (id),
  changed_at timestamptz not null default now(),
  old_values jsonb,
  new_values jsonb
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

-- customers: fb_messenger_id and viber_id are already indexed by their UNIQUE
-- constraints; phone_number is the primary match key and gets a plain index.
create index customers_phone_number_idx on public.customers (phone_number);

-- tickets
create index tickets_customer_id_idx on public.tickets (customer_id);
create index tickets_assigned_tech_id_idx on public.tickets (assigned_tech_id);
create index tickets_status_idx on public.tickets (status);
create index tickets_scheduled_start_idx on public.tickets (scheduled_start);
create index tickets_zone_idx on public.tickets (zone);

-- audit_log
create index audit_log_record_id_idx on public.audit_log (record_id);
create index audit_log_changed_at_idx on public.audit_log (changed_at);

-- ---------------------------------------------------------------------------
-- TRIGGER: tickets.updated_at auto-update
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tickets_set_updated_at
before update on public.tickets
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- HELPER FUNCTIONS (security definer so they bypass RLS and avoid recursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'ADMIN'
  );
$$;

create or replace function public.has_role(r public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = r
  );
$$;

create or replace function public.is_assigned_tech(t uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from tickets where id = t and assigned_tech_id = auth.uid()
  );
$$;

create or replace function public.is_assigned_tech_of_customer(c uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from tickets where customer_id = c and assigned_tech_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- TRIGGER: enforce "TECHNICIAN UPDATE only: status, photo_urls, completed_at"
-- Postgres RLS cannot restrict which columns change, so a BEFORE UPDATE
-- trigger enforces the column whitelist for technicians.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_ticket_tech_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.has_role('TECHNICIAN') then
    if (new.customer_id is distinct from old.customer_id)
       or (new.assigned_tech_id is distinct from old.assigned_tech_id)
       or (new.service_category is distinct from old.service_category)
       or (new.issue_description is distinct from old.issue_description)
       or (new.zone is distinct from old.zone)
       or (new.quoted_labour is distinct from old.quoted_labour)
       or (new.quoted_materials is distinct from old.quoted_materials)
       or (new.final_total is distinct from old.final_total)
       or (new.downpayment_amount is distinct from old.downpayment_amount)
       or (new.downpayment_paid_at is distinct from old.downpayment_paid_at)
       or (new.scheduled_start is distinct from old.scheduled_start)
       or (new.scheduled_end is distinct from old.scheduled_end)
       or (new.warranty_expires_at is distinct from old.warranty_expires_at)
       or (new.payment_method is distinct from old.payment_method)
       or (new.is_paid is distinct from old.is_paid)
       or (new.cancellation_fee is distinct from old.cancellation_fee)
       or (new.change_order_pending is distinct from old.change_order_pending)
       or (new.parent_ticket_id is distinct from old.parent_ticket_id)
    then
      raise exception 'Technicians may only update status, photo_urls, and completed_at on tickets';
    end if;
  end if;
  return new;
end;
$$;

create trigger tickets_enforce_tech_columns
before update on public.tickets
for each row
execute function public.enforce_ticket_tech_columns();

-- ---------------------------------------------------------------------------
-- TRIGGER: enforce "ADMIN+STORE_STAFF UPDATE stock_qty" on materials.
-- Store staff may change stock_qty only; admins (and service_role) are
-- unrestricted.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_material_store_staff_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.has_role('STORE_STAFF') then
    if (new.sku is distinct from old.sku)
       or (new.name is distinct from old.name)
       or (new.category is distinct from old.category)
       or (new.cost_price is distinct from old.cost_price)
       or (new.sell_price is distinct from old.sell_price)
    then
      raise exception 'Store staff may only update stock_qty on materials';
    end if;
  end if;
  return new;
end;
$$;

create trigger materials_enforce_store_staff_columns
before update on public.materials
for each row
execute function public.enforce_material_store_staff_columns();

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.services enable row level security;
alter table public.tickets enable row level security;
alter table public.materials enable row level security;
alter table public.ticket_materials enable row level security;
alter table public.audit_log enable row level security;

-- profiles: SELF reads own. ADMIN reads all.
-- (No write policies specified in 01-schema.md; profile creation/updates are
--  expected to happen server-side via service_role / a future auth trigger.)
create policy "profiles_select_self" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_select_admin" on public.profiles
  for select using (public.is_admin());

-- customers: ADMIN+COORDINATOR full CRUD. TECHNICIAN reads only assigned ticket customers.
create policy "customers_select_admin_coordinator" on public.customers
  for select using (public.is_admin() or public.has_role('COORDINATOR'));

create policy "customers_select_technician_assigned" on public.customers
  for select using (public.has_role('TECHNICIAN') and public.is_assigned_tech_of_customer(id));

create policy "customers_insert_admin_coordinator" on public.customers
  for insert with check (public.is_admin() or public.has_role('COORDINATOR'));

create policy "customers_update_admin_coordinator" on public.customers
  for update using (public.is_admin() or public.has_role('COORDINATOR'))
  with check (public.is_admin() or public.has_role('COORDINATOR'));

create policy "customers_delete_admin_coordinator" on public.customers
  for delete using (public.is_admin() or public.has_role('COORDINATOR'));

-- services: ADMIN full CRUD. Others SELECT only.
create policy "services_select_authenticated" on public.services
  for select using (auth.uid() is not null);

create policy "services_insert_admin" on public.services
  for insert with check (public.is_admin());

create policy "services_update_admin" on public.services
  for update using (public.is_admin()) with check (public.is_admin());

create policy "services_delete_admin" on public.services
  for delete using (public.is_admin());

-- tickets: ADMIN+COORDINATOR full CRUD.
--          TECHNICIAN SELECT/UPDATE on own assigned tickets (column whitelist via trigger).
--          STORE_STAFF SELECT where status IN (SCHEDULED, DISPATCHED).
create policy "tickets_select_admin_coordinator" on public.tickets
  for select using (public.is_admin() or public.has_role('COORDINATOR'));

create policy "tickets_select_technician_assigned" on public.tickets
  for select using (public.has_role('TECHNICIAN') and assigned_tech_id = auth.uid());

create policy "tickets_select_store_staff_scheduled" on public.tickets
  for select using (public.has_role('STORE_STAFF') and status in ('SCHEDULED', 'DISPATCHED'));

create policy "tickets_insert_admin_coordinator" on public.tickets
  for insert with check (public.is_admin() or public.has_role('COORDINATOR'));

create policy "tickets_update_admin_coordinator" on public.tickets
  for update using (public.is_admin() or public.has_role('COORDINATOR'))
  with check (public.is_admin() or public.has_role('COORDINATOR'));

create policy "tickets_update_technician_assigned" on public.tickets
  for update using (public.has_role('TECHNICIAN') and assigned_tech_id = auth.uid())
  with check (public.has_role('TECHNICIAN') and assigned_tech_id = auth.uid());

create policy "tickets_delete_admin_coordinator" on public.tickets
  for delete using (public.is_admin() or public.has_role('COORDINATOR'));

-- materials: All authenticated SELECT. ADMIN+STORE_STAFF UPDATE stock_qty.
create policy "materials_select_authenticated" on public.materials
  for select using (auth.uid() is not null);

create policy "materials_update_admin_store_staff" on public.materials
  for update using (public.is_admin() or public.has_role('STORE_STAFF'))
  with check (public.is_admin() or public.has_role('STORE_STAFF'));

-- ticket_materials: ADMIN+COORDINATOR+TECHNICIAN(assigned) INSERT. ADMIN DELETE.
create policy "ticket_materials_insert_admin_coordinator_tech" on public.ticket_materials
  for insert with check (
    public.is_admin()
    or public.has_role('COORDINATOR')
    or (public.has_role('TECHNICIAN') and public.is_assigned_tech(ticket_id))
  );

create policy "ticket_materials_delete_admin" on public.ticket_materials
  for delete using (public.is_admin());

-- audit_log: ADMIN SELECT only. No UPDATE. No DELETE. Ever.
create policy "audit_log_select_admin" on public.audit_log
  for select using (public.is_admin());
