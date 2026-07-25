export type Niche = {
  id: number;
  slug: string;
  name: string;
};

export type Channel = {
  id: string;
  title: string;
  handle: string;
  avatarUrl: string | null;
  nicheSlug: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  publishedAt: string; // ISO
  medianViews: number;
};

export type Video = {
  id: string;
  channelId: string;
  channelTitle: string;
  channelHandle: string;
  subscribers: number;
  medianViews: number;
  nicheSlug: string;
  title: string;
  thumbUrl: string | null;
  publishedAt: string; // ISO
  durationSec: number;
  isShort: boolean;
  views: number;
  likes: number;
  comments: number;
  engagement: number; // (likes+comments)/views
  outlierScore: number; // views / channel median
  viewsPerDay: number;
  viewsToSubs: number;
};

export type RangeFilter = { min?: number; max?: number };

export type SearchFilters = {
  q?: string;
  niche?: string;
  isShort?: boolean;
  datePreset?:
    | "today"
    | "this-week"
    | "last-week"
    | "this-month"
    | "last-month"
    | "all";
  multiplier?: RangeFilter;
  views?: RangeFilter;
  subscribers?: RangeFilter;
  durationSec?: RangeFilter;
  viewsToSubs?: RangeFilter;
  medianViews?: RangeFilter;
  channelTotalViews?: RangeFilter;
  channelVideoCount?: RangeFilter;
  likes?: RangeFilter;
  comments?: RangeFilter;
  engagement?: RangeFilter;
  channelAgeYears?: RangeFilter;
  includeKeywords?: string[];
  excludeKeywords?: string[];
  excludeChannels?: string[];
  /** Bu video ID'sine benzer videoları getir ("Benzer videoları gör") */
  similarTo?: string;
  /** Birebir↔Geniş: 0 = tam eşleşme, 1 = tamamen anlamsal (Gemini embedding) */
  semanticBlend?: number;
};

export type SearchSort = "outlier" | "upload-date" | "relevance";

export type SearchRequest = {
  filters: SearchFilters;
  sort: SearchSort;
  page: number; // 0 tabanlı
  pageSize?: number;
  seed?: number; // rastgele butonu için
  /** Dahili: sonuçları bu ID kümesiyle sınırla (semantik arama; API'den gelmez) */
  idSet?: string[];
};

export type SearchResponse = {
  videos: Video[];
  total: number;
  page: number;
  hasMore: boolean;
  demo: boolean;
  /** similarTo istendiyse kaynak video bilgisi */
  similarSource?: { id: string; title: string };
};

export type Folder = {
  id: string;
  name: string;
  createdAt: string;
};

export type SavedVideo = {
  id: string;
  folderId: string;
  video: Video;
  note?: string;
  tags: string[];
  createdAt: string;
};

export type TrackedChannel = {
  id: string;
  channel: Channel;
  listName?: string;
  createdAt: string;
};

export type AppNotification = {
  id: string;
  type: "viral-alert" | "system";
  title: string;
  body: string;
  videoId?: string;
  readAt?: string;
  createdAt: string;
};

export type ChatMessage = {
  role: "user" | "model";
  content: string;
};
