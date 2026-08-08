/**
 * Outlier skorlama — saf SQL, YouTube kotası harcamaz.
 *
 * NEDEN AYRI BİR ADIM:
 * Skor, tarama sırasında hesaplansaydı formülün her değişikliği 1.754 kanalı
 * yeniden çekmek (~7.000 birim kota, ~1 saat) demek olurdu. Oysa skor için
 * gereken her şey zaten tabloda: izlenme, format, yayın tarihi. Skorlamayı
 * ayırınca formül serbestçe denenebiliyor — çalıştırma maliyeti sıfır.
 *
 * FORMÜL (docs/sistem.md §6):
 *   medyan = medyan(izlenme | 30 günden eski, AYNI FORMATTAKİ videolar)
 *   çarpan = izlenme / medyan
 *
 * Format ayrımı şart: bir Short'u uzun video medyanına bölmek, içeriğin
 * başarısını değil formatın izlenme farkını ölçer.
 *
 * Medyan seçim sırası (mevcut mantığın format bazına taşınmış hâli):
 *   1. O formattaki 30 günden eski videolar, en az 10 tane varsa
 *   2. Yoksa o formattaki TÜM videolar, en az 10 tane varsa
 *   3. Yoksa 0 → o formatın videolarında skor 0
 * Ayrıca medyan 500'ün altındaysa skor 0 (anlamsız şişmeyi engeller).
 *
 * Çalıştırma: npm run score
 *             npm run score -- --dry   (sadece rapor, yazma yok)
 */
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!TOKEN || !URL_) {
  console.error("SUPABASE_ACCESS_TOKEN ve NEXT_PUBLIC_SUPABASE_URL gerekli.");
  process.exit(1);
}

const DRY = process.argv.includes("--dry");
const ref = new URL(URL_).hostname.split(".")[0];
const SQL_API = `https://api.supabase.com/v1/projects/${ref}/database/query`;

/** Mutlak medyan tabanı — dejenere durumları eler. docs/sistem.md §6. */
const MIN_MEDIAN_BASE = 500;
/** Medyanın güvenilir sayılması için gereken asgari video sayısı. */
const MIN_VIDEOS = 10;
/** Videonun "olgun" (izlenmesini toplamış) sayılması için gereken yaş. */
const MATURE_DAYS = 30;

/**
 * GÖRELİ medyan tabanı: medyan, abone sayısının en az bu yüzdesi olmalı.
 *
 * Neden mutlak taban yetmiyor: 500'lük taban hiçbir şeyi elemiyordu (677
 * Shorts kanalının 0'ı eleniyordu) ama absürt skorlar üretiyordu — HBL kanalı
 * 287.000 aboneli, Shorts medyanı 803 (abonesinin %0,28'i), bir Short'u 23
 * milyon almış → 29.006x. Sayı doğru, bilgi değeri sıfır.
 *
 * Mutlak tabanı yükseltmek yanlış çözüm: küçük kanalları cezalandırır, oysa
 * "küçük kanal outlier'ı" ürünün ayırt edici özelliği. 10 bin aboneli gerçek
 * bir kanalın medyanı 3.000 olabilir ve bu normaldir.
 *
 * Ölçüm (677 Shorts + 712 uzun video kanalı üzerinde):
 *   medyan/abone oranı → 5. yüzdelik %0,83 · ortanca %19,3
 * Eşik 5. yüzdeliğin ALTINA konuyor ki sıradan alt kuyruk değil, yalnızca
 * açıkça anormal kanallar elensin. %0,5'te 14 Shorts + 31 uzun kanal eleniyor.
 */
const MIN_MEDIAN_SUB_RATIO = Number(
  process.argv.find((a) => a.startsWith("--ratio="))?.slice(8) ?? 0.5,
);

async function sql<T = Record<string, unknown>>(query: string): Promise<T[]> {
  const res = await fetch(SQL_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`SQL ${res.status}: ${(await res.text()).slice(0, 400)}`);
  return res.json() as Promise<T[]>;
}

/**
 * (kanal, format) başına medyan. Yukarıdaki 3 basamaklı seçim sırası
 * `case` içinde: önce olgun videolar, sonra tüm videolar, sonra 0.
 */
const MEDIAN_CTE = `
  with olgun as (
    select channel_id, is_short,
           count(*) n,
           percentile_cont(0.5) within group (order by views) med
    from videos
    where published_at < now() - interval '${MATURE_DAYS} days'
    group by channel_id, is_short
  ),
  tumu as (
    select channel_id, is_short,
           count(*) n,
           percentile_cont(0.5) within group (order by views) med
    from videos
    group by channel_id, is_short
  ),
  ham as (
    select t.channel_id, t.is_short,
           case
             when o.n >= ${MIN_VIDEOS} then o.med
             when t.n >= ${MIN_VIDEOS} then t.med
             else 0
           end::bigint med
    from tumu t
    left join olgun o on o.channel_id = t.channel_id and o.is_short = t.is_short
  ),
  -- Göreli taban: medyan abonenin %${MIN_MEDIAN_SUB_RATIO}'inden azsa kanal
  -- skorlanmaz. med=0 yazılıyor, aşağıdaki MIN_MEDIAN_BASE kontrolü sıfırlıyor.
  medyan as (
    select h.channel_id, h.is_short,
           case
             when c.subscribers > 0
              and h.med < c.subscribers * ${MIN_MEDIAN_SUB_RATIO} / 100.0
             then 0::bigint
             else h.med
           end med
    from ham h join channels c on c.id = h.channel_id
  )`;

console.log(DRY ? "SKORLAMA (dry — yazma yok)\n" : "SKORLAMA\n");

// ── Önce fotoğraf: değişim öncesi durum ──
const [once] = await sql<{ toplam: string; sifir: string; ort: string; on_kat: string }>(`
  select count(*) toplam,
         count(*) filter (where outlier_score = 0) sifir,
         round(avg(outlier_score), 2) ort,
         count(*) filter (where outlier_score >= 10) on_kat
  from videos`);
console.log(`ÖNCE  → ${once.toplam} video · ortalama çarpan ${once.ort} · 10x üstü ${once.on_kat} · skorsuz ${once.sifir}`);

if (DRY) {
  const kiyas = await sql<{ is_short: boolean; kanal: string; medyansiz: string }>(`
    ${MEDIAN_CTE}
    select is_short, count(*) kanal, count(*) filter (where med < ${MIN_MEDIAN_BASE}) medyansiz
    from medyan group by is_short order by is_short`);
  console.log("\nHESAPLANAN MEDYANLAR:");
  for (const r of kiyas) {
    console.log(
      `  ${r.is_short ? "Shorts    " : "Uzun video"} ${String(r.kanal).padStart(5)} kanal · ` +
        `${r.medyansiz} tanesi taban altı (skor 0 kalacak)`,
    );
  }
  console.log("\n(--dry: hiçbir şey yazılmadı)");
  process.exit(0);
}

// ── 1. Kanal medyanlarını yaz ──
await sql(`
  ${MEDIAN_CTE}
  update channels c set
    median_views_long  = coalesce((select med from medyan m where m.channel_id = c.id and not m.is_short), 0),
    median_views_short = coalesce((select med from medyan m where m.channel_id = c.id and     m.is_short), 0)
  where exists (select 1 from medyan m where m.channel_id = c.id)`);
console.log("✓ Kanal medyanları (format başına) yazıldı");

// ── 2. Genel medyan — yalnızca gösterim için, format ayrımsız ──
await sql(`
  with genel as (
    select channel_id,
           count(*) n,
           percentile_cont(0.5) within group (order by views) med
    from videos
    where published_at < now() - interval '${MATURE_DAYS} days'
    group by channel_id
  )
  update channels c set median_views = g.med::bigint
  from genel g where g.channel_id = c.id and g.n >= ${MIN_VIDEOS}`);
console.log("✓ Genel medyan (gösterim) güncellendi");

// ── 3. Video çarpanları — her video KENDİ formatının medyanına bölünüyor ──
await sql(`
  ${MEDIAN_CTE}
  update videos v set
    outlier_score = case
      when m.med >= ${MIN_MEDIAN_BASE} then round((v.views::numeric / m.med), 1)
      else 0
    end
  from medyan m
  where m.channel_id = v.channel_id and m.is_short = v.is_short`);
console.log("✓ Video çarpanları format bazlı yeniden hesaplandı");

// ── Sonra fotoğrafı ──
const [sonra] = await sql<{ toplam: string; sifir: string; ort: string; on_kat: string }>(`
  select count(*) toplam,
         count(*) filter (where outlier_score = 0) sifir,
         round(avg(outlier_score), 2) ort,
         count(*) filter (where outlier_score >= 10) on_kat
  from videos`);
console.log(`\nSONRA → ${sonra.toplam} video · ortalama çarpan ${sonra.ort} · 10x üstü ${sonra.on_kat} · skorsuz ${sonra.sifir}`);

const format = await sql<{ is_short: boolean; adet: string; ort: string; on_kat: string }>(`
  select is_short, count(*) adet, round(avg(outlier_score), 2) ort,
         count(*) filter (where outlier_score >= 10) on_kat
  from videos group by is_short order by is_short`);
console.log("\nFORMAT KARŞILAŞTIRMASI:");
for (const r of format) {
  console.log(
    `  ${r.is_short ? "Shorts    " : "Uzun video"} ${String(r.adet).padStart(6)} video · ` +
      `ort çarpan ${String(r.ort).padStart(5)} · 10x üstü ${r.on_kat}`,
  );
}

const [tepe] = await sql<{ oran: string }>(`
  select round(100.0 * count(*) filter (where is_short) / count(*), 1) oran
  from (select is_short from videos order by outlier_score desc limit 100) t`);
console.log(`\nEn yüksek çarpanlı 100 videonun %${tepe.oran}'i Shorts`);
