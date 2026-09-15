-- =============================================================================
-- CCTV FIX-IT — Phase 1: store-partner quotes (009)
-- docs/01-schema.md v2.0.0
-- =============================================================================
-- Replaces the repair-business schema (tickets, services, materials, change
-- orders, inbound intake) with jobs, job lines, payments, the equipment catalog,
-- the rate card, pricing rules and quote templates. Every table removed here was
-- empty when this ran. The ticket-photos bucket is left for Phase 2 to replace.

-- ---------------------------------------------------------------------------
-- 1. Remove the repair-business schema
-- ---------------------------------------------------------------------------

drop table if exists public.change_orders cascade;
drop table if exists public.ticket_materials cascade;
drop table if exists public.outbound_queue cascade;
drop table if exists public.inbound_events cascade;
drop table if exists public.tickets cascade;
drop table if exists public.services cascade;
drop table if exists public.materials cascade;
drop table if exists public.customers cascade;

drop function if exists public.dispense_ticket_materials(uuid);
drop function if exists public.enforce_ticket_tech_columns();
drop function if exists public.enforce_material_store_staff_columns();
drop function if exists public.enforce_ticket_materials_store_columns();
drop function if exists public.is_assigned_tech(uuid);
drop function if exists public.is_assigned_tech_of_customer(uuid);

drop type if exists public.ticket_status;
drop type if exists public.change_order_status;
drop type if exists public.payment_method;

-- ---------------------------------------------------------------------------
-- 2. Roles: ADMIN, STORE_STAFF, TECHNICIAN (COORDINATOR accounts become ADMIN)
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_select_self" on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_select_coordinator_technicians" on public.profiles;
drop policy if exists "audit_log_select_admin" on public.audit_log;
drop function if exists public.has_role(public.user_role);
drop function if exists public.is_admin();

update public.profiles set role = 'ADMIN' where role = 'COORDINATOR';

alter table public.profiles alter column role drop default;
alter type public.user_role rename to user_role_old;
create type public.user_role as enum ('ADMIN', 'STORE_STAFF', 'TECHNICIAN');
alter table public.profiles
  alter column role type public.user_role using role::text::public.user_role;
alter table public.profiles alter column role set default 'TECHNICIAN';
drop type public.user_role_old;

alter table public.profiles drop column if exists skills;

-- The sign-up trigger wrote skills; keep it in step with the table.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, phone_number, is_active)
  values (
    new.id,
    'TECHNICIAN',
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email),
    new.raw_user_meta_data ->> 'phone_number',
    true
  );
  return new;
end;
$$;

-- Role helpers count active profiles only. Security definer so they bypass RLS
-- and cannot recurse into the profiles policies.
create or replace function public.has_role(r public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = r and is_active
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'ADMIN' and is_active
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('ADMIN', 'STORE_STAFF') and is_active
  );
$$;

revoke execute on function public.has_role(public.user_role) from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_staff() from public, anon;
grant execute on function public.has_role(public.user_role) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;

-- updated_at trigger function, now with a fixed search_path.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Enums
-- ---------------------------------------------------------------------------

create type public.job_status as enum (
  'DRAFT', 'QUOTED', 'JOB_ORDER', 'SURVEY', 'SURVEY_REVIEW', 'SCHEDULED',
  'DISPATCHED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'PAID', 'CANCELLED'
);
create type public.payment_method as enum ('CASH', 'GCASH', 'MAYA');
create type public.payment_kind as enum ('DOWNPAYMENT', 'BALANCE');
create type public.line_type as enum ('EQUIPMENT', 'SERVICE');
create type public.override_status as enum ('PENDING', 'APPROVED', 'REJECTED');

-- ---------------------------------------------------------------------------
-- 4. Tables
-- ---------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone_number text,
  address text,
  fb_messenger_id text unique,
  viber_id text unique,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index customers_phone_number_idx on public.customers (phone_number);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category text not null,
  sell_price numeric(10,2) not null check (sell_price >= 0),
  channels int check (channels > 0),
  stock_qty int not null default 0,
  is_active boolean not null default true
);

create table public.rate_card_items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  unit_label text not null,
  unit_size numeric(10,2) not null default 1 check (unit_size > 0),
  rate numeric(10,2) not null check (rate >= 0),
  is_camera_point boolean not null default false,
  is_outdoor boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.pricing_rules (
  code text primary key check (code in ('RAINY_SEASON', 'AFTER_HOURS')),
  name text not null,
  multiplier numeric(6,4) not null check (multiplier >= 1),
  start_month int check (start_month between 1 and 12),
  end_month int check (end_month between 1 and 12),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.quote_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.quote_template_lines (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.quote_templates (id) on delete cascade,
  line_type public.line_type not null,
  equipment_id uuid references public.equipment (id),
  rate_card_item_id uuid references public.rate_card_items (id),
  quantity numeric(10,2) not null check (quantity > 0),
  sort_order int not null default 0,
  constraint quote_template_lines_item check (
    (line_type = 'EQUIPMENT' and equipment_id is not null and rate_card_item_id is null)
    or (line_type = 'SERVICE' and rate_card_item_id is not null and equipment_id is null)
  )
);

create index quote_template_lines_template_id_idx on public.quote_template_lines (template_id);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  job_number bigint generated always as identity (start with 1001) unique,
  customer_id uuid not null references public.customers (id),
  status public.job_status not null default 'DRAFT',
  site_address text,
  zone public.baguio_zone,
  notes text,
  survey_required boolean not null default false,
  after_hours boolean not null default false,
  rainy_season_applied boolean not null default false,
  service_multiplier numeric(6,4) not null default 1,
  equipment_total numeric(10,2) not null default 0,
  service_subtotal numeric(10,2) not null default 0,
  service_total numeric(10,2) not null default 0,
  grand_total numeric(10,2) not null default 0,
  downpayment_required numeric(10,2) not null default 0,
  priced_at timestamptz,
  quoted_at timestamptz,
  job_order_at timestamptz,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_cancel_reason check (status <> 'CANCELLED' or cancel_reason is not null)
);

create index jobs_customer_id_idx on public.jobs (customer_id);
create index jobs_status_idx on public.jobs (status);
create index jobs_scheduled_start_idx on public.jobs (scheduled_start);
create index jobs_completed_at_idx on public.jobs (completed_at);

create table public.job_lines (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  line_type public.line_type not null,
  equipment_id uuid references public.equipment (id),
  rate_card_item_id uuid references public.rate_card_items (id),
  description text not null,
  quantity numeric(10,2) not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  unit_size numeric(10,2) not null default 1 check (unit_size > 0),
  billed_units numeric(10,2) not null,
  override_price numeric(10,2) check (override_price >= 0),
  override_reason text,
  override_status public.override_status,
  override_requested_by uuid references public.profiles (id),
  override_decided_by uuid references public.profiles (id),
  override_decided_at timestamptz,
  line_total numeric(10,2) not null default 0,
  dispensed_qty int not null default 0 check (dispensed_qty >= 0),
  dispensed_at timestamptz,
  dispensed_by uuid references public.profiles (id),
  sort_order int not null default 0,
  constraint job_lines_item check (
    (line_type = 'EQUIPMENT' and equipment_id is not null and rate_card_item_id is null)
    or (line_type = 'SERVICE' and rate_card_item_id is not null and equipment_id is null)
  ),
  constraint job_lines_override check (
    (override_price is null and override_reason is null and override_status is null)
    or (
      line_type = 'SERVICE'
      and override_price is not null
      and override_reason is not null
      and override_status is not null
    )
  )
);

create index job_lines_job_id_idx on public.job_lines (job_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id),
  kind public.payment_kind not null,
  amount numeric(10,2) not null check (amount > 0),
  method public.payment_method not null,
  reference text,
  received_by uuid not null references public.profiles (id),
  received_at timestamptz not null default now()
);

create index payments_job_id_idx on public.payments (job_id);
create index payments_received_at_idx on public.payments (received_at);

create table public.outbound_queue (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('messenger', 'viber')),
  recipient_id text not null,
  body text not null,
  job_id uuid references public.jobs (id),
  attempts int not null default 0,
  last_error text,
  status text not null default 'PENDING' check (status in ('PENDING', 'SENT', 'FAILED')),
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index outbound_queue_pending_idx on public.outbound_queue (status, next_attempt_at);

-- ---------------------------------------------------------------------------
-- 5. Triggers
-- ---------------------------------------------------------------------------

create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

create trigger rate_card_items_set_updated_at
before update on public.rate_card_items
for each row execute function public.set_updated_at();

create trigger pricing_rules_set_updated_at
before update on public.pricing_rules
for each row execute function public.set_updated_at();

-- Store staff may request an override (PENDING) or remove one; only an admin
-- decides one, and a decided override cannot be edited without re-requesting.
create or replace function public.guard_job_line_override()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.override_status in ('APPROVED', 'REJECTED')
       or new.override_decided_by is not null
       or new.override_decided_at is not null then
      raise exception 'Only an admin can decide a rate override';
    end if;
    return new;
  end if;

  if new.override_status in ('APPROVED', 'REJECTED')
     and (new.override_status is distinct from old.override_status
          or new.override_price is distinct from old.override_price
          or new.override_reason is distinct from old.override_reason) then
    raise exception 'Only an admin can decide a rate override';
  end if;

  if (new.override_decided_by is not null
      and new.override_decided_by is distinct from old.override_decided_by)
     or (new.override_decided_at is not null
         and new.override_decided_at is distinct from old.override_decided_at) then
    raise exception 'Only an admin can decide a rate override';
  end if;

  return new;
end;
$$;

create trigger job_lines_guard_override
before insert or update on public.job_lines
for each row execute function public.guard_job_line_override();

-- ---------------------------------------------------------------------------
-- 6. Row level security
-- ---------------------------------------------------------------------------

alter table public.customers enable row level security;
alter table public.equipment enable row level security;
alter table public.rate_card_items enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.quote_templates enable row level security;
alter table public.quote_template_lines enable row level security;
alter table public.jobs enable row level security;
alter table public.job_lines enable row level security;
alter table public.payments enable row level security;
alter table public.outbound_queue enable row level security;

-- profiles: SELF reads own. ADMIN reads all and updates. STORE_STAFF reads technicians.
create policy "profiles_select_self" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_select_admin" on public.profiles
  for select using (public.is_admin());

create policy "profiles_select_store_technicians" on public.profiles
  for select using (public.has_role('STORE_STAFF') and role = 'TECHNICIAN');

create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- customers: ADMIN+STORE_STAFF SELECT, INSERT, UPDATE. ADMIN DELETE.
create policy "customers_select_staff" on public.customers
  for select using (public.is_staff());

create policy "customers_insert_staff" on public.customers
  for insert with check (public.is_staff());

create policy "customers_update_staff" on public.customers
  for update using (public.is_staff()) with check (public.is_staff());

create policy "customers_delete_admin" on public.customers
  for delete using (public.is_admin());

-- equipment: all authenticated SELECT. ADMIN+STORE_STAFF INSERT, UPDATE. ADMIN DELETE.
create policy "equipment_select_authenticated" on public.equipment
  for select using (auth.uid() is not null);

create policy "equipment_insert_staff" on public.equipment
  for insert with check (public.is_staff());

create policy "equipment_update_staff" on public.equipment
  for update using (public.is_staff()) with check (public.is_staff());

create policy "equipment_delete_admin" on public.equipment
  for delete using (public.is_admin());

-- rate card, pricing rules, templates: all authenticated SELECT. ADMIN writes.
create policy "rate_card_items_select_authenticated" on public.rate_card_items
  for select using (auth.uid() is not null);

create policy "rate_card_items_insert_admin" on public.rate_card_items
  for insert with check (public.is_admin());

create policy "rate_card_items_update_admin" on public.rate_card_items
  for update using (public.is_admin()) with check (public.is_admin());

create policy "rate_card_items_delete_admin" on public.rate_card_items
  for delete using (public.is_admin());

create policy "pricing_rules_select_authenticated" on public.pricing_rules
  for select using (auth.uid() is not null);

create policy "pricing_rules_insert_admin" on public.pricing_rules
  for insert with check (public.is_admin());

create policy "pricing_rules_update_admin" on public.pricing_rules
  for update using (public.is_admin()) with check (public.is_admin());

create policy "pricing_rules_delete_admin" on public.pricing_rules
  for delete using (public.is_admin());

create policy "quote_templates_select_authenticated" on public.quote_templates
  for select using (auth.uid() is not null);

create policy "quote_templates_insert_admin" on public.quote_templates
  for insert with check (public.is_admin());

create policy "quote_templates_update_admin" on public.quote_templates
  for update using (public.is_admin()) with check (public.is_admin());

create policy "quote_templates_delete_admin" on public.quote_templates
  for delete using (public.is_admin());

create policy "quote_template_lines_select_authenticated" on public.quote_template_lines
  for select using (auth.uid() is not null);

create policy "quote_template_lines_insert_admin" on public.quote_template_lines
  for insert with check (public.is_admin());

create policy "quote_template_lines_update_admin" on public.quote_template_lines
  for update using (public.is_admin()) with check (public.is_admin());

create policy "quote_template_lines_delete_admin" on public.quote_template_lines
  for delete using (public.is_admin());

-- jobs: ADMIN+STORE_STAFF SELECT, INSERT, UPDATE. No DELETE (cancel instead).
create policy "jobs_select_staff" on public.jobs
  for select using (public.is_staff());

create policy "jobs_insert_staff" on public.jobs
  for insert with check (public.is_staff());

create policy "jobs_update_staff" on public.jobs
  for update using (public.is_staff()) with check (public.is_staff());

-- job_lines: ADMIN+STORE_STAFF SELECT; writes only while the job is DRAFT.
create policy "job_lines_select_staff" on public.job_lines
  for select using (public.is_staff());

create policy "job_lines_insert_staff_draft" on public.job_lines
  for insert with check (
    public.is_staff()
    and exists (select 1 from public.jobs j where j.id = job_lines.job_id and j.status = 'DRAFT')
  );

create policy "job_lines_update_staff_draft" on public.job_lines
  for update
  using (
    public.is_staff()
    and exists (select 1 from public.jobs j where j.id = job_lines.job_id and j.status = 'DRAFT')
  )
  with check (
    public.is_staff()
    and exists (select 1 from public.jobs j where j.id = job_lines.job_id and j.status = 'DRAFT')
  );

create policy "job_lines_delete_staff_draft" on public.job_lines
  for delete using (
    public.is_staff()
    and exists (select 1 from public.jobs j where j.id = job_lines.job_id and j.status = 'DRAFT')
  );

-- payments: ADMIN+STORE_STAFF SELECT, INSERT. No UPDATE. No DELETE.
create policy "payments_select_staff" on public.payments
  for select using (public.is_staff());

create policy "payments_insert_staff" on public.payments
  for insert with check (public.is_staff());

-- audit_log: ADMIN SELECT only. No UPDATE. No DELETE. Ever.
create policy "audit_log_select_admin" on public.audit_log
  for select using (public.is_admin());

-- outbound_queue: ADMIN SELECT only. Writes happen server-side via service role.
create policy "outbound_queue_select_admin" on public.outbound_queue
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 7. Seed the rate card and pricing rules (docs/02-logic.md §Rate Card)
-- ---------------------------------------------------------------------------

insert into public.rate_card_items
  (code, name, unit_label, unit_size, rate, is_camera_point, is_outdoor, sort_order)
values
  ('INDOOR_CAMERA', 'Indoor Camera Install', 'point', 1, 600, true, false, 10),
  ('OUTDOOR_CAMERA', 'Outdoor Camera Install', 'point', 1, 1000, true, true, 20),
  ('HIGH_MOUNT', 'High-Mount Install', 'point', 1, 1500, true, true, 30),
  ('DVR_NVR_SETUP', 'DVR/NVR Setup', 'unit', 1, 1200, false, false, 40),
  ('REMOTE_VIEWING', 'Remote Viewing Setup', 'system', 1, 600, false, false, 50),
  ('CAT6_PULLING', 'Cat6 Cable Pulling', '10 m', 10, 500, false, false, 60),
  ('PVC_MOLDING', 'PVC Molding', '10 m', 10, 500, false, false, 70),
  ('CORE_DRILLING', 'Core Drilling (Standard)', 'hole', 1, 400, false, false, 80),
  ('TRANSPORT_BAGUIO', 'Transport (Baguio)', 'trip', 1, 300, false, false, 90);

insert into public.pricing_rules (code, name, multiplier, start_month, end_month)
values
  ('RAINY_SEASON', 'Rainy season (outdoor jobs)', 1.10, 6, 10),
  ('AFTER_HOURS', 'After-hours', 1.50, null, null);

-- Template names from the process flow; admins add their lines (Phase 1d).
insert into public.quote_templates (name, sort_order)
values ('Home 4-cam', 10), ('Office 8-cam', 20), ('WiFi', 30), ('UPS', 40);
