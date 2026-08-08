-- Kademeli tarama durumu.
--
-- İki farklı tarama var ve maliyetleri 200 kat farklı:
--   ucuz  : channels.list          → 0,02 birim/kanal (abone, izlenme, yaş)
--   derin : playlistItems + videos → ~4 birim/kanal   (videolar, outlier skorları)
--
-- last_synced_at ucuz taramanın saati. Derin taramanın ayrı bir saati olmalı,
-- yoksa "bu kanalın videolarını çektik mi" sorusu cevapsız kalır ve her turda
-- aynı kanallara pahalı çağrı yapılır.

alter table channels add column if not exists last_deep_at timestamptz;

-- Sıra en değerliden (kural 4): derin taraması olmayan kanallar önce, sonra
-- abone sayısına göre. Yarıda kesilse bile elde en iyiler işlenmiş olur.
create index if not exists idx_channels_deep_queue
  on channels (last_deep_at nulls first, subscribers desc);

-- Ucuz taraması hiç yapılmamış / bayatlamış kanalları bulmak için.
create index if not exists idx_channels_synced
  on channels (last_synced_at nulls first);
