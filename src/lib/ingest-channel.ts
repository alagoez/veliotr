/**
 * Tek kanalı canlı indekse çek — onboarding (kendi kanalın) ve rakip ekleme
 * için ortak. ingest.mts'in çekirdek mantığının API-route sürümü.
 *
 * embed=true: videoların embedding'lerini de hesaplar/yazar ve döndürür
 * (kendi kanalın için — concept profili buradan çıkar). Rakip kanallarda
 * embed'i cron'a bırak (Velio'nun "yarın kontrol et" deseni).
 */
import { createAdminSupabase } from "@/lib/supabase/admin";
import { fetchChannelMeta, fetchChannelVideos, type YtChannelMeta } from "@/lib/youtube";
import { EMBED_DIM, EMBED_MODEL } from "@/config/ai";
import { isGeminiConfigured } from "@/lib/env";

const MIN_MEDIAN_BASE = 500;
const DAY = 86400000;

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.floor((s[mid - 1] + s[mid]) / 2);
}

export type IngestedVideo = {
  id: string;
  title: string;
  views: number;
  outlierScore: number;
  isShort: boolean;
  embedding?: number[];
};

export type IngestResult = {
  channel: YtChannelMeta;
  medianViews: number;
  videos: IngestedVideo[];
};

async function embedTitles(titles: string[]): Promise<(number[] | null)[]> {
  if (!isGeminiConfigured() || titles.length === 0) return titles.map(() => null);
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const out: (number[] | null)[] = [];
  for (let i = 0; i < titles.length; i += 50) {
    const res = await ai.models.embedContent({
      model: EMBED_MODEL,
      contents: titles.slice(i, i + 50).map((t) => t.slice(0, 1500)),
      config: { taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: EMBED_DIM },
    });
    for (const e of res.embeddings ?? []) out.push(e.values ?? null);
    while (out.length < Math.min(i + 50, titles.length)) out.push(null);
  }
  return out;
}

/**
 * Kanalı çek, skorla, Supabase'e yaz. embed=true ise video embedding'lerini de
 * hesaplayıp yazar. nicheSlug verilirse kanal o nişe etiketlenir (yoksa null).
 */
export async function ingestChannel(
  channelId: string,
  opts: { nicheSlug?: string | null; embed?: boolean; maxPages?: number } = {},
): Promise<IngestResult | null> {
  const db = createAdminSupabase();
  const meta = await fetchChannelMeta(channelId);
  if (!meta) return null;

  const vids = await fetchChannelVideos(meta.uploadsPlaylist, opts.maxPages ?? 2);
  const now = Date.now();

  const mature = vids.filter((v) => now - new Date(v.publishedAt).getTime() > 30 * DAY);
  const med = median((mature.length >= 10 ? mature : vids).map((v) => v.views));
  const scoreBase = med >= MIN_MEDIAN_BASE ? med : 0;

  await db.from("channels").upsert({
    id: meta.id,
    title: meta.title,
    handle: meta.handle,
    avatar_url: meta.avatarUrl,
    country: meta.country,
    niche_slug: opts.nicheSlug ?? null,
    subscribers: meta.subscribers,
    total_views: meta.totalViews,
    video_count: meta.videoCount,
    published_at: meta.publishedAt,
    uploads_playlist: meta.uploadsPlaylist,
    median_views: med,
    last_synced_at: new Date().toISOString(),
  });

  const embeddings = opts.embed ? await embedTitles(vids.map((v) => v.title)) : [];

  const rows = vids.map((v, i) => {
    const ageDays = Math.max((now - new Date(v.publishedAt).getTime()) / DAY, 1);
    const emb = embeddings[i];
    return {
      id: v.id,
      channel_id: meta.id,
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
      views_to_subs: meta.subscribers > 0 ? Math.round((v.views / meta.subscribers) * 100) / 100 : 0,
      ...(emb ? { embedding: JSON.stringify(emb) } : {}),
      updated_at: new Date().toISOString(),
    };
  });

  if (rows.length) {
    await db.from("videos").upsert(rows);
    await db.from("view_snapshots").insert(rows.map((r) => ({ video_id: r.id, views: r.views })));
  }

  return {
    channel: meta,
    medianViews: med,
    videos: vids.map((v, i) => ({
      id: v.id,
      title: v.title,
      views: v.views,
      outlierScore: scoreBase > 0 ? Math.round((v.views / scoreBase) * 10) / 10 : 0,
      isShort: v.durationSec > 0 && v.durationSec <= 62,
      embedding: embeddings[i] ?? undefined,
    })),
  };
}
