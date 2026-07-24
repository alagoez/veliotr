-- Durable client state and webhook idempotency.
create table if not exists app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table app_state enable row level security;
drop policy if exists "app state owner" on app_state;
create policy "app state owner" on app_state for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists stripe_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table stripe_events enable row level security;
-- No client policy: only the service role may write/read webhook event records.
