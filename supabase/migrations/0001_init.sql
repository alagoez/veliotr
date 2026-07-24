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
  foreach t in array array['profiles','folders','saved_videos','channel_lists','tracked_channels','alerts','notifications','chats']
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "%s sahibi" on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t, t
    );
  end loop;
end $$;

-- profiles: user_id yerine id kolonu kullanır — özel politika
drop policy if exists "profiles sahibi" on profiles;
create policy "profil sahibi" on profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

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
