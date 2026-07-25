/**
 * Viralab ingestion — YouTube Data API v3'ten kanal + video verisi çeker,
 * outlier skorlarını hesaplar ve Supabase'e yazar. (plan.md §4.3)
 *
 * Modlar:
 *   INGEST_MODE=mock  → API anahtarı gerekmez; demo veri setini Supabase'e basar
 *   INGEST_MODE=live  → YOUTUBE_API_KEY ile gerçek veri çeker (varsayılan)
 *
 * Gerekli env (live): YOUTUBE_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Çalıştırma: npm run ingest   (GitHub Actions: .github/workflows/ingest.yml)
 *
 * Kota tasarımı: search.list (100 birim) KULLANILMAZ.
 *   channels.list (1) → playlistItems.list (1/50) → videos.list (1/50)
 *   ≈ tek anahtarla ~500K video istatistiği/gün.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MODE =
  process.env.INGEST_MODE === "mock" || process.argv.includes("--mock")
    ? "mock"
    : "live";

/** Çarpan hesabı için minimum kanal medyanı — altındaki kanallarda skor 0 kalır. */
const MIN_MEDIAN_BASE = 500;
const API = "https://www.googleapis.com/youtube/v3";
const KEY = process.env.YOUTUBE_API_KEY;

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (.env / Actions secrets).",
    );
  }
  return createClient(url, key);
}

// ---------- yardımcılar ----------

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.floor((s[mid - 1] + s[mid]) / 2);
}

/** ISO8601 süre (PT1H2M3S) → saniye */
function parseDuration(iso: string): number {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso ?? "");
  if (!m) return 0;
  return (Number(m[1] ?? 0) * 3600) + (Number(m[2] ?? 0) * 60) + Number(m[3] ?? 0);
}

async function withRetry<T>(operation: () => PromiseLike<T>, label: string, attempts = 5): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await operation(); }
    catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 800 * attempt * attempt));
    }
  }
  throw new Error(`${label} başarısız: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function dbWrite(operation: () => PromiseLike<{ error: { message: string } | null }>, label: string) {
  // Supabase timeout'u exception değil `error` alanı olarak döner; hatayı
  // exception'a çevirip withRetry'ın geri çekilmesinden faydalan.
  await withRetry(async () => {
    const result = await operation();
    if (result.error) throw new Error(result.error.message);
    return result;
  }, label);
}

/**
 * videos tablosunda HNSW embedding indeksi var; büyük upsert'ler indeks
 * güncellemesi yüzünden statement timeout'a düşüyor. Küçük partiler + retry
 * ile yaz (bulk-load deseninin ingest karşılığı).
 */
const WRITE_CHUNK = 20;
async function dbWriteChunked<T>(
  rows: T[],
  fn: (chunk: T[]) => PromiseLike<{ error: { message: string } | null }>,
  label: string,
) {
  for (let i = 0; i < rows.length; i += WRITE_CHUNK) {
    const chunk = rows.slice(i, i + WRITE_CHUNK);
    await dbWrite(() => fn(chunk), `${label} [${i}-${i + chunk.length}]`);
  }
}

async function yt<T>(path: string, params: Record<string, string>): Promise<T> {
  return withRetry(async () => {
    const qs = new URLSearchParams({ ...params, key: KEY! });
    const res = await fetch(`${API}/${path}?${qs}`);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`YouTube API ${path} ${res.status}: ${body.slice(0, 300)}`);
    }
    return res.json() as Promise<T>;
  }, `YouTube ${path}`);
}

type YtChannel = {
  id: string;
  snippet: { title: string; customUrl?: string; country?: string; publishedAt: string; thumbnails?: { default?: { url: string } } };
  statistics: { subscriberCount?: string; viewCount?: string; videoCount?: string };
  contentDetails: { relatedPlaylists: { uploads: string } };
};

type YtPlaylistItem = { contentDetails: { videoId: string } };

type YtVideo = {
  id: string;
  snippet: { title: string; publishedAt: string; channelId: string; thumbnails?: { medium?: { url: string } } };
  statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
  contentDetails: { duration: string };
};

// ---------- canlı mod ----------

async function ingestLive() {
  if (!KEY) throw new Error("YOUTUBE_API_KEY gerekli (live mod).");
  const db = supa();

  const seedPath = join(process.cwd(), "seeds", "channels.json");
  const seeds = JSON.parse(readFileSync(seedPath, "utf8")) as {
    niche: string;
    channelIds: string[];
  }[];

  let totalVideos = 0;

  for (const seed of seeds) {
    // Kanal meta (50'li partiler — 1 birim/parti)
    for (let i = 0; i < seed.channelIds.length; i += 50) {
      const batch = seed.channelIds.slice(i, i + 50);
      const chRes = await yt<{ items: YtChannel[] }>("channels", {
        part: "snippet,statistics,contentDetails",
        id: batch.join(","),
        maxResults: "50",
      });

      for (const ch of chRes.items ?? []) {
        const uploads = ch.contentDetails.relatedPlaylists.uploads;

        // Video ID'leri (son ~100 video — 2 sayfa)
        const videoIds: string[] = [];
        let pageToken: string | undefined;
        for (let p = 0; p < 2; p++) {
          const plRes = await yt<{ items: YtPlaylistItem[]; nextPageToken?: string }>(
            "playlistItems",
            {
              part: "contentDetails",
              playlistId: uploads,
              maxResults: "50",
              ...(pageToken ? { pageToken } : {}),
            },
          );
          videoIds.push(...(plRes.items ?? []).map((x) => x.contentDetails.videoId));
          pageToken = plRes.nextPageToken;
          if (!pageToken) break;
        }

        // İstatistikler (50'li toplu — 1 birim/parti)
        const vids: YtVideo[] = [];
        for (let v = 0; v < videoIds.length; v += 50) {
          const vRes = await yt<{ items: YtVideo[] }>("videos", {
            part: "snippet,statistics,contentDetails",
            id: videoIds.slice(v, v + 50).join(","),
            maxResults: "50",
          });
          vids.push(...(vRes.items ?? []));
        }

        // Outlier skorlama (plan.md §4.3)
        const now = Date.now();
        const DAY = 86400000;
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
        const mature = parsed.filter(
          (v) => now - new Date(v.publishedAt).getTime() > 30 * DAY,
        );
        const med = median((mature.length >= 10 ? mature : parsed).map((v) => v.views));
        const subs = Number(ch.statistics.subscriberCount ?? 0);
        // Medyan tabanı: çok düşük medyanlı kanallarda (ör. 200 izlenme) çarpan
        // anlamsız şişer (5000x) ve sıralamayı kirletir → skor bazı yoksa 0.
        const scoreBase = med >= MIN_MEDIAN_BASE ? med : 0;

        await dbWrite(() => db.from("channels").upsert({
          id: ch.id,
          title: ch.snippet.title,
          handle: ch.snippet.customUrl ?? null,
          avatar_url: ch.snippet.thumbnails?.default?.url ?? null,
          country: ch.snippet.country ?? null,
          niche_slug: seed.niche,
          subscribers: subs,
          total_views: Number(ch.statistics.viewCount ?? 0),
          video_count: Number(ch.statistics.videoCount ?? 0),
          published_at: ch.snippet.publishedAt,
          uploads_playlist: uploads,
          median_views: med,
          last_synced_at: new Date().toISOString(),
        }), "channel upsert");

        const rows = parsed.map((v) => {
          const ageDays = Math.max((now - new Date(v.publishedAt).getTime()) / DAY, 1);
          return {
            id: v.id,
            channel_id: ch.id,
            title: v.title,
            thumb_url: v.thumbUrl,
            published_at: v.publishedAt,
            duration_sec: v.durationSec,
            is_short: v.durationSec > 0 && v.durationSec <= 62,
            views: v.views,
            likes: v.likes,
            comments: v.comments,
            engagement: v.views > 0 ? (v.likes + v.comments) / v.views : 0,
            outlier_score: scoreBase > 0 ? Math.round((v.views / scoreBase) * 10) / 10 : 0,
            views_per_day: Math.round(v.views / ageDays),
            views_to_subs: subs > 0 ? Math.round((v.views / subs) * 100) / 100 : 0,
            updated_at: new Date().toISOString(),
          };
        });
        if (rows.length) {
          await dbWriteChunked(rows, (chunk) => db.from("videos").upsert(chunk), "videos upsert");
          await dbWriteChunked(
            rows.map((r) => ({ video_id: r.id, views: r.views })),
            (chunk) => db.from("view_snapshots").insert(chunk),
            "view snapshots insert",
          );
        }
        totalVideos += rows.length;
        console.log(`✓ ${ch.snippet.title}: ${rows.length} video (medyan ${med})`);
      }
    }
  }
  console.log(`\nBitti — toplam ${totalVideos} video işlendi.`);
}

// ---------- mock mod ----------

async function ingestMock() {
  const db = supa();
  // Demo veri üretecini yeniden kullan (tsx TS'i doğrudan çözer)
  const { getDemoDataset, NICHES } = await import("../src/lib/demo/data");
  const { channels, videos } = getDemoDataset();

  await dbWrite(() => db.from("niches").upsert(
    NICHES.map((n, i) => ({ id: i + 1, slug: n.slug, name: n.name })),
    { onConflict: "slug" },
  ), "niches upsert");

  await dbWrite(() => db.from("channels").upsert(
    channels.map((c) => ({
      id: c.id,
      title: c.title,
      handle: c.handle,
      niche_slug: c.nicheSlug,
      subscribers: c.subscribers,
      total_views: c.totalViews,
      video_count: c.videoCount,
      published_at: c.publishedAt,
      median_views: c.medianViews,
      last_synced_at: new Date().toISOString(),
    })),
  ), "channels upsert");

  for (let i = 0; i < videos.length; i += 500) {
    const batch = videos.slice(i, i + 500);
    await dbWrite(() => db.from("videos").upsert(
      batch.map((v) => ({
        id: v.id,
        channel_id: v.channelId,
        title: v.title,
        published_at: v.publishedAt,
        duration_sec: v.durationSec,
        is_short: v.isShort,
        views: v.views,
        likes: v.likes,
        comments: v.comments,
        engagement: v.engagement,
        outlier_score: v.outlierScore,
        views_per_day: Math.round(v.viewsPerDay),
        views_to_subs: Math.round(v.viewsToSubs * 100) / 100,
        updated_at: new Date().toISOString(),
      })),
    ), "videos upsert");
  }
  console.log(`Mock veri basıldı: ${channels.length} kanal, ${videos.length} video.`);
}

// ---------- giriş ----------

(MODE === "mock" ? ingestMock() : ingestLive()).catch((e) => {
  console.error("Ingestion hatası:", e);
  process.exit(1);
});
