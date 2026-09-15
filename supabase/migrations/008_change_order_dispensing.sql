-- =============================================================================
-- CCTV FIX-IT — Dispense change-order materials (008)
-- =============================================================================
-- Approved change orders add materials to a job that is already IN_PROGRESS.
-- The store dispenses them like any pick-list (owner decision), so store staff
-- must see in-progress jobs, and a line can be topped up after it was first
-- dispensed. Dispensing moves into one function so it is a single transaction.

-- 1. Units of a line the store has handed over.
alter table public.ticket_materials
  add column dispensed_qty int not null default 0 check (dispensed_qty >= 0);

update public.ticket_materials
set dispensed_qty = quantity_used
where dispensed_at is not null;

-- 2. Store staff also see in-progress jobs and their materials.
drop policy "tickets_select_store_staff_scheduled" on public.tickets;
create policy "tickets_select_store_staff_scheduled" on public.tickets
  for select using (
    public.has_role('STORE_STAFF') and status in ('SCHEDULED', 'DISPATCHED', 'IN_PROGRESS')
  );

drop policy "ticket_materials_select_staff" on public.ticket_materials;
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
          and t.status in ('SCHEDULED', 'DISPATCHED', 'IN_PROGRESS')
      )
    )
  );

-- Store staff may set dispensed_qty: enforce_ticket_materials_store_columns (005)
-- only blocks ticket_id, material_id and quantity_used, so it needs no change.

-- 3. Dispense a ticket's pick-list in one transaction. SECURITY INVOKER, so it
--    runs under the caller's RLS; any raise rolls back every stock change.
create or replace function public.dispense_ticket_materials(p_ticket_id uuid)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  line record;
  dispensed int := 0;
begin
  if not (public.is_admin() or public.has_role('STORE_STAFF')) then
    raise exception 'Only store staff can dispense materials' using errcode = '42501';
  end if;

  -- Lock the lines and their materials so two taps cannot both dispense.
  for line in
    select tm.material_id, tm.quantity_used - tm.dispensed_qty as needed, m.stock_qty, m.name
    from public.ticket_materials tm
    join public.materials m on m.id = tm.material_id
    where tm.ticket_id = p_ticket_id and tm.quantity_used > tm.dispensed_qty
    for update of tm, m
  loop
    if line.stock_qty < line.needed then
      raise exception 'Not enough stock for %', line.name using hint = 'insufficient_stock';
    end if;

    update public.materials
    set stock_qty = stock_qty - line.needed
    where id = line.material_id;

    update public.ticket_materials
    set dispensed_qty = quantity_used, dispensed_at = now(), dispensed_by = auth.uid()
    where ticket_id = p_ticket_id and material_id = line.material_id;

    dispensed := dispensed + 1;
  end loop;

  return dispensed;
end;
$$;

revoke execute on function public.dispense_ticket_materials(uuid) from public, anon;
grant execute on function public.dispense_ticket_materials(uuid) to authenticated;
