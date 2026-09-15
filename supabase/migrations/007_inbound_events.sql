-- =============================================================================
-- CCTV FIX-IT — Inbound webhook idempotency (007)
-- =============================================================================
-- Meta and Viber re-deliver an event whenever our 200 is slow or lost. Without
-- a record of what we already handled, a repeat can open a second ticket — two
-- concurrent deliveries both find no customer, both insert — and always sends a
-- second auto-reply. The platform's own message id is the idempotency key.

create table public.inbound_events (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('messenger', 'viber')),
  message_id text not null,
  received_at timestamptz not null default now(),
  unique (channel, message_id)
);

create index inbound_events_received_at_idx on public.inbound_events (received_at);

alter table public.inbound_events enable row level security;

create policy "inbound_events_select_admin" on public.inbound_events
  for select using (public.is_admin());
