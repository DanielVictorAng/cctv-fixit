-- =============================================================================
-- CCTV FIX-IT — Change orders + missing read policies (004)
-- =============================================================================

-- 1. ticket_materials: add the missing SELECT policy (docs/01-schema.md)
create policy "ticket_materials_select_staff" on public.ticket_materials
  for select using (
    public.is_admin()
    or public.has_role('COORDINATOR')
    or (public.has_role('TECHNICIAN') and public.is_assigned_tech(ticket_id))
    or (
      public.has_role('STORE_STAFF')
      and exists (
        select 1 from public.tickets t
        where t.id = ticket_materials.ticket_id
          and t.status in ('SCHEDULED', 'DISPATCHED')
      )
    )
  );

-- 2. Change order status enum
create type public.change_order_status as enum ('PENDING', 'APPROVED', 'REJECTED');

-- 3. change_orders table
create table public.change_orders (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id),
  requested_by uuid not null references public.profiles (id),
  new_description text not null,
  additional_labour numeric(10,2) not null default 0,
  additional_materials jsonb not null default '[]'::jsonb,
  status public.change_order_status not null default 'PENDING',
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index change_orders_ticket_id_idx on public.change_orders (ticket_id);
create index change_orders_status_idx on public.change_orders (status);

alter table public.change_orders enable row level security;

create policy "change_orders_select_staff" on public.change_orders
  for select using (
    public.is_admin()
    or public.has_role('COORDINATOR')
    or (public.has_role('TECHNICIAN') and public.is_assigned_tech(ticket_id))
  );

create policy "change_orders_insert_tech" on public.change_orders
  for insert with check (
    public.is_admin()
    or public.has_role('COORDINATOR')
    or (
      public.has_role('TECHNICIAN')
      and public.is_assigned_tech(ticket_id)
      and requested_by = auth.uid()
    )
  );

create policy "change_orders_update_coordinator" on public.change_orders
  for update using (public.is_admin() or public.has_role('COORDINATOR'))
  with check (public.is_admin() or public.has_role('COORDINATOR'));

-- 4. Technicians may also set change_order_pending on tickets.
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
       or (new.parent_ticket_id is distinct from old.parent_ticket_id)
    then
      raise exception 'Technicians may only update status, photo_urls, completed_at, and change_order_pending on tickets';
    end if;
  end if;
  return new;
end;
$$;

-- 5. Coordinators may read technician profiles (assignment picker).
create policy "profiles_select_coordinator_technicians" on public.profiles
  for select using (public.has_role('COORDINATOR') and role = 'TECHNICIAN');
