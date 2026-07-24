import { getDemoDataset } from "@/lib/demo/data";
import { isSupabaseConfigured } from "@/lib/env";
import type {
  RangeFilter,
  SearchRequest,
  SearchResponse,
  Video,
} from "@/lib/types";

const PAGE_SIZE = 24;

function inRange(value: number, f?: RangeFilter): boolean {
  if (!f) return true;
  if (f.min !== undefined && value < f.min) return false;
  if (f.max !== undefined && value > f.max) return false;
  return true;
}

function dateCut(preset: SearchRequest["filters"]["datePreset"]): [number, number] {
  const now = Date.now();
  const DAY = 86400000;
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  switch (preset) {
    case "today":
      return [startOfToday, now];
    case "this-week":
      return [startOfToday - 6 * DAY, now];
    case "last-week":
      return [startOfToday - 13 * DAY, startOfToday - 6 * DAY];
    case "this-month":
      return [startOfToday - 29 * DAY, now];
    case "last-month":
      return [startOfToday - 59 * DAY, startOfToday - 29 * DAY];
    default:
      return [0, now];
  }
}

/** Basit TR-duyarlı normalizasyon (İ/ı sorunu için) */
function norm(s: string): string {
  return s.toLocaleLowerCase("tr-TR");
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** "Benzer videolar": başlıktan anlamlı anahtar kelimeler çıkar (TR stopword'süz). */
const TR_STOPWORDS = new Set([
  "ve", "ile", "için", "bir", "bu", "şu", "o", "ne", "nasıl", "neden", "en",
  "çok", "daha", "mi", "mı", "mu", "mü", "da", "de", "ki", "ya", "the", "a",
  "an", "of", "to", "in", "on", "for", "and", "or", "is", "are", "my", "your",
]);

export function extractKeywords(title: string, max = 3): string[] {
  return [...new Set(
    norm(title)
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !TR_STOPWORDS.has(w)),
  )]
    .sort((a, b) => b.length - a.length)
    .slice(0, max);
}

/** Tek video getir (player + benzer kaynağı için). */
export async function getVideoById(id: string): Promise<Video | null> {
  if (!isSupabaseConfigured()) {
    return getDemoDataset().videos.find((v) => v.id === id) ?? null;
  }
  const { createServerSupabase } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("videos")
    .select(
      "id, channel_id, title, thumb_url, published_at, duration_sec, is_short, views, likes, comments, engagement, outlier_score, views_per_day, views_to_subs, channels!inner(title, handle, subscribers, median_views, niche_slug)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const r = data as unknown as {
    id: string; channel_id: string; title: string; thumb_url: string | null;
    published_at: string; duration_sec: number; is_short: boolean;
    views: number; likes: number; comments: number; engagement: number;
    outlier_score: number; views_per_day: number; views_to_subs: number;
    channels: { title: string; handle: string; subscribers: number; median_views: number; niche_slug: string };
  };
  return {
    id: r.id,
    channelId: r.channel_id,
    channelTitle: r.channels.title,
    channelHandle: r.channels.handle,
    subscribers: r.channels.subscribers,
    medianViews: r.channels.median_views,
    nicheSlug: r.channels.niche_slug,
    title: r.title,
    thumbUrl: r.thumb_url,
    publishedAt: r.published_at,
    durationSec: r.duration_sec,
    isShort: r.is_short,
    views: r.views,
    likes: r.likes,
    comments: r.comments,
    engagement: r.engagement,
    outlierScore: r.outlier_score,
    viewsPerDay: r.views_per_day,
    viewsToSubs: r.views_to_subs,
  };
}

export function searchDemo(req: SearchRequest): SearchResponse {
  const { videos } = getDemoDataset();
  const f = req.filters;
  const q = f.q ? norm(f.q) : null;
  const [from, to] = dateCut(f.datePreset);
  const nowY = Date.now();

  // Benzer videolar modu: kaynak başlığından anahtar kelime eşleşmesi
  let similarSource: { id: string; title: string } | undefined;
  let similarKeywords: string[] = [];
  if (f.similarTo) {
    const src = videos.find((v) => v.id === f.similarTo);
    if (src) {
      similarSource = { id: src.id, title: src.title };
      similarKeywords = extractKeywords(src.title);
    }
  }

  let out = videos.filter((v) => {
    if (similarSource) {
      if (v.id === similarSource.id) return false;
      const t0 = norm(v.title);
      if (!similarKeywords.some((k) => t0.includes(k))) return false;
    }
    if (f.niche && v.nicheSlug !== f.niche) return false;
    if (f.isShort !== undefined && v.isShort !== f.isShort) return false;
    const t = new Date(v.publishedAt).getTime();
    if (t < from || t > to) return false;
    if (!inRange(v.outlierScore, f.multiplier)) return false;
    if (!inRange(v.views, f.views)) return false;
    if (!inRange(v.subscribers, f.subscribers)) return false;
    if (!inRange(v.durationSec, f.durationSec)) return false;
    if (!inRange(v.viewsToSubs, f.viewsToSubs)) return false;
    if (!inRange(v.medianViews, f.medianViews)) return false;
    if (!inRange(v.likes, f.likes)) return false;
    if (!inRange(v.comments, f.comments)) return false;
    if (!inRange(v.engagement * 100, f.engagement)) return false;
    const ageYears = (nowY - new Date(v.publishedAt).getTime()) / (365 * 86400000);
    void ageYears; // kanal yaşı kanal üzerinden; demo basitleştirmesi
    if (q && !norm(v.title).includes(q) && !norm(v.channelTitle).includes(q)) return false;
    if (f.includeKeywords?.length) {
      const t2 = norm(v.title);
      if (!f.includeKeywords.every((k) => t2.includes(norm(k)))) return false;
    }
    if (f.excludeKeywords?.length) {
      const t2 = norm(v.title);
      if (f.excludeKeywords.some((k) => t2.includes(norm(k)))) return false;
    }
    if (f.excludeChannels?.length) {
      if (f.excludeChannels.some((c) => norm(v.channelTitle).includes(norm(c)))) return false;
    }
    return true;
  });

  if (req.seed !== undefined) {
    out = seededShuffle(out, req.seed);
  } else {
    switch (req.sort) {
      case "outlier":
        out.sort((a, b) => b.outlierScore - a.outlierScore);
        break;
      case "upload-date":
        out.sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
        );
        break;
      case "relevance":
        // Demo: alaka = outlier * tazelik karışımı
        out.sort(
          (a, b) =>
            b.outlierScore * b.viewsPerDay - a.outlierScore * a.viewsPerDay,
        );
        break;
    }
  }

  const pageSize = req.pageSize ?? PAGE_SIZE;
  const start = req.page * pageSize;
  const slice = out.slice(start, start + pageSize);

  return {
    videos: slice,
    total: out.length,
    page: req.page,
    hasMore: start + pageSize < out.length,
    demo: true,
    similarSource,
  };
}

/**
 * Supabase modu: videos tablosuna aynı filtrelerle sorgu atar.
 * (RLS: videos herkese okunur; yazma yalnızca service-role — bkz. migration)
 */
export async function searchSupabase(req: SearchRequest): Promise<SearchResponse> {
  const { createServerSupabase } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabase();
  const f = req.filters;
  const pageSize = req.pageSize ?? PAGE_SIZE;
  const from = req.page * pageSize;

  let qb = supabase
    .from("videos")
    .select(
      "id, channel_id, title, thumb_url, published_at, duration_sec, is_short, views, likes, comments, engagement, outlier_score, views_per_day, views_to_subs, channels!inner(title, handle, subscribers, median_views, niche_slug)",
      { count: "exact" },
    );

  // Benzer videolar modu
  let similarSource: { id: string; title: string } | undefined;
  if (f.similarTo) {
    const src = await getVideoById(f.similarTo);
    if (src) {
      similarSource = { id: src.id, title: src.title };
      const kws = extractKeywords(src.title).map((k) => k.replace(/[%,()"]/g, ""));
      if (kws.length) {
        qb = qb.or(kws.map((k) => `title.ilike.%${k}%`).join(","));
      }
      qb = qb.neq("id", src.id);
    }
  }

  if (f.q) qb = qb.ilike("title", `%${f.q}%`);
  if (f.niche) qb = qb.eq("channels.niche_slug", f.niche);
  if (f.isShort !== undefined) qb = qb.eq("is_short", f.isShort);

  const applyRange = (column: string, range?: { min?: number; max?: number }) => {
    if (range?.min !== undefined) qb = qb.gte(column, range.min);
    if (range?.max !== undefined) qb = qb.lte(column, range.max);
  };
  applyRange("outlier_score", f.multiplier);
  applyRange("views", f.views);
  applyRange("duration_sec", f.durationSec);
  applyRange("views_to_subs", f.viewsToSubs);
  applyRange("likes", f.likes);
  applyRange("comments", f.comments);
  applyRange("engagement", f.engagement ? { min: f.engagement.min === undefined ? undefined : f.engagement.min / 100, max: f.engagement.max === undefined ? undefined : f.engagement.max / 100 } : undefined);
  applyRange("channels.subscribers", f.subscribers);
  applyRange("channels.median_views", f.medianViews);
  applyRange("channels.total_views", f.channelTotalViews);
  applyRange("channels.video_count", f.channelVideoCount);
  if (f.includeKeywords?.length) {
    for (const keyword of f.includeKeywords) qb = qb.ilike("title", `%${keyword}%`);
  }
  if (f.excludeKeywords?.length) {
    for (const keyword of f.excludeKeywords) qb = qb.not("title", "ilike", `%${keyword}%`);
  }
  if (f.excludeChannels?.length) {
    for (const channel of f.excludeChannels) qb = qb.not("channels.title", "ilike", `%${channel}%`);
  }
  const [dFrom, dTo] = dateCut(f.datePreset);
  if (dFrom > 0) qb = qb.gte("published_at", new Date(dFrom).toISOString());
  qb = qb.lte("published_at", new Date(dTo).toISOString());

  switch (req.sort) {
    case "outlier":
      qb = qb.order("outlier_score", { ascending: false });
      break;
    case "upload-date":
      qb = qb.order("published_at", { ascending: false });
      break;
    default:
      qb = qb.order("views_per_day", { ascending: false });
  }

  const { data, error, count } = await qb.range(from, from + pageSize - 1);
  if (error) throw new Error(`Arama hatası: ${error.message}`);

  type Row = {
    id: string; channel_id: string; title: string; thumb_url: string | null;
    published_at: string; duration_sec: number; is_short: boolean;
    views: number; likes: number; comments: number; engagement: number;
    outlier_score: number; views_per_day: number; views_to_subs: number;
    channels: { title: string; handle: string; subscribers: number; median_views: number; niche_slug: string };
  };

  const videos: Video[] = ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    channelId: r.channel_id,
    channelTitle: r.channels.title,
    channelHandle: r.channels.handle,
    subscribers: r.channels.subscribers,
    medianViews: r.channels.median_views,
    nicheSlug: r.channels.niche_slug,
    title: r.title,
    thumbUrl: r.thumb_url,
    publishedAt: r.published_at,
    durationSec: r.duration_sec,
    isShort: r.is_short,
    views: r.views,
    likes: r.likes,
    comments: r.comments,
    engagement: r.engagement,
    outlierScore: r.outlier_score,
    viewsPerDay: r.views_per_day,
    viewsToSubs: r.views_to_subs,
  }));

  return {
    videos,
    total: count ?? videos.length,
    page: req.page,
    hasMore: from + pageSize < (count ?? 0),
    demo: false,
    similarSource,
  };
}

export async function search(req: SearchRequest): Promise<SearchResponse> {
  if (isSupabaseConfigured()) return searchSupabase(req);
  return searchDemo(req);
}
