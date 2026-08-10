/**
 * KAPILAR — aday kanalları eleyip kanıt-kanal'a çeviren adım.
 *
 * Makinenin şablonu (docs/sistem.md ve sohbette kararlaştırıldı):
 *
 *   KANAL KAPILARI        yaş ≤ 6 ay · marka/kurum değil · dil TR|EN · yüzsüz
 *   FORMAT KAPISI         Shorts ≥30 bin VEYA uzun format ≥50 bin izlenme/video
 *                         — biri yeterli, ikisi ayrı yargılanır
 *
 * Neden format ayrı: 400 vasat Shorts atıp 3 uzun videodan biriyle patlayan
 * kanal, tek ortalamada elenir. Oysa aradığımız kanıt tam da odur.
 *
 * Neden video sayısı kapısı YOK: ilk tasarımda "≤30 video" vardı. Ölçtük —
 * 6 aydan genç 85 kanalımızın 80'i (%94) 30'dan fazla videoluydu. Yüzsüz
 * kanalların klasik modeli günde 3-5 Shorts; kapı aradığımızın %94'ünü
 * eliyordu. Verimliliği video sayısı değil, video başına izlenme ölçer.
 *
 * Neden abone kapısı YOK: ters metrik. 3 bin aboneli kanalın 3 milyon
 * izlenmesi, kanıtın zayıflığı değil GÜCÜDÜR.
 *
 * Çalıştırma:
 *   npm run kapi              → kapıları uygula, kanıt defterine yaz
 *   npm run kapi -- --dry     → yalnız rapor, yazma yok
 */
import { createAdminSupabase } from "../src/lib/supabase/admin";
import { kanalDili } from "../src/lib/dil";

const db = createAdminSupabase();
const DRY = process.argv.includes("--dry");

// ── Eşikler: hepsi burada, hepsi adlı ──
const AZAMI_YAS_GUN = 183;        // 6 ay
const SHORTS_ESIK = 30_000;       // video başına ortalama izlenme
const UZUN_ESIK = 50_000;
const GUVEN_ASGARI_VIDEO = 10;    // bu formatta bundan az video varsa "erken sinyal"
const BASLIK_ORNEK = 20;          // dil kararı için kaç başlığa bakılır

/** Marka/kurum süzgeci — creator olmayanlar. scan/discover ile aynı dil. */
const MARKA = /vevo|records|record label|\blabels?\b|music group|sony music|universal music|warner music|\bhybe\b|official artist|topic$|\bnetwork\b|news\b|\btv\b|television|broadcasting|entertainment inc|studios?$|official channel|\bltd\b|\binc\.?$|\bgmbh\b|corporation|haber|bakanl|belediye|üniversite|resmi|prodüksiyon|holding|banka|sigorta/i;

type Kanal = {
  id: string; title: string; subscribers: number; video_count: number;
  published_at: string | null; niche_slug: string | null; lang: string | null;
  faceless: boolean | null;
};

async function main() {
  // Ucuz taraması yapılmış ve henüz hüküm verilmemiş kanallar
  const { data, error } = await db
    .from("channels")
    .select("id, title, subscribers, video_count, published_at, niche_slug, lang, faceless")
    .not("last_synced_at", "is", null)
    .limit(1000);
  if (error) throw new Error(error.message);

  const kanallar = (data ?? []) as Kanal[];
  console.log(`${kanallar.length} kanal değerlendiriliyor${DRY ? " (dry)" : ""}\n`);

  const sayac = { yas: 0, marka: 0, dil: 0, format: 0, yuz: 0, kanit: 0, veriYok: 0 };
  const kanitlar: Record<string, unknown>[] = [];
  const guncellemeler: { id: string; gate_status: string; gate_reason: string | null; lang: string | null;
    short_videos: number; short_avg_views: number; short_best: number;
    long_videos: number; long_avg_views: number; long_best: number }[] = [];

  for (const c of kanallar) {
    let durum = "kanit";
    let sebep: string | null = null;

    // ── KAPI 1: yaş ──
    const yasGun = c.published_at
      ? Math.floor((Date.now() - new Date(c.published_at).getTime()) / 86_400_000)
      : null;
    if (yasGun === null) { durum = "elendi"; sebep = "yaş bilinmiyor"; sayac.veriYok++; }
    else if (yasGun > AZAMI_YAS_GUN) { durum = "elendi"; sebep = `yaş ${Math.round(yasGun / 30)} ay`; sayac.yas++; }

    // ── KAPI 2: marka/kurum ──
    if (durum === "kanit" && MARKA.test(c.title)) {
      durum = "elendi"; sebep = "marka/kurum"; sayac.marka++;
    }

    // ── Videolar: dil ve format karnesi için ──
    const { data: vids } = await db
      .from("videos")
      .select("title, views, is_short, outlier_score")
      .eq("channel_id", c.id)
      .order("published_at", { ascending: false })
      .limit(200);
    const videolar = vids ?? [];

    // Format karneleri — Shorts ve uzun AYRI
    const shorts = videolar.filter((v) => v.is_short);
    const uzun = videolar.filter((v) => !v.is_short);
    const ort = (a: typeof videolar) =>
      a.length ? Math.round(a.reduce((s, v) => s + Number(v.views ?? 0), 0) / a.length) : 0;
    const enIyi = (a: typeof videolar) =>
      a.length ? Math.max(...a.map((v) => Number(v.outlier_score ?? 0))) : 0;

    const karne = {
      short_videos: shorts.length, short_avg_views: ort(shorts), short_best: enIyi(shorts),
      long_videos: uzun.length, long_avg_views: ort(uzun), long_best: enIyi(uzun),
    };

    // ── KAPI 3: dil ──
    const dil = kanalDili(videolar.slice(0, BASLIK_ORNEK).map((v) => String(v.title ?? "")));
    if (durum === "kanit" && dil === "other") {
      durum = "elendi"; sebep = "dil TR/EN değil"; sayac.dil++;
    }

    // ── KAPI 4: format eşiği — biri yeterli ──
    const shortGecti = karne.short_avg_views >= SHORTS_ESIK;
    const uzunGecti = karne.long_avg_views >= UZUN_ESIK;
    if (durum === "kanit" && !shortGecti && !uzunGecti) {
      durum = "elendi";
      sebep = `izlenme düşük (S:${karne.short_avg_views} U:${karne.long_avg_views})`;
      sayac.format++;
    }

    // ── KAPI 5: yüzsüzlük ──
    // Henüz bakılmadıysa (null) elenmiyor, 'aday' olarak bekliyor: yüz tespiti
    // ayrı adım. false ise elenir.
    if (durum === "kanit" && c.faceless === false) {
      durum = "elendi"; sebep = "yüz gösteriyor"; sayac.yuz++;
    }
    if (durum === "kanit" && c.faceless === null) {
      durum = "aday"; sebep = "yüz kontrolü bekliyor";
    }

    guncellemeler.push({ id: c.id, gate_status: durum, gate_reason: sebep, lang: dil, ...karne });

    if (durum === "kanit") {
      sayac.kanit++;
      // Hangi formattan geçti — ikisi de geçtiyse çarpanı yüksek olan yazılır
      const format = shortGecti && uzunGecti
        ? (karne.short_best >= karne.long_best ? "short" : "long")
        : shortGecti ? "short" : "long";
      // Güven işareti: o formatta 10'dan az video varsa kanıt "erken sinyal".
      // Elemiyoruz — 3 videodan biri 180x yapmış olabilir ve bu değerli bir
      // ipucudur; ama şans payı yüksek, kullanıcı bunu bilerek baksın.
      const oFormattakiVideo = format === "short" ? karne.short_videos : karne.long_videos;
      const erkenSinyal = oFormattakiVideo < GUVEN_ASGARI_VIDEO;

      kanitlar.push({
        channel_id: c.id,
        niche_slug: c.niche_slug,
        age_days: yasGun,
        subscribers: c.subscribers,
        video_count: c.video_count,
        upload_rate: yasGun && yasGun > 0
          ? Math.round((c.video_count / (yasGun / 30)) * 10) / 10 : null,
        format,
        avg_views: format === "short" ? karne.short_avg_views : karne.long_avg_views,
        best_score: format === "short" ? karne.short_best : karne.long_best,
        lang: dil,
        faceless: c.faceless,
        early_signal: erkenSinyal,
      });
    }
  }

  console.log("KAPI SONUÇLARI");
  console.log(`  yaş > 6 ay        : ${sayac.yas}`);
  console.log(`  marka/kurum       : ${sayac.marka}`);
  console.log(`  dil TR/EN değil   : ${sayac.dil}`);
  console.log(`  izlenme düşük     : ${sayac.format}`);
  console.log(`  yüz gösteriyor    : ${sayac.yuz}`);
  console.log(`  yaş verisi yok    : ${sayac.veriYok}`);
  console.log(`  ─────────────────────────`);
  console.log(`  KANIT-KANAL       : ${sayac.kanit}`);

  if (DRY) { console.log("\n(dry — yazılmadı)"); return; }

  for (let i = 0; i < guncellemeler.length; i += 100) {
    const { error: e } = await db.from("channels").upsert(guncellemeler.slice(i, i + 100));
    if (e) throw new Error(`kanal güncelleme: ${e.message}`);
  }
  if (kanitlar.length) {
    const { error: e } = await db.from("evidence").upsert(kanitlar, { onConflict: "channel_id,seen_on" });
    if (e) throw new Error(`kanıt defteri: ${e.message}`);
  }
  console.log(`\n✓ ${guncellemeler.length} kanal güncellendi · ${kanitlar.length} kanıt deftere yazıldı`);
}

await main();
