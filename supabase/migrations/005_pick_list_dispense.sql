-- =============================================================================
-- CCTV FIX-IT — Pick-list dispensing (005)
-- =============================================================================

-- Track dispensing per material line.
alter table public.ticket_materials
  add column dispensed_at timestamptz,
  add column dispensed_by uuid references public.profiles (id);

-- Store staff may update a line (only the dispense columns, enforced below).
create policy "ticket_materials_update_store" on public.ticket_materials
  for update using (public.is_admin() or public.has_role('STORE_STAFF'))
  with check (public.is_admin() or public.has_role('STORE_STAFF'));

create or replace function public.enforce_ticket_materials_store_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.has_role('STORE_STAFF') then
    if (new.ticket_id is distinct from old.ticket_id)
       or (new.material_id is distinct from old.material_id)
       or (new.quantity_used is distinct from old.quantity_used)
    then
      raise exception 'Store staff may only update dispensed_at and dispensed_by on ticket_materials';
    end if;
  end if;
  return new;
end;
$$;

create trigger ticket_materials_enforce_store_columns
before update on public.ticket_materials
for each row
execute function public.enforce_ticket_materials_store_columns();
