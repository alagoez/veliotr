-- Embedding örneklemesi.
--
-- SORUN: her videoyu vektörlemek Supabase ücretsiz kademesine sığmıyor.
--   768 boyut × 4 bayt = 3.072 bayt/video
--   175.400 video × 3 kB = ~539 MB (sadece vektör, HNSW indeksi ayrıca)
--   Ücretsiz tavan: 500 MB
--
-- ÇÖZÜM: hepsini değil, işe yarayanı vektörle. İki ayrı ihtiyaç var:
--
--   1. NİŞ TESPİTİ (verify-niches.mts) — kanalın ne hakkında olduğunu anlamak.
--      Kanal başına birkaç düzine video yeter; verify-niches zaten en fazla 50
--      video alıp ortalamasını çıkarıyor. Kanalın SON videoları alınıyor çünkü
--      niş "şu an ne üretiyor" sorusunun cevabı.
--
--   2. SEMANTİK ARAMA — "Birebir ↔ Geniş" kaydırıcısı. Kullanıcı zaten yüksek
--      çarpanlı videoları arıyor; 1x'lik bir videonun aranabilir olması
--      kimseye bir şey katmıyor.
--
-- Tahmini boyut: ~35.000 (niş örneği) + ~5.000 (yüksek çarpan) = ~40.000
-- vektör ≈ 123 MB. Temel veriyle birlikte ~300 MB — ücretsiz kademeye sığar.

alter table videos add column if not exists embed_target boolean not null default false;

-- embed.mts yalnızca bu bayrağı taşıyan ve henüz vektörlenmemiş satırları çeker.
create index if not exists idx_videos_embed_queue
  on videos (embed_target, id) where embedding is null;

comment on column videos.embed_target is
  'Vektörlenecek mi? Tümünü vektörlemek ücretsiz kademeye sığmıyor — scripts/embed.mts bu bayrağı kanal başına son N video + yüksek çarpanlılar için kurar.';
