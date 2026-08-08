-- Format başına ayrı medyan.
--
-- SORUN (53.800 video üzerinde ölçüldü):
--   Shorts videoların %47'si ama en yüksek çarpanlı 100 videonun %56'sı.
--   Ortalama çarpan: uzun video 2,07 · Shorts 2,60.
--
-- SEBEP: kanalın medyanı iki formatı karıştırıyor. Normalde uzun video basan
-- bir kanal bir Short attığında, Short'un izlenmesi uzun video medyanına
-- bölünüyor. Ölçtüğümüz şey içeriğin başarısı değil, formatın izlenme farkı
-- oluyor — kullanıcı bunu zaten biliyor, ona bilgi vermiyoruz.
--
-- Taranan 341 kanalın 289'u her iki formatı da basıyor: istisna değil, kural.
--
-- ÇÖZÜM: Short, Short medyanına; uzun video, uzun video medyanına bölünsün.
-- median_views (genel medyan) korunuyor — arayüz onu gösteriyor ve geriye
-- dönük uyumluluk için duruyor.

alter table channels add column if not exists median_views_long  bigint default 0;
alter table channels add column if not exists median_views_short bigint default 0;

comment on column channels.median_views_long  is 'Uzun videoların medyanı — uzun video çarpanlarının paydası';
comment on column channels.median_views_short is 'Shorts medyanı — Shorts çarpanlarının paydası';
comment on column channels.median_views       is 'Genel medyan (format ayrımsız) — yalnızca gösterim için';

-- Skorlama artık tarama sırasında değil, scripts/score.mts ile toplu yapılıyor.
-- Bu indeks o güncellemenin kanal kanal ilerlemesini hızlandırıyor.
create index if not exists idx_videos_channel_format on videos (channel_id, is_short);
