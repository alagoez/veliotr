"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radar, Trash2, TrendingUp, Plus, Loader2 } from "lucide-react";
import { fmtCompact } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { SearchResponse, Video } from "@/lib/types";

type TrackResult = {
  channel?: { id: string; title: string; handle: string | null; subscribers: number; medianViews: number };
  videoCount?: number;
  message?: string;
  error?: string;
};

export function SavedChannels() {
  const store = useStore();
  const [viralByChannel, setViralByChannel] = useState<Record<string, Video[]>>({});
  const [addUrl, setAddUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const addChannel = async () => {
    if (!addUrl.trim() || adding) return;
    setAdding(true);
    setAddMsg(null);
    try {
      const res = await fetch("/api/track-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: addUrl.trim() }),
      });
      const data = (await res.json()) as TrackResult;
      if (!res.ok || !data.channel) {
        setAddMsg({ ok: false, text: data.message ?? "Kanal eklenemedi." });
        return;
      }
      store.trackChannel({
        id: data.channel.id,
        title: data.channel.title,
        handle: data.channel.handle ?? "",
        avatarUrl: null,
        nicheSlug: "",
        subscribers: data.channel.subscribers,
        totalViews: 0,
        videoCount: data.videoCount ?? 0,
        publishedAt: new Date().toISOString(),
        medianViews: data.channel.medianViews,
      });
      setAddMsg({ ok: true, text: data.message ?? "Kanal eklendi." });
      setAddUrl("");
    } catch {
      setAddMsg({ ok: false, text: "Bağlantı hatası — tekrar dene." });
    } finally {
      setAdding(false);
    }
  };

  // Takip edilen kanalların taze outlier'larını kontrol et (uyarı önizlemesi)
  useEffect(() => {
    if (!store.hydrated || store.tracked.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filters: { multiplier: { min: store.alertThreshold }, datePreset: "this-month" },
            sort: "outlier",
            page: 0,
            pageSize: 48,
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as SearchResponse;
        if (cancelled) return;
        const ids = new Set(store.tracked.map((t) => t.channel.id));
        const map: Record<string, Video[]> = {};
        for (const v of data.videos) {
          if (ids.has(v.channelId)) {
            (map[v.channelId] ??= []).push(v);
          }
        }
        setViralByChannel(map);
      } catch {
        // sessiz geç — önizleme kritik değil
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store.hydrated, store.tracked, store.alertThreshold]);

  return (
    <div className="mx-auto max-w-[1000px] px-5 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Kanallarım</h1>
          <p className="mt-1 text-sm text-muted">
            Rakiplerini tek yerden izle — viral video çıkınca haberin olsun.
          </p>
        </div>
        <Link
          href="/alerts/manage"
          className="rounded-xl border border-edge bg-surface px-4 py-2 text-sm text-muted transition-colors hover:text-ink"
        >
          Uyarıları yönet
        </Link>
      </div>

      {/* Rakip ekle — canlı indekse çeker (her nişin dolması bu) */}
      <div className="mt-5">
        <div className="flex gap-2">
          <input
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addChannel()}
            placeholder="Rakip kanal / video linki veya @kullanıcı adı yapıştır..."
            className="search-command w-full rounded-xl border border-edge bg-surface px-4 py-2.5 text-sm outline-none placeholder:text-faint focus:border-brand/60"
          />
          <button
            onClick={addChannel}
            disabled={adding || !addUrl.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand to-glow px-4 py-2.5 text-sm font-bold text-black transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {adding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {adding ? "Çekiliyor..." : "Ekle"}
          </button>
        </div>
        {addMsg && (
          <p className={`mt-2 text-xs ${addMsg.ok ? "text-pos" : "text-warn"}`}>{addMsg.text}</p>
        )}
      </div>

      {!store.hydrated ? null : store.tracked.length === 0 ? (
        <div className="mt-16 text-center">
          <Radar size={32} className="mx-auto text-faint" />
          <p className="mt-3 text-lg font-medium">Henüz kanal takip etmiyorsun</p>
          <p className="mt-1 text-sm text-muted">
            Keşfet&apos;te bir videonun altındaki &quot;Takip et&quot; butonuyla kanalı radarına al.
          </p>
          <Link
            href="/home"
            className="mt-4 inline-block rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-soft"
          >
            Keşfet&apos;e git
          </Link>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {store.tracked.map((t) => {
            const viral = viralByChannel[t.channel.id] ?? [];
            return (
              <div
                key={t.id}
                className="glass-panel p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 text-sm font-semibold text-brand-soft">
                    {t.channel.title.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.channel.title}</p>
                    <p className="text-xs text-muted">
                      {t.channel.handle} · {fmtCompact(t.channel.subscribers)} abone ·
                      medyan {fmtCompact(t.channel.medianViews)}
                    </p>
                  </div>
                  {viral.length > 0 && (
                    <span className="flex items-center gap-1 rounded-full border border-pos/40 bg-pos/15 px-2.5 py-1 text-xs font-medium text-pos">
                      <TrendingUp size={12} />
                      {viral.length} viral video
                    </span>
                  )}
                  <button
                    onClick={() => store.untrackChannel(t.channel.id)}
                    className="rounded-lg p-2 text-faint transition-colors hover:text-warn"
                    title="Takibi bırak"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                {viral.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1.5 border-t border-edge-soft pt-3">
                    {viral.slice(0, 3).map((v) => (
                      <p key={v.id} className="truncate text-xs text-muted">
                        <span className="mr-1.5 rounded bg-pos/15 px-1.5 py-0.5 font-semibold text-pos">
                          {v.outlierScore.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}x
                        </span>
                        {v.title}
                        <span className="ml-1.5 text-faint">
                          ({fmtCompact(v.views)} izlenme)
                        </span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
