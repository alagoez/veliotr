"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, Radar, ExternalLink } from "lucide-react";
import { Thumb } from "@/components/app/Thumb";
import { SaveMenu } from "@/components/app/SaveMenu";
import { fmtCompact, fmtMultiplier, fmtRelative } from "@/lib/format";
import { isSaved, isTracked, useStore } from "@/lib/store";
import type { Video } from "@/lib/types";

function multiplierTone(x: number): string {
  if (x >= 10) return "bg-pos/15 text-pos border-pos/40";
  if (x >= 3) return "bg-glow/10 text-glow border-glow/30";
  return "bg-raised text-muted border-edge";
}

export function VideoCard({ video }: { video: Video }) {
  const store = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const saved = isSaved(store.saved, video.id);
  const tracked = isTracked(store.tracked, video.channelId);

  const ytSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(video.title)}`;

  return (
    <div className="video-card group relative flex flex-col gap-2.5 rounded-2xl border border-edge-soft bg-surface p-2.5 transition-colors hover:border-edge hover:bg-raised/60">
      <Thumb video={video} />

      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-[13.5px] font-medium leading-snug" title={video.title}>
          {video.title}
        </h3>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${multiplierTone(video.outlierScore)}`}
          title="Çarpan: izlenme ÷ kanal medyanı"
        >
          {fmtMultiplier(video.outlierScore)}
        </span>
      </div>

      <div className="text-xs text-muted">
        <span className="text-ink/80">{video.channelTitle}</span>
        <span className="mx-1 text-faint">·</span>
        {fmtCompact(video.subscribers)} abone
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          <span className="font-medium text-ink/90">{fmtCompact(video.views)}</span> izlenme
          <span className="mx-1 text-faint">·</span>
          <span title="Kanal medyanı">{fmtCompact(video.medianViews)} medyan</span>
        </span>
        <span>{fmtRelative(video.publishedAt)}</span>
      </div>

      <div className="mt-0.5 flex items-center gap-1.5">
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              saved
                ? "border-brand/50 bg-brand/15 text-brand-soft"
                : "border-edge bg-raised text-muted hover:text-ink"
            }`}
          >
            {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            {saved ? "Kaydedildi" : "Kaydet"}
          </button>
          {menuOpen && (
            <SaveMenu video={video} onClose={() => setMenuOpen(false)} />
          )}
        </div>

        <button
          onClick={() => {
            if (tracked) {
              store.untrackChannel(video.channelId);
            } else {
              store.trackChannel({
                id: video.channelId,
                title: video.channelTitle,
                handle: video.channelHandle,
                avatarUrl: null,
                nicheSlug: video.nicheSlug,
                subscribers: video.subscribers,
                totalViews: 0,
                videoCount: 0,
                publishedAt: video.publishedAt,
                medianViews: video.medianViews,
              });
              store.pushNotification({
                type: "system",
                title: "Kanal takibe alındı",
                body: `${video.channelTitle} artık radarinda. Viral videosu çıkınca haber vereceğiz.`,
              });
            }
          }}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
            tracked
              ? "border-glow/40 bg-glow/10 text-glow"
              : "border-edge bg-raised text-muted hover:text-ink"
          }`}
          title={tracked ? "Takibi bırak" : "Kanalı takip et"}
        >
          <Radar size={14} />
          {tracked ? "Takipte" : "Takip et"}
        </button>

        <a
          href={ytSearch}
          target="_blank"
          rel="noreferrer"
          className="ml-auto flex items-center gap-1 rounded-lg border border-edge bg-raised px-2 py-1.5 text-xs text-muted transition-colors hover:text-ink"
          title="YouTube'da aç"
        >
          <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
}
