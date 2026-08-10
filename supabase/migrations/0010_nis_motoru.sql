-- NİŞ MOTORU — kapılar, format karneleri, kalıcı kanıt defteri
--
-- Ürünün sorusu değişti: "hangi videoyu çekeyim" değil, "hangi nişe gireyim".
-- Cevabın birimi de değişti: video değil, KANIT-KANAL —
-- "6 aydan genç, yüzünü göstermeyen, az emekle patlamış kanal".
--
-- Tasarımın üç direği:
--   1. Ucuz eleme önce. Kanalı tanımak 0,02 birim, videolarını çekmek 1 birim.
--      Kapıları ucuz veriyle geçemeyene pahalı işlem yapılmaz.
--   2. Format ayrı yargılanır. Bir kanal Shorts'ta boğulup uzun formatta
--      patlamış olabilir; tek karneye sıkıştırmak onu eler.
--   3. Kanıt kalıcıdır. Google'ın sayıları 30 günde silinir, bizim hükmümüz
--      ("3 Ağustos'ta keşfedildi, 8 günlüktü, 180x yapmıştı") süresiz kalır.

-- ── Kanal üzerinde kapı ve karne alanları ──

alter table channels add column if not exists discovered_at   timestamptz default now();
alter table channels add column if not exists last_cheap_at   timestamptz;
-- Başlık dili: 'tr' | 'en' | 'other'. Son 20 video başlığından çoğunluk kuralı.
alter table channels add column if not exists lang            text;
-- Yüzsüzlük: true | false | null(henüz bakılmadı). Kapaklardaki gerçek insan
-- yüzü oranı ≤ %10 ise true. Animasyon/çizim yüz sayılmaz.
alter table channels add column if not exists faceless        boolean;
alter table channels add column if not exists faceless_at     timestamptz;

-- Format karneleri — Shorts ve uzun video AYRI ayrı.
-- Kanal seviyesinde tek ortalama tutmak yanıltıyor: 400 vasat Shorts atıp
-- 3 uzun videodan biriyle patlayan kanal, tek ortalamada elenir.
alter table channels add column if not exists short_videos    int default 0;
alter table channels add column if not exists short_avg_views bigint default 0;
alter table channels add column if not exists short_best      numeric default 0;
alter table channels add column if not exists long_videos     int default 0;
alter table channels add column if not exists long_avg_views  bigint default 0;
alter table channels add column if not exists long_best       numeric default 0;

-- Kapı sonucu. 'aday' → henüz bakılmadı · 'elendi' → kapıda kaldı
-- 'kanit' → tüm kapıları geçti, vitrine çıkar
alter table channels add column if not exists gate_status     text default 'aday';
alter table channels add column if not exists gate_reason     text;

create index if not exists idx_channels_gate on channels (gate_status, discovered_at desc);
create index if not exists idx_channels_cheap_queue on channels (last_cheap_at nulls first);
create index if not exists idx_channels_lang on channels (lang);

comment on column channels.gate_status is 'aday | elendi | kanit — beş kapının sonucu';
comment on column channels.lang is 'Başlık dili: tr | en | other. TR+EN dışı elenir.';

-- ── KANIT DEFTERİ ──
--
-- Neden ayrı tablo: channels tablosundaki sayılar Google'ın verisi, 30 günde
-- tazelenir ya da silinir. Buradaki satır ise BİZİM HÜKMÜMÜZ — o gün o kanal
-- hakkında verdiğimiz karar. Türetilmiş veri olduğu için süresiz saklanır ve
-- niş tarihçesini ("bu niş üç haftadır yükseliyor") mümkün kılan tek şey budur.
create table if not exists evidence (
  id            bigserial primary key,
  channel_id    text not null,           -- kimlik: süresiz saklanabilir
  seen_on       date not null default current_date,
  niche_slug    text,
  -- Hüküm anındaki fotoğraf (bizim hesabımız, ham veri değil)
  age_days      int,                     -- o gün kaç günlüktü
  subscribers   bigint,
  video_count   int,
  upload_rate   numeric,                 -- video / ay
  format        text,                    -- 'short' | 'long' — hangi taraftan geçti
  avg_views     bigint,                  -- o formattaki ortalama
  best_score    numeric,                 -- o formattaki en yüksek çarpan
  lang          text,
  faceless      boolean,
  -- O formatta 10dan az video varsa: kanit gecerli ama sans payi yuksek.
  -- Elemiyoruz, kullaniciya isaret ediyoruz.
  early_signal  boolean default false,
  unique (channel_id, seen_on)
);

create index if not exists idx_evidence_gun on evidence (seen_on desc);
create index if not exists idx_evidence_nis on evidence (niche_slug, seen_on desc);

comment on table evidence is
  'Kalıcı kanıt defteri. Google verisi değil, bizim hükmümüz — 30 gün kuralına tabi değil.';

revoke all on evidence from anon, authenticated;
grant select on evidence to service_role;

notify pgrst, 'reload schema';
