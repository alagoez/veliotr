-- ═══════════════════════════════════════════════════════
--  0001_init.sql
-- ═══════════════════════════════════════════════════════
-- Viralab başlangıç şeması (plan.md §5)
-- Uygulama: Supabase SQL Editor'da çalıştır veya `supabase db push`.

create extension if not exists pg_trgm;

-- ============ İçerik indeksi (herkese okunur, worker yazar) ============

create table if not exists niches (
  id serial primary key,
  slug text unique not null,
  name text not null
);

create table if not exists channels (
  id text primary key,                -- YouTube channel ID
  title text not null,
  handle text,
  avatar_url text,
  country text,
  niche_slug text references niches(slug),
  subscribers bigint default 0,
  total_views bigint default 0,
  video_count int default 0,
  published_at timestamptz,
  uploads_playlist text,
  median_views bigint default 0,
  priority smallint default 0,        -- takip edilenler +1
  last_synced_at timestamptz
);

create table if not exists videos (
  id text primary key,                -- YouTube video ID
  channel_id text not null references channels(id) on delete cascade,
  title text not null,
  thumb_url text,
  published_at timestamptz not null,
  duration_sec int default 0,
  is_short boolean default false,
  views bigint default 0,
  likes bigint default 0,
  comments bigint default 0,
  engagement numeric default 0,
  outlier_score numeric default 0,
  views_per_day numeric default 0,
  views_to_subs numeric default 0,
  updated_at timestamptz default now()
);

create table if not exists view_snapshots (
  video_id text not null references videos(id) on delete cascade,
  captured_at timestamptz not null default now(),
  views bigint not null,
  primary key (video_id, captured_at)
);

create index if not exists idx_videos_outlier on videos (outlier_score desc);
create index if not exists idx_videos_published on videos (published_at desc);
create index if not exists idx_videos_channel on videos (channel_id);
create index if not exists idx_videos_title_trgm on videos using gin (title gin_trgm_ops);
create index if not exists idx_channels_niche on channels (niche_slug);
create index if not exists idx_videos_views on videos (views desc);
create index if not exists idx_videos_engagement on videos (engagement desc);
create index if not exists idx_videos_channel_published on videos (channel_id, published_at desc);
create index if not exists idx_view_snapshots_captured on view_snapshots (captured_at desc);

-- ============ Kullanıcı alanı (RLS) ============

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  niche_slug text references niches(slug),
  youtube_channel_id text,
  plan text default 'free',
  stripe_customer_id text,
  created_at timestamptz default now()
);

create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists saved_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid not null references folders(id) on delete cascade,
  video_id text not null references videos(id) on delete cascade,
  note text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  unique (user_id, folder_id, video_id)
);

create table if not exists channel_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null
);

create table if not exists tracked_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel_id text not null references channels(id) on delete cascade,
  list_id uuid references channel_lists(id) on delete set null,
  created_at timestamptz default now(),
  unique (user_id, channel_id)
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text default 'viral',
  threshold numeric default 3,
  active boolean default true
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  payload jsonb default '{}',
  read_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references folders(id) on delete set null,
  title text,
  created_at timestamptz default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id) on delete cascade,
  role text not null check (role in ('user','model')),
  content text not null,
  created_at timestamptz default now()
);

create table if not exists subscriptions (
  stripe_subscription_id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  stripe_customer_id text,
  status text,
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  updated_at timestamptz default now()
);

-- ============ RLS Politikaları ============

alter table niches enable row level security;
alter table channels enable row level security;
alter table videos enable row level security;
alter table view_snapshots enable row level security;

-- İçerik: giriş yapmış herkese okunur; yazma yalnızca service-role (RLS bypass)
create policy "niches okunur" on niches for select to authenticated, anon using (true);
create policy "channels okunur" on channels for select to authenticated, anon using (true);
create policy "videos okunur" on videos for select to authenticated, anon using (true);
create policy "snapshots okunur" on view_snapshots for select to authenticated using (true);

-- Kullanıcı tabloları: yalnızca sahibi
do $$
declare t text;
begin
  foreach t in array array['folders','saved_videos','channel_lists','tracked_channels','alerts','notifications','chats']
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "%s sahibi" on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t, t
    );
  end loop;
end $$;

-- profiles: user_id yerine id kolonu kullanır — ayrı politika
alter table profiles enable row level security;
drop policy if exists "profil sahibi" on profiles;
create policy "profil sahibi" on profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- İçerik tablolarında anon okuma yerine authenticated kullanıcı erişimi tercih edilir.
drop policy if exists "niches okunur" on niches;
drop policy if exists "channels okunur" on channels;
drop policy if exists "videos okunur" on videos;
create policy "niches okunur" on niches for select to authenticated using (true);
create policy "channels okunur" on channels for select to authenticated using (true);
create policy "videos okunur" on videos for select to authenticated using (true);

alter table chat_messages enable row level security;
create policy "chat mesajı sahibi" on chat_messages for all to authenticated
  using (exists (select 1 from chats c where c.id = chat_id and c.user_id = auth.uid()))
  with check (exists (select 1 from chats c where c.id = chat_id and c.user_id = auth.uid()));

alter table subscriptions enable row level security;
create policy "abonelik görünür" on subscriptions for select to authenticated
  using (user_id = auth.uid());

-- Başlangıç nişleri
insert into niches (slug, name) values
  ('oyun', 'Oyun'),
  ('finans', 'Finans & Borsa'),
  ('yemek', 'Yemek'),
  ('vlog', 'Vlog & Yaşam'),
  ('teknoloji', 'Teknoloji'),
  ('egitim', 'Eğitim')
on conflict (slug) do nothing;


-- ═══════════════════════════════════════════════════════
--  0002_production_hardening.sql
-- ═══════════════════════════════════════════════════════
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


-- ═══════════════════════════════════════════════════════
--  0003_app_state_and_stripe_events.sql
-- ═══════════════════════════════════════════════════════
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


-- ═══════════════════════════════════════════════════════
--  0004_semantic.sql
-- ═══════════════════════════════════════════════════════
-- Semantik arama: pgvector + embedding kolonu + eşleştirme RPC'si
-- (Gemini text-embedding-004 → 768 boyut; scripts/embed.ts doldurur)

create extension if not exists vector;

alter table videos add column if not exists embedding vector(768);

-- HNSW: küçük/orta indekste hızlı kosinüs araması
create index if not exists idx_videos_embedding on videos
  using hnsw (embedding vector_cosine_ops);

-- Sorgu embedding'ine en yakın videolar (temel filtrelerle)
create or replace function match_videos(
  query_embedding vector(768),
  match_count int default 100,
  min_multiplier numeric default 0,
  niche text default null,
  only_short boolean default null
)
returns table (id text, similarity float)
language sql stable
as $$
  select v.id, 1 - (v.embedding <=> query_embedding) as similarity
  from videos v
  join channels c on c.id = v.channel_id
  where v.embedding is not null
    and v.outlier_score >= min_multiplier
    and (niche is null or c.niche_slug = niche)
    and (only_short is null or v.is_short = only_short)
  order by v.embedding <=> query_embedding
  limit match_count;
$$;


-- ═══════════════════════════════════════════════════════
--  0005_security_hardening.sql
-- ═══════════════════════════════════════════════════════
-- Güvenlik denetimi düzeltmeleri (2026-07-25)

-- ── 1) profiles: kullanıcı kendi 'plan' ve 'stripe_customer_id' alanını yazamasın
-- Eski politika "for all" idi; with check yalnızca HANGİ SATIRA dokunulduğunu
-- kısıtlar, HANGİ SÜTUNUN yazıldığını değil. Yani kullanıcı kendi satırında
-- plan='pro' yazabiliyordu (yetki profiles'tan okunmaya başlandığı an bypass).
drop policy if exists "profil sahibi" on profiles;

create policy "profil oku" on profiles for select to authenticated
  using (id = auth.uid());
create policy "profil guncelle" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profil olustur" on profiles for insert to authenticated
  with check (id = auth.uid());

-- Sütun düzeyinde yetki: yalnızca kullanıcının kendi tercihleri yazılabilir.
revoke update on profiles from authenticated;
grant update (display_name, niche_slug, youtube_channel_id) on profiles to authenticated;

-- ── 2) 0001'deki döngü politikaları yeniden çalıştırılabilir olsun
-- (create policy öncesi drop yoktu; migration'ın tekrarı hata verip yarıda kalıyordu)
do $$
declare t text;
begin
  foreach t in array array['folders','saved_videos','channel_lists','tracked_channels','alerts','notifications','chats']
  loop
    execute format('drop policy if exists "%s sahibi" on %I', t, t);
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "%s sahibi" on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t, t
    );
  end loop;
end $$;

-- ── 3) match_videos: sabit search_path (hijyen)
alter function match_videos(vector, int, numeric, text, boolean)
  set search_path = public, pg_temp;


