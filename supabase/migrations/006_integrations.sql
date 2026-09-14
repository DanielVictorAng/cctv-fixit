-- =============================================================================
-- CCTV FIX-IT — Messaging integrations (006)
-- =============================================================================

-- Intake triage flag: set when inbound matching was unsure.
alter table public.customers
  add column possible_duplicate boolean not null default false;

-- Outbound messages that failed all retries; a cron drains this queue.
create table public.outbound_queue (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('messenger', 'viber')),
  recipient_id text not null,
  body text not null,
  ticket_id uuid references public.tickets (id),
  attempts int not null default 0,
  last_error text,
  status text not null default 'PENDING' check (status in ('PENDING', 'SENT', 'FAILED')),
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index outbound_queue_pending_idx on public.outbound_queue (status, next_attempt_at);

alter table public.outbound_queue enable row level security;

create policy "outbound_queue_select_admin" on public.outbound_queue
  for select using (public.is_admin());
