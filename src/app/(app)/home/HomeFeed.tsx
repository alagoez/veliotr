"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Shuffle, SlidersHorizontal, X } from "lucide-react";
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
  { v: "outlier", label: "Outlier" },
  { v: "upload-date", label: "Yeni" },
  { v: "relevance", label: "Alaka" },
];

type Props = {
  /** Kilitli başlangıç filtreleri (örn. Shorts görünümü: { isShort: true }) */
  initialFilters?: SearchFilters;
  heading?: string;
  subheading?: string;
};

export function HomeFeed({ initialFilters, heading, subheading }: Props = {}) {
  const params = useSearchParams();
  const similarParam = params.get("similar") ?? undefined;
  const [filters, setFilters] = useState<SearchFilters>({
    ...initialFilters,
    similarTo: similarParam,
  });
  const [similarSource, setSimilarSource] = useState<{ id: string; title: string } | null>(null);
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
  const searchRef = useRef<HTMLInputElement>(null);

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
        setSimilarSource(data.similarSource ?? null);
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

  // ⌘K / Ctrl+K → aramaya odaklan
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSeed(undefined);
    setFilters((f) => ({ ...f, q: qInput.trim() || undefined }));
  };

  const clearSimilar = () => {
    setSimilarSource(null);
    setFilters((f) => ({ ...f, similarTo: undefined }));
    window.history.replaceState(null, "", window.location.pathname);
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
        {heading && (
          <div className="mb-3">
            <h1 className="font-display text-2xl font-bold tracking-tight">{heading}</h1>
            {subheading && <p className="mt-1 text-sm text-muted">{subheading}</p>}
          </div>
        )}

        {/* Araç çubuğu */}
        <div className="app-toolbar flex flex-wrap items-center gap-2.5">
          <form onSubmit={submitSearch} className="relative min-w-[220px] flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
            />
            <input
              ref={searchRef}
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Fikir, konu veya kanal ara..."
              className="search-command w-full rounded-2xl border border-edge bg-surface py-3 pl-10 pr-14 outline-none placeholder:text-faint focus:border-brand/60"
            />
            <span className="kbd">⌘K</span>
          </form>

          <div className="segmented" role="group" aria-label="Sıralama">
            {SORTS.map((s) => (
              <button
                key={s.v}
                aria-pressed={sort === s.v}
                onClick={() => {
                  setSeed(undefined);
                  setSort(s.v);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setSeed(Math.floor(Math.random() * 1e9))}
            className="icon-btn"
            title="Rastgele karıştır"
          >
            <Shuffle size={15} className="spin-on-hover" />
          </button>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className="icon-btn lg:hidden"
          >
            <SlidersHorizontal size={15} />
            Filtreler
          </button>
        </div>

        {/* Sonuç satırı */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-faint">
          <span className="live-dot" aria-hidden />
          {loading ? (
            "İndeks taranıyor..."
          ) : (
            <>
              <span className="num text-muted">{fmtPlain(total)}</span> video
              {filters.q && (
                <>
                  <span>·</span>
                  <span className="text-muted">&quot;{filters.q}&quot;</span>
                </>
              )}
            </>
          )}
          {similarSource && (
            <button onClick={clearSimilar} className="chip !text-glow" title="Benzer modundan çık">
              Benzerleri: &quot;{similarSource.title.slice(0, 42)}
              {similarSource.title.length > 42 ? "…" : ""}&quot;
              <X size={11} />
            </button>
          )}
        </div>

        {/* Hata */}
        {error && (
          <div className="glass-panel mt-4 border-warn/30 p-4 text-sm text-warn">
            {error}
          </div>
        )}

        {/* Izgara */}
        {loading ? (
          <div className="video-grid mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[4/3] rounded-2xl" />
            ))}
          </div>
        ) : videos.length === 0 && !error ? (
          <div className="mt-20 flex flex-col items-center text-center">
            <div className="radar-empty" aria-hidden />
            <p className="mt-5 font-display text-lg font-semibold">Radar temiz — sonuç yok</p>
            <p className="mt-1 max-w-xs text-sm text-muted">
              Filtreleri gevşetmeyi veya farklı bir anahtar kelime denemeyi düşün.
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
          <div className="mt-7 flex justify-center">
            <button
              onClick={() => fetchPage(filters, sort, page + 1, seed, true)}
              className="icon-btn px-7"
            >
              Daha fazla yükle
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
