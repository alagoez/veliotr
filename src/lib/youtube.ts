/**
 * YouTube Data API yardımcıları — sunucu tarafı (API route'ları).
 * Kanal çözümleme (URL/@handle/ID) + kanal & video çekimi.
 * Kota tasarımı: search'ten kaçın; channels.list(forHandle/forUsername) ucuz.
 */
const API = "https://www.googleapis.com/youtube/v3";

function key(): string {
  const k = process.env.YOUTUBE_API_KEY;
  if (!k) throw new Error("YOUTUBE_API_KEY tanımlı değil.");
  return k;
}

export async function ytApi<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ ...params, key: key() });
  const res = await fetch(`${API}/${path}?${qs}`);
  if (!res.ok) {
    throw new Error(`YouTube API ${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

/** ISO8601 süre (PT1H2M3S) → saniye */
export function parseDurationSec(iso: string): number {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso ?? "");
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

type ChannelListResp = { items?: { id: string }[] };

/**
 * Kullanıcı girdisini (URL, @handle veya kanal ID) → kanal ID'sine çevir.
 * Desteklenen: youtube.com/channel/UC..., /@handle, /c/isim, /user/isim,
 * çıplak @handle, çıplak UC... ID.
 */
export async function resolveChannelId(input: string): Promise<string | null> {
  const raw = input.trim();
  if (!raw) return null;

  // Doğrudan kanal ID
  if (/^UC[A-Za-z0-9_-]{22}$/.test(raw)) return raw;

  // /channel/UC... URL'i
  const chMatch = /youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})/.exec(raw);
  if (chMatch) return chMatch[1];

  // @handle (URL içinde veya çıplak)
  const handleMatch = /(?:youtube\.com\/)?@([A-Za-z0-9._-]+)/.exec(raw);
  if (handleMatch) {
    const r = await ytApi<ChannelListResp>("channels", {
      part: "id",
      forHandle: "@" + handleMatch[1],
    });
    if (r.items?.[0]?.id) return r.items[0].id;
  }

  // /user/isim (eski)
  const userMatch = /youtube\.com\/user\/([A-Za-z0-9._-]+)/.exec(raw);
  if (userMatch) {
    const r = await ytApi<ChannelListResp>("channels", {
      part: "id",
      forUsername: userMatch[1],
    });
    if (r.items?.[0]?.id) return r.items[0].id;
  }

  // /c/isim veya diğer özel URL'ler → arama (100 birim, son çare)
  const cMatch = /youtube\.com\/c\/([A-Za-z0-9._-]+)/.exec(raw);
  const query = cMatch?.[1] ?? (handleMatch ? handleMatch[1] : raw);
  const sr = await ytApi<{ items?: { snippet: { channelId: string } }[] }>("search", {
    part: "snippet",
    type: "channel",
    q: query,
    maxResults: "1",
  });
  return sr.items?.[0]?.snippet.channelId ?? null;
}

/** Video linkinden video ID'si (kanalını değil, videonun kanalını bulmak için) */
export function parseVideoId(input: string): string | null {
  const m =
    /(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{11})/.exec(input) ??
    (/^[A-Za-z0-9_-]{11}$/.test(input.trim()) ? [null, input.trim()] : null);
  return m ? m[1] : null;
}

export type YtChannelMeta = {
  id: string;
  title: string;
  handle: string | null;
  avatarUrl: string | null;
  country: string | null;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  publishedAt: string;
  uploadsPlaylist: string;
};

export async function fetchChannelMeta(channelId: string): Promise<YtChannelMeta | null> {
  const r = await ytApi<{
    items?: {
      id: string;
      snippet: { title: string; customUrl?: string; country?: string; publishedAt: string; thumbnails?: { default?: { url: string } } };
      statistics: { subscriberCount?: string; viewCount?: string; videoCount?: string };
      contentDetails: { relatedPlaylists: { uploads: string } };
    }[];
  }>("channels", { part: "snippet,statistics,contentDetails", id: channelId });
  const ch = r.items?.[0];
  if (!ch) return null;
  return {
    id: ch.id,
    title: ch.snippet.title,
    handle: ch.snippet.customUrl ?? null,
    avatarUrl: ch.snippet.thumbnails?.default?.url ?? null,
    country: ch.snippet.country ?? null,
    subscribers: Number(ch.statistics.subscriberCount ?? 0),
    totalViews: Number(ch.statistics.viewCount ?? 0),
    videoCount: Number(ch.statistics.videoCount ?? 0),
    publishedAt: ch.snippet.publishedAt,
    uploadsPlaylist: ch.contentDetails.relatedPlaylists.uploads,
  };
}

export async function fetchChannelIdOfVideo(videoId: string): Promise<string | null> {
  const r = await ytApi<{ items?: { snippet: { channelId: string } }[] }>("videos", {
    part: "snippet",
    id: videoId,
  });
  return r.items?.[0]?.snippet.channelId ?? null;
}

export type YtVideo = {
  id: string;
  title: string;
  publishedAt: string;
  thumbUrl: string | null;
  durationSec: number;
  views: number;
  likes: number;
  comments: number;
};

/** Kanalın son N videosunu (istatistikleriyle) çek. */
export async function fetchChannelVideos(
  uploadsPlaylist: string,
  maxPages = 2,
): Promise<YtVideo[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  for (let p = 0; p < maxPages; p++) {
    const pl = await ytApi<{ items?: { contentDetails: { videoId: string } }[]; nextPageToken?: string }>(
      "playlistItems",
      { part: "contentDetails", playlistId: uploadsPlaylist, maxResults: "50", ...(pageToken ? { pageToken } : {}) },
    );
    ids.push(...(pl.items ?? []).map((x) => x.contentDetails.videoId));
    pageToken = pl.nextPageToken;
    if (!pageToken) break;
  }

  const out: YtVideo[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const vr = await ytApi<{
      items?: {
        id: string;
        snippet: { title: string; publishedAt: string; thumbnails?: { medium?: { url: string } } };
        statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
        contentDetails: { duration: string };
      }[];
    }>("videos", { part: "snippet,statistics,contentDetails", id: ids.slice(i, i + 50).join(",") });
    for (const v of vr.items ?? []) {
      out.push({
        id: v.id,
        title: v.snippet.title,
        publishedAt: v.snippet.publishedAt,
        thumbUrl: v.snippet.thumbnails?.medium?.url ?? null,
        durationSec: parseDurationSec(v.contentDetails.duration),
        views: Number(v.statistics.viewCount ?? 0),
        likes: Number(v.statistics.likeCount ?? 0),
        comments: Number(v.statistics.commentCount ?? 0),
      });
    }
  }
  return out;
}
