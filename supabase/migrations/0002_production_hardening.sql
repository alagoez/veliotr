-- Viralab production hardening (safe to run after 0001_init.sql)
-- Existing projects must apply this migration; editing 0001 alone is not enough.

create index if not exists idx_videos_views on videos (views desc);
create index if not exists idx_videos_engagement on videos (engagement desc);
create index if not exists idx_videos_channel_published on videos (channel_id, published_at desc);
create index if not exists idx_view_snapshots_captured on view_snapshots (captured_at desc);
create index if not exists idx_subscriptions_user on subscriptions (user_id);

alter table profiles enable row level security;
drop policy if exists "profiles sahibi" on profiles;
drop policy if exists "profil sahibi" on profiles;
create policy "profil sahibi" on profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "niches okunur" on niches;
drop policy if exists "channels okunur" on channels;
drop policy if exists "videos okunur" on videos;
create policy "niches okunur" on niches for select to authenticated using (true);
create policy "channels okunur" on channels for select to authenticated using (true);
create policy "videos okunur" on videos for select to authenticated using (true);

alter table subscriptions enable row level security;
drop policy if exists "abonelik görünür" on subscriptions;
create policy "abonelik görünür" on subscriptions for select to authenticated
  using (user_id = auth.uid());
