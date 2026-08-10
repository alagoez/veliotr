/**
 * 30 GÜN TEMİZLİĞİ — YouTube API şartlarına uyum, her gece çalışır.
 *
 * KURAL: Google'dan gelen veri 30 günden uzun saklanamaz — ya tazelenir ya
 * silinir. İki istisna:
 *   · KİMLİKLER (kanal id, video id) süresiz saklanabilir
 *   · BİZİM ÜRETTİĞİMİZ analiz (kanıt defteri, skorlar) bizim malımızdır
 *
 * Bu yüzden temizlik "satırı sil" değil, "Google'ın alanlarını boşalt":
 * başlık, izlenme, beğeni, kapak adresi gider; id ve bağlantı kalır. Ertesi
 * gün istersek aynı kimlikle yarım kuruşluk çağrıyla hepsini geri çekeriz.
 *
 * Neden başlık da siliniyor: çoğu kişi "sadece sayılar" sanıyor. Şartlar
 * başlık, açıklama, kapak gibi tanıtıcı alanları da kapsıyor.
 *
 * Çalıştırma:
 *   npm run temizlik            → uygula
 *   npm run temizlik -- --dry   → yalnız rapor
 */
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!TOKEN || !URL_) {
  console.error("SUPABASE_ACCESS_TOKEN ve NEXT_PUBLIC_SUPABASE_URL gerekli.");
  process.exit(1);
}

const DRY = process.argv.includes("--dry");
const GUN = Number(process.argv.find((a) => a.startsWith("--gun="))?.slice(6) ?? 30);
const ref = new URL(URL_).hostname.split(".")[0];
const API = `https://api.supabase.com/v1/projects/${ref}/database/query`;

async function sql<T = Record<string, unknown>>(query: string): Promise<T[]> {
  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`SQL ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json() as Promise<T[]>;
}

console.log(`30 GÜN TEMİZLİĞİ${DRY ? " (dry)" : ""} · eşik: ${GUN} gün\n`);

const [once] = await sql<{ v: string; k: string; s: string }>(`
  select
    (select count(*) from videos where updated_at < now() - interval '${GUN} days' and title <> '') v,
    (select count(*) from channels where last_synced_at < now() - interval '${GUN} days' and title <> id) k,
    (select count(*) from view_snapshots where captured_at < now() - interval '${GUN} days') s`);

console.log(`Bayat video     : ${once.v}`);
console.log(`Bayat kanal     : ${once.k}`);
console.log(`Bayat anlık kayıt: ${once.s}`);

const [kanit] = await sql<{ n: string }>(`select count(*) n from evidence`);
console.log(`\nKanıt defteri   : ${kanit.n} kayıt — DOKUNULMAZ (bizim hükmümüz)`);

if (DRY) {
  console.log("\n(dry — hiçbir şey silinmedi)");
  process.exit(0);
}

// 1) Videolar: Google alanları boşaltılır, kimlik ve bağlantı kalır.
//    outlier_score bizim hesabımız ama kaynağı Google verisi → o da sıfırlanır.
await sql(`
  update videos set
    title = '', thumb_url = null, views = 0, likes = 0, comments = 0,
    engagement = 0, outlier_score = 0, views_per_day = 0, views_to_subs = 0
  where updated_at < now() - interval '${GUN} days' and title <> ''`);
console.log("\n✓ Bayat video alanları boşaltıldı (id ve kanal bağlantısı korundu)");

// 2) Kanallar: başlık kimliğe eşitlenir (not-null kısıtı), sayılar sıfırlanır.
await sql(`
  update channels set
    title = id, handle = null, avatar_url = null, country = null,
    subscribers = 0, total_views = 0, video_count = 0, median_views = 0,
    median_views_short = 0, median_views_long = 0,
    short_avg_views = 0, short_best = 0, long_avg_views = 0, long_best = 0
  where last_synced_at < now() - interval '${GUN} days' and title <> id`);
console.log("✓ Bayat kanal alanları boşaltıldı (kimlik korundu)");

// 3) Anlık izlenme kayıtları tamamen silinir — türetilmiş değil, ham veri.
await sql(`delete from view_snapshots where captured_at < now() - interval '${GUN} days'`);
console.log("✓ Bayat anlık kayıtlar silindi");

console.log("\nKalanlar: kanal/video kimlikleri + kanıt defteri. Kural gereği süresiz saklanabilir.");
