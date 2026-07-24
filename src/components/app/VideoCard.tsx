"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, Radar, ExternalLink, Flame } from "lucide-react";
import { Thumb } from "@/components/app/Thumb";
import { SaveMenu } from "@/components/app/SaveMenu";
import { fmtCompact, fmtMultiplier, fmtRelative } from "@/lib/format";
import { isSaved, isTracked, useStore } from "@/lib/store";
import type { Video } from "@/lib/types";

function multiplierTier(x: number): string {
  if (x >= 50) return "mult-hot";
  if (x >= 10) return "mult-high";
  if (x >= 3) return "mult-warm";
  return "mult-cold";
}

export function VideoCard({ video }: { video: Video }) {
  const store = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const saved = isSaved(store.saved, video.id);
  const tracked = isTracked(store.tracked, video.channelId);

  const ytSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(video.title)}`;

  // Medyan kıyas çubuğu: log ölçekte izlenme / (medyan × 50) → 0-100%
  // (50x = çubuk dolu; işaret çizgisi = medyanın konumu)
  const ratio = video.medianViews > 0 ? video.views / video.medianViews : 0;
  const fillPct = Math.min(100, Math.max(4, (Math.log10(Math.max(ratio, 0.1)) + 1) * (100 / (Math.log10(50) + 1))));
  const medianPct = (1 * 100) / (Math.log10(50) + 1); // ratio=1 noktası

  return (
    <div className="video-card group relative flex flex-col gap-2.5 rounded-2xl border border-edge-soft bg-surface p-2.5">
      <Thumb video={video} />

      <div className="flex items-start justify-between gap-2 px-0.5">
        <h3 className="line-clamp-2 text-[13.5px] font-semibold leading-snug" title={video.title}>
          {video.title}
        </h3>
        <span
          className={`mult-badge shrink-0 ${multiplierTier(video.outlierScore)}`}
          title="Çarpan: izlenme ÷ kanal medyanı"
        >
          {video.outlierScore >= 50 && <Flame size={11} />}
          {fmtMultiplier(video.outlierScore)}
        </span>
      </div>

      <div className="px-0.5 text-xs text-muted">
        <span className="font-medium text-ink/85">{video.channelTitle}</span>
        <span className="mx-1 text-faint">·</span>
        <span className="num">{fmtCompact(video.subscribers)}</span> abone
      </div>

      {/* Medyan kıyası: bu video, kanal normalinin neresinde? */}
      <div className="px-0.5" title={`Kanal medyanı: ${fmtCompact(video.medianViews)} izlenme`}>
        <div className="vs-bar">
          <i style={{ width: `${fillPct}%` }} />
          <b style={{ left: `${medianPct}%` }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-muted">
          <span>
            <span className="num font-semibold text-ink/90">{fmtCompact(video.views)}</span> izlenme
            <span className="mx-1 text-faint">·</span>
            <span className="num text-faint">{fmtCompact(video.medianViews)} medyan</span>
          </span>
          <span className="text-faint">{fmtRelative(video.publishedAt)}</span>
        </div>
      </div>

      <div className="card-actions mt-0.5 flex items-center gap-1.5">
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
              saved
                ? "border-brand/50 bg-brand/15 text-brand-soft"
                : "border-edge bg-raised text-muted hover:border-brand/40 hover:text-ink"
            }`}
          >
            {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            {saved ? "Kaydedildi" : "Kaydet"}
          </button>
          {menuOpen && <SaveMenu video={video} onClose={() => setMenuOpen(false)} />}
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
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
            tracked
              ? "border-glow/40 bg-glow/10 text-glow"
              : "border-edge bg-raised text-muted hover:border-glow/40 hover:text-ink"
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
          className="ml-auto flex items-center gap-1 rounded-lg border border-edge bg-raised px-2 py-1.5 text-xs text-muted transition-all hover:text-ink active:scale-95"
          title="YouTube'da aç"
        >
          <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
}
