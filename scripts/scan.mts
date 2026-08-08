/**
 * Kademeli kanal tarayıcı — evreni DB'den okur, ucuzdan pahalıya ilerler.
 *
 * ingest.ts'in yerini almaz (o hâlâ seeds/channels.json ile çalışan eski akış).
 * Fark: kanal evreni artık JSON dosyası değil, `channels` tablosu. 2.000 kanalda
 * JSON çatırdıyor; ayrıca "hangi kanal ne zaman tarandı" bilgisi dosyada tutulamaz.
 *
 * Üç faz — hepsi ayrı ayrı çalıştırılabilir:
 *
 *   --load    JSON tohumları → channels tablosu. Sadece kimlik + niş. Kota: 0
 *   --cheap   channels.list ile istatistik doldur.       Kota: 0,02 birim/kanal
 *   --deep    videoları çek, outlier skorla.             Kota: ~4 birim/kanal
 *
 * Faz sırası kasten bu (kural 3: ucuz eleme her zaman önce). 2.000 kanalın
 * tamamını ucuz taramak 40 birim; aynı 2.000 kanalı derin taramak 8.000 birim.
 * Önce herkesi ucuza tanı, sonra sadece hak edeni pahalıya işle.
 *
 * Çalıştırma:
 *   npm run scan -- --load
 *   npm run scan -- --cheap --budget=500
 *   npm run scan -- --deep  --budget=5000
 *   npm run scan -- --load --cheap --deep --budget=8000
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createAdminSupabase } from "../src/lib/supabase/admin";

const db = createAdminSupabase();
const KEY = process.env.YOUTUBE_API_KEY;
const API = "https://www.googleapis.com/youtube/v3";

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}
const DO_LOAD = process.argv.includes("--load");
const DO_CHEAP = process.argv.includes("--cheap");
const DO_DEEP = process.argv.includes("--deep");
const BUDGET = Number(arg("budget") ?? 5000);
/** Ucuz taraması bundan eski olan kanal yeniden taranır. */
const STALE_DAYS = Number(arg("stale") ?? 7);
/** Derin taramada kanal başına çekilecek video sayısı (50'nin katı). */
const DEEP_VIDEOS = Number(arg("videos") ?? 100);
/** Çarpan tabanı — bunun altında medyanı olan kanalda skor 0 kalır (ingest.ts ile aynı). */
const MIN_MEDIAN_BASE = 500;

if (!DO_LOAD && !DO_CHEAP && !DO_DEEP) {
  console.error("En az bir faz seç: --load, --cheap, --deep");
  process.exit(1);
}

// ───────────────────────── kota defteri ─────────────────────────

/** Kural 1: sayaç tahmin etmez, sayar. Çağrı YAPILMADAN ÖNCE yazılır. */
let spent = 0;
function reserve(units: number): boolean {
  if (spent + units > BUDGET) return false;
  spent += units;
  return true;
}

/** Günlük kota gerçekten bittiğinde (bizim defterimiz değil, Google'ınki). */
let apiQuotaExhausted = false;

async function yt<T>(path: string, params: Record<string, string>, units: number): Promise<T | null> {
  if (!KEY) throw new Error("YOUTUBE_API_KEY gerekli.");
  if (apiQuotaExhausted) return null;
  if (!reserve(units)) return null;
  const qs = new URLSearchParams({ ...params, key: KEY });
  const res = await fetch(`${API}/${path}?${qs}`);
  if (!res.ok) {
    const body = await res.text();
    // Google'ın günlük kotası bizim bütçemizden önce bitebilir (aynı anahtar
    // discover-global tarafından da kullanılıyor). Bu bir hata değil, sınır:
    // çökmek yerine dur — işlenen kanallar last_deep_at ile korunuyor, sonraki
    // çalıştırma kaldığı yerden devam eder.
    if (res.status === 403 && /quotaExceeded|dailyLimitExceeded/i.test(body)) {
      apiQuotaExhausted = true;
      console.log("\n⏸  Google günlük kotası doldu — durduruldu. Yarın kaldığı yerden devam eder.");
      return null;
    }
    throw new Error(`${path} ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

// ───────────────────────── yardımcılar ─────────────────────────

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.floor((s[mid - 1] + s[mid]) / 2);
}

function parseDuration(iso: string): number {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso ?? "");
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

/**
 * Supabase yazma parti boyutu.
 *
 * ingest.ts 20'ye sabitlemiş; gerekçesi videos tablosundaki HNSW embedding
 * indeksinin büyük upsert'lerde statement timeout'a düşmesi. Ama bu ancak
 * embedding kolonu DOLUYSA geçerli — indeks boşken güncelleme maliyeti yok.
 *
 * Ölçüm: 20'lik partilerle kanal başına 5 yazma turu → ~7,5 sn/kanal, 1.680
 * kanal için 3,5 saat. embed.mts çalıştırıldıktan (embedding'ler dolduktan)
 * sonra bu değeri düşürmek gerekebilir; --chunk ile ayarlanabilir.
 */
const WRITE_CHUNK = Number(arg("chunk") ?? 100);
async function writeChunked<T>(
  rows: T[],
  fn: (chunk: T[]) => PromiseLike<{ error: { message: string } | null }>,
  label: string,
) {
  for (let i = 0; i < rows.length; i += WRITE_CHUNK) {
    const { error } = await fn(rows.slice(i, i + WRITE_CHUNK));
    if (error) throw new Error(`${label}: ${error.message}`);
  }
}

// ───────────────────────── faz 1: LOAD ─────────────────────────

/**
 * Tohum dosyalarını birleştirip channels tablosuna kimlik olarak yazar.
 * İki kaynak var ve ikisi de değerli:
 *   seeds/channels.json    — alperen'in elle küratörlediği TR kanalları
 *   seeds/discovered.json  — discover-global.mts'in bulduğu TR + global kanallar
 * Aynı kanal iki dosyada da varsa çakışma yok: id birincil anahtar, upsert.
 */
async function phaseLoad() {
  const seeds: { niche: string; ids: string[] }[] = [];

  const legacyPath = join(process.cwd(), "seeds", "channels.json");
  if (existsSync(legacyPath)) {
    const legacy = JSON.parse(readFileSync(legacyPath, "utf8")) as {
      niche: string;
      channelIds: string[];
    }[];
    for (const s of legacy) seeds.push({ niche: s.niche, ids: s.channelIds });
  }

  const discPath = join(process.cwd(), "seeds", "discovered.json");
  if (existsSync(discPath)) {
    const disc = JSON.parse(readFileSync(discPath, "utf8")) as {
      niches: { niche: string; channels: { id: string }[] }[];
    };
    for (const n of disc.niches) seeds.push({ niche: n.niche, ids: n.channels.map((c) => c.id) });
  }

  // Aynı kanal birden çok nişte olabilir; ilk niş kazanır (deterministik:
  // seeds sırası sabit, id'ler sıralı).
  const universe = new Map<string, string>();
  for (const s of seeds) {
    for (const id of [...s.ids].sort()) {
      if (!universe.has(id)) universe.set(id, s.niche);
    }
  }

  // Kara liste: kurum/yayıncı/plak şirketi. DB'den silmek yetmez — tohum
  // dosyalarında durdukları için her --load'da geri gelirler.
  const blockPath = join(process.cwd(), "seeds", "blocked-channels.json");
  const blocked = existsSync(blockPath)
    ? new Set(
        (JSON.parse(readFileSync(blockPath, "utf8")) as { blocked: { id: string }[] }).blocked.map(
          (b) => b.id,
        ),
      )
    : new Set<string>();

  // niches tablosundaki slug'lara uymayan nişler FK'ya takılır — önce süz.
  const { data: nicheRows } = await db.from("niches").select("slug");
  const known = new Set((nicheRows ?? []).map((n) => n.slug as string));
  const rows = [...universe.entries()]
    .filter(([id, niche]) => known.has(niche) && !blocked.has(id))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([id, niche]) => ({ id, title: id, niche_slug: niche }));

  const blockedHits = [...universe.keys()].filter((id) => blocked.has(id)).length;
  const dropped = universe.size - rows.length - blockedHits;
  // title zorunlu (not null) ama henüz bilinmiyor — ucuz tarama dolduracak.
  // ignoreDuplicates: mevcut kanalların title/istatistiklerini EZME.
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db
      .from("channels")
      .upsert(rows.slice(i, i + 500), { onConflict: "id", ignoreDuplicates: true });
    if (error) throw new Error(`channels upsert: ${error.message}`);
  }

  // Kara listedekiler daha önce yüklenmiş olabilir — tabloda kalmasınlar.
  if (blocked.size) {
    await db.from("channels").delete().in("id", [...blocked]); // videolar cascade siliniyor
  }

  const { count } = await db.from("channels").select("id", { count: "exact", head: true });
  console.log(`LOAD  → tohum ${universe.size} · yazıldı ${rows.length}` +
    (blockedHits ? ` · kara liste ${blockedHits}` : "") +
    (dropped ? ` · bilinmeyen niş ${dropped}` : "") +
    ` · tablodaki toplam ${count}`);
}

// ───────────────────────── faz 2: CHEAP ─────────────────────────

type YtChannel = {
  id: string;
  snippet: {
    title: string;
    customUrl?: string;
    country?: string;
    publishedAt: string;
    thumbnails?: { default?: { url: string } };
  };
  statistics: { subscriberCount?: string; viewCount?: string; videoCount?: string };
  contentDetails: { relatedPlaylists: { uploads: string } };
};

/**
 * channels.list ile 50'lik partiler — parti başına 1 birim, yani kanal başına 0,02.
 * Bu fazda video çekilmez. Amaç: kim kim, kaç abonesi var, kaç yaşında, uploads
 * listesi ne. Derin taramanın kime yapılacağı buradan çıkacak.
 */
async function phaseCheap() {
  const staleBefore = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString();
  let updated = 0;
  let missing = 0;
  let budgetOut = false;

  // PostgREST tek sorguda en fazla 1000 satır döndürür — .limit(50000) bunu
  // AŞMAZ, sessizce keser. Bu yüzden kuyruk tur tur çekiliyor: her turda
  // işlenenlerin last_synced_at'i dolduğu için sonraki tur kalanları getirir.
  for (;;) {
    const { data: todo, error } = await db
      .from("channels")
      .select("id")
      .or(`last_synced_at.is.null,last_synced_at.lt.${staleBefore}`)
      .order("last_synced_at", { ascending: true, nullsFirst: true })
      .limit(1000);
    if (error) throw new Error(`cheap kuyruk: ${error.message}`);

    const ids = (todo ?? []).map((c) => c.id as string);
    if (!ids.length) break;

    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      const res = await yt<{ items: YtChannel[] }>(
        "channels",
        { part: "snippet,statistics,contentDetails", id: batch.join(","), maxResults: "50" },
        1,
      );
      if (res === null) {
        budgetOut = true;
        break;
      }
      const seen = new Set<string>();
      const rows = (res.items ?? []).map((ch) => {
        seen.add(ch.id);
        return {
          id: ch.id,
          title: ch.snippet.title,
          handle: ch.snippet.customUrl ?? null,
          avatar_url: ch.snippet.thumbnails?.default?.url ?? null,
          country: ch.snippet.country ?? null,
          subscribers: Number(ch.statistics.subscriberCount ?? 0),
          total_views: Number(ch.statistics.viewCount ?? 0),
          video_count: Number(ch.statistics.videoCount ?? 0),
          published_at: ch.snippet.publishedAt,
          uploads_playlist: ch.contentDetails.relatedPlaylists.uploads,
          last_synced_at: new Date().toISOString(),
        };
      });
      // API'nin döndürmediği ID'ler = silinmiş/kapatılmış kanallar. Bunların
      // last_synced_at'i dolmaz; sonsuz döngüye girmemek için işaretlenmeli.
      const gone = batch.filter((id) => !seen.has(id));
      missing += gone.length;
      if (gone.length) {
        await db
          .from("channels")
          .update({ last_synced_at: new Date().toISOString(), priority: -1 })
          .in("id", gone);
      }
      if (rows.length) {
        await writeChunked(rows, (c) => db.from("channels").upsert(c), "cheap upsert");
        updated += rows.length;
      }
      process.stdout.write(`\rCHEAP → ${updated} kanal · kota ${spent}   `);
    }
    if (budgetOut) break;
  }

  if (budgetOut) console.log(`\nCHEAP → bütçe doldu.`);
  console.log(
    `\nCHEAP → ${updated} kanal güncellendi` +
      (missing ? ` · ${missing} kanal API'de yok (silinmiş, priority=-1 ile işaretlendi)` : "") +
      ` · kota ${spent}`,
  );
}

// ───────────────────────── faz 3: DEEP ─────────────────────────

type YtPlaylistItem = { contentDetails: { videoId: string } };
type YtVideo = {
  id: string;
  snippet: { title: string; publishedAt: string; thumbnails?: { medium?: { url: string } } };
  statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
  contentDetails: { duration: string };
};

/**
 * Sıra en değerliden (kural 4): hiç derin taranmamışlar önce, sonra abone
 * sayısına göre. Bütçe yarıda bitse bile elde en iyiler işlenmiş olur —
 * rastgele bir kesit değil.
 *
 * Skorlama ingest.ts ile birebir aynı formül (plan.md §4.3):
 *   medyan = 30 günden eski videoların medyanı (en az 10 video varsa)
 *   çarpan = izlenme / medyan     — medyan 500'ün altındaysa 0 (anlamsız şişmeyi engeller)
 */
async function phaseDeep() {
  const pages = Math.max(1, Math.ceil(DEEP_VIDEOS / 50));
  const perChannel = 1 + pages * 2; // ~1 playlistItems sayfası + videos partisi başına 1

  const { data: todo } = await db
    .from("channels")
    .select("id, title, subscribers, uploads_playlist")
    .not("uploads_playlist", "is", null)
    .order("last_deep_at", { ascending: true, nullsFirst: true })
    .order("subscribers", { ascending: false })
    .limit(Math.ceil(BUDGET / perChannel) + 20);

  const queue = todo ?? [];
  if (!queue.length) {
    console.log("DEEP  → kuyruk boş (önce --cheap çalıştır, uploads_playlist gerekiyor).");
    return;
  }

  let done = 0;
  let totalVideos = 0;
  const now = Date.now();
  const DAY = 86_400_000;

  for (const ch of queue) {
    // Kanal başına maliyeti önden bilmek, yarım kalmış kanal bırakmamak için.
    if (spent + perChannel > BUDGET) {
      console.log(`\nDEEP  → bütçe doldu (${done}/${queue.length} kanal).`);
      break;
    }

    const videoIds: string[] = [];
    let pageToken: string | undefined;
    for (let p = 0; p < pages; p++) {
      const pl = await yt<{ items: YtPlaylistItem[]; nextPageToken?: string }>(
        "playlistItems",
        {
          part: "contentDetails",
          playlistId: ch.uploads_playlist as string,
          maxResults: "50",
          ...(pageToken ? { pageToken } : {}),
        },
        1,
      );
      if (pl === null) break;
      videoIds.push(...(pl.items ?? []).map((x) => x.contentDetails.videoId));
      pageToken = pl.nextPageToken;
      if (!pageToken) break;
    }

    const vids: YtVideo[] = [];
    for (let v = 0; v < videoIds.length; v += 50) {
      const vr = await yt<{ items: YtVideo[] }>(
        "videos",
        {
          part: "snippet,statistics,contentDetails",
          id: videoIds.slice(v, v + 50).join(","),
          maxResults: "50",
        },
        1,
      );
      if (vr === null) break;
      vids.push(...(vr.items ?? []));
    }

    const parsed = vids.map((v) => ({
      id: v.id,
      title: v.snippet.title,
      publishedAt: v.snippet.publishedAt,
      thumbUrl: v.snippet.thumbnails?.medium?.url ?? null,
      durationSec: parseDuration(v.contentDetails.duration),
      views: Number(v.statistics.viewCount ?? 0),
      likes: Number(v.statistics.likeCount ?? 0),
      comments: Number(v.statistics.commentCount ?? 0),
    }));

    const mature = parsed.filter((v) => now - new Date(v.publishedAt).getTime() > 30 * DAY);
    const med = median((mature.length >= 10 ? mature : parsed).map((v) => v.views));
    const subs = Number(ch.subscribers ?? 0);
    const base = med >= MIN_MEDIAN_BASE ? med : 0;

    const rows = parsed.map((v) => {
      const ageDays = Math.max((now - new Date(v.publishedAt).getTime()) / DAY, 1);
      return {
        id: v.id,
        channel_id: ch.id as string,
        title: v.title,
        thumb_url: v.thumbUrl,
        published_at: v.publishedAt,
        duration_sec: v.durationSec,
        is_short: v.durationSec > 0 && v.durationSec <= 62,
        views: v.views,
        likes: v.likes,
        comments: v.comments,
        engagement: v.views > 0 ? (v.likes + v.comments) / v.views : 0,
        outlier_score: base > 0 ? Math.round((v.views / base) * 10) / 10 : 0,
        views_per_day: Math.round(v.views / ageDays),
        views_to_subs: subs > 0 ? Math.round((v.views / subs) * 100) / 100 : 0,
        updated_at: new Date().toISOString(),
      };
    });

    if (rows.length) {
      await writeChunked(rows, (c) => db.from("videos").upsert(c), "videos upsert");
      await writeChunked(
        rows.map((r) => ({ video_id: r.id, views: r.views })),
        (c) => db.from("view_snapshots").insert(c),
        "snapshots insert",
      );
      totalVideos += rows.length;
    }

    await db
      .from("channels")
      .update({ median_views: med, last_deep_at: new Date().toISOString() })
      .eq("id", ch.id);

    done++;
    process.stdout.write(
      `\rDEEP  → ${done} kanal · ${totalVideos} video · kota ${spent}/${BUDGET}   `,
    );
  }
  console.log(`\nDEEP  → ${done} kanal, ${totalVideos} video işlendi · kota ${spent}`);
}

// ───────────────────────── çalıştır ─────────────────────────

console.log(`Bütçe: ${BUDGET} birim\n`);
if (DO_LOAD) await phaseLoad();
if (DO_CHEAP) await phaseCheap();
if (DO_DEEP) await phaseDeep();
console.log(`\nToplam harcanan kota: ${spent} birim`);
