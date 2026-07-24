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

export function searchDemo(req: SearchRequest): SearchResponse {
  const { videos } = getDemoDataset();
  const f = req.filters;
  const q = f.q ? norm(f.q) : null;
  const [from, to] = dateCut(f.datePreset);
  const nowY = Date.now();

  let out = videos.filter((v) => {
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

  if (f.q) qb = qb.ilike("title", `%${f.q}%`);
  if (f.niche) qb = qb.eq("channels.niche_slug", f.niche);
  if (f.isShort !== undefined) qb = qb.eq("is_short", f.isShort);
  if (f.multiplier?.min !== undefined) qb = qb.gte("outlier_score", f.multiplier.min);
  if (f.multiplier?.max !== undefined) qb = qb.lte("outlier_score", f.multiplier.max);
  if (f.views?.min !== undefined) qb = qb.gte("views", f.views.min);
  if (f.views?.max !== undefined) qb = qb.lte("views", f.views.max);
  if (f.durationSec?.min !== undefined) qb = qb.gte("duration_sec", f.durationSec.min);
  if (f.durationSec?.max !== undefined) qb = qb.lte("duration_sec", f.durationSec.max);
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
  };
}

export async function search(req: SearchRequest): Promise<SearchResponse> {
  if (isSupabaseConfigured()) return searchSupabase(req);
  return searchDemo(req);
}
