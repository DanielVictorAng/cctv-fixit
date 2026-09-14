-- =============================================================================
-- CCTV FIX-IT — Storage bucket for ticket/job photos (003)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-photos',
  'ticket-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Authenticated staff may read ticket photos (download is via signed URLs).
drop policy if exists "ticket_photos_read" on storage.objects;
create policy "ticket_photos_read" on storage.objects
  for select
  to authenticated
  using (bucket_id = 'ticket-photos');
