-- Ana sayfa vitrini için hazır özetler.
--
-- Neden görünüm: toplam izlenme ve niş başına dağılım her sayfa isteğinde
-- 168 bin satır taramak demek. Görünüm sorguyu tek yerde tutuyor, sayfa da
-- saatte bir yenilendiği için (revalidate 3600) maliyet gürültü seviyesinde.
--
-- Neden gerçek sayı: referans sitelerde bu alan tanıtım görseliyle doldurulur.
-- Bizde gerek yok — indeks gerçekten bu büyüklükte ve gerçek sayı uydurmadan
-- daha ikna edici.

create or replace view landing_stats as
  select
    (select count(*) from videos)            as videolar,
    (select count(*) from channels)          as kanallar,
    (select coalesce(sum(views), 0) from videos) as izlenme,
    (select count(*) from niches)            as nisler;

-- Niş başına video sayısı — vitrindeki çubuk grafiğin gerçek verisi.
create or replace view landing_niche_bars as
  select c.niche_slug as nis, count(*)::bigint as adet
  from videos v
  join channels c on c.id = v.channel_id
  where c.niche_slug is not null
  group by c.niche_slug
  order by count(*) desc;

-- Görünümler yalnızca sunucu tarafından okunuyor; anon/authenticated erişimi
-- kasten verilmiyor. service_role'a açık izin şart — RLS'i atlaması tablo
-- yetkisi anlamına gelmiyor.
revoke all on landing_stats from anon, authenticated;
revoke all on landing_niche_bars from anon, authenticated;
grant select on landing_stats, landing_niche_bars to service_role;

-- PostgREST şema önbelleği yeni görünümleri kendiliğinden görmüyor; bu satır
-- olmadan sorgu "Could not find the table" hatası veriyor.
notify pgrst, 'reload schema';
