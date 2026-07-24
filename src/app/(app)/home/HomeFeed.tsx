"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Shuffle, SlidersHorizontal } from "lucide-react";
import { FilterPanel } from "@/components/app/FilterPanel";
import { VideoCard } from "@/components/app/VideoCard";
import { fmtPlain } from "@/lib/format";
import type {
  SearchFilters,
  SearchResponse,
  SearchSort,
  Video,
} from "@/lib/types";

const SORTS: { v: SearchSort; label: string }[] = [
  { v: "outlier", label: "Outlier skoru" },
  { v: "upload-date", label: "Yükleme tarihi" },
  { v: "relevance", label: "Alaka" },
];

export function HomeFeed() {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sort, setSort] = useState<SearchSort>("outlier");
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [videos, setVideos] = useState<Video[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [qInput, setQInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(
    async (
      f: SearchFilters,
      s: SearchSort,
      p: number,
      sd: number | undefined,
      append: boolean,
    ) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      if (!append) setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters: f, sort: s, page: p, seed: sd }),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(j?.error ?? `İstek başarısız (${res.status})`);
        }
        const data = (await res.json()) as SearchResponse;
        setVideos((prev) => (append ? [...prev, ...data.videos] : data.videos));
        setTotal(data.total);
        setPage(data.page);
        setHasMore(data.hasMore);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError((e as Error).message);
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Filtre/sıralama değişince baştan yükle (debounce)
  useEffect(() => {
    const t = setTimeout(() => fetchPage(filters, sort, 0, seed, false), 250);
    return () => clearTimeout(t);
  }, [filters, sort, seed, fetchPage]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSeed(undefined);
    setFilters((f) => ({ ...f, q: qInput.trim() || undefined }));
  };

  return (
    <div className="app-feed mx-auto flex max-w-[1520px] gap-7 px-6 py-7 max-lg:flex-col">
      {/* Filtre paneli */}
      <div className={`${showFilters ? "" : "max-lg:hidden"}`}>
        <FilterPanel
          filters={filters}
          onChange={(f) => {
            setSeed(undefined);
            setFilters(f);
          }}
        />
      </div>

      <div className="min-w-0 flex-1">
        {/* Üst çubuk */}
        <div className="app-toolbar flex flex-wrap items-center gap-2.5">
          <form onSubmit={submitSearch} className="relative min-w-0 flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
            />
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Fikir, konu veya kanal ara... (örn: 'temettü', 'kamp', 'rank')"
              className="search-command w-full rounded-2xl border border-edge bg-surface py-3 pl-10 pr-3 text-sm outline-none placeholder:text-faint focus:border-brand/60"
            />
          </form>

          <select
            value={sort}
            onChange={(e) => {
              setSeed(undefined);
              setSort(e.target.value as SearchSort);
            }}
            className="rounded-xl border border-edge bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand/60"
          >
            {SORTS.map((s) => (
              <option key={s.v} value={s.v}>
                {s.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setSeed(Math.floor(Math.random() * 1e9))}
            className="flex items-center gap-1.5 rounded-xl border border-edge bg-surface px-3 py-2.5 text-sm text-muted transition-colors hover:text-ink"
            title="Rastgele karıştır"
          >
            <Shuffle size={15} />
          </button>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-edge bg-surface px-3 py-2.5 text-sm text-muted transition-colors hover:text-ink lg:hidden"
          >
            <SlidersHorizontal size={15} />
            Filtreler
          </button>
        </div>

        {/* Sonuç sayısı */}
        <p className="mt-3 text-xs text-faint">
          {loading ? "Aranıyor..." : `${fmtPlain(total)} video bulundu`}
        </p>

        {/* Hata */}
        {error && (
          <div className="mt-4 rounded-xl border border-warn/30 bg-warn/10 p-4 text-sm text-warn">
            {error}
          </div>
        )}

        {/* Izgara */}
        {loading ? (
          <div className="video-grid mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[4/3] rounded-xl" />
            ))}
          </div>
        ) : videos.length === 0 && !error ? (
          <div className="mt-16 text-center">
            <p className="text-lg font-medium">Sonuç yok</p>
            <p className="mt-1 text-sm text-muted">
              Filtreleri genişletmeyi veya farklı bir anahtar kelime denemeyi düşün.
            </p>
          </div>
        ) : (
          <div className="video-grid mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        )}

        {/* Daha fazla */}
        {hasMore && !loading && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => fetchPage(filters, sort, page + 1, seed, true)}
              className="rounded-xl border border-edge bg-surface px-6 py-2.5 text-sm font-medium text-muted transition-colors hover:border-brand/50 hover:text-ink"
            >
              Daha fazla yükle
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
