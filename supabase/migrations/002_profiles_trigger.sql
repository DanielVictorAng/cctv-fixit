-- =============================================================================
-- CCTV FIX-IT — Auth profile trigger (002)
-- Auto-creates a profiles row on signup and backfills existing users.
-- =============================================================================

-- Trigger function: insert a profiles row for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, skills, phone_number, is_active)
  values (
    new.id,
    'TECHNICIAN',
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email),
    '{}'::text[],
    new.raw_user_meta_data ->> 'phone_number',
    true
  );
  return new;
end;
$$;

-- Wire the trigger to auth.users inserts.
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- Backfill profiles for users created before this trigger existed.
insert into public.profiles (id, role, full_name, skills, phone_number, is_active)
select
  u.id,
  'TECHNICIAN',
  coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), u.email),
  '{}'::text[],
  u.raw_user_meta_data ->> 'phone_number',
  true
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
