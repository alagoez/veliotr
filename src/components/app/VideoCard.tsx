"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Radar, ExternalLink, Flame, Copy, ArrowRight } from "lucide-react";
import { Thumb } from "@/components/app/Thumb";
import { SaveMenu } from "@/components/app/SaveMenu";
import { channelSize, isSmallChannel } from "@/config/channel-size";
import { fmtCompact, fmtDuration, fmtMultiplier, fmtRelative } from "@/lib/format";
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
  const size = channelSize(video.subscribers);

  return (
    <div className="video-card group relative flex flex-col gap-2.5 rounded-2xl border border-edge-soft bg-surface p-2.5">
      {/* YouTube düzeni (kullanıcının referans ss'i): thumbnail'da boyut
          rozeti sol üstte, SÜRE sağ altta. Çarpan rozeti başlığın yanında —
          ss'teki renkli pilin yeri orası. */}
      <div className="relative">
        <Link href={`/player/${video.id}`} aria-label={`${video.title} — incele`}>
          <Thumb video={video} />
        </Link>
        {isSmallChannel(video.subscribers) && (
          <span className="size-badge" title={`${size.label} kanal · ${fmtCompact(video.subscribers)} abone`}>
            {size.label} kanal
          </span>
        )}
        {video.durationSec > 0 && <span className="dur-badge">{fmtDuration(video.durationSec)}</span>}
      </div>

      {/* Başlık önce (ss'teki gibi kalın), yanında çarpan pili. */}
      <div className="flex items-start justify-between gap-2 px-0.5">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug" title={video.title}>
          <Link href={`/player/${video.id}`} className="hover:text-brand-soft">
            {video.title}
          </Link>
        </h3>
        <span
          className={`mult-badge shrink-0 ${multiplierTier(video.outlierScore)}`}
          title="Çarpan: bu video, kanalın normalinin kaç katı"
        >
          {video.outlierScore >= 50 && <Flame size={11} />}
          {fmtMultiplier(video.outlierScore)}
        </span>
      </div>

      {/* Meta, ss'teki gri satır düzeninde. Metinler aynı: abone → izlenme,
          kanal · normali, tarih. */}
      <div className="px-0.5">
        <div className="flex items-baseline gap-1.5 text-[13px] text-muted">
          <span className="num text-faint">{fmtCompact(video.subscribers)} abone</span>
          <ArrowRight size={12} className="shrink-0 text-faint" aria-hidden />
          <span className="num font-semibold text-ink">{fmtCompact(video.views)}</span>
          <span>izlenme</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted">
          {/* "medyan" istatistik jargonu — hedef kitle YouTuber. "normali" aynı
              bilgiyi sıfır öğrenme maliyetiyle veriyor ve çarpanı açıklıyor. */}
          <span className="truncate">
            <span className="font-medium text-ink/85">{video.channelTitle}</span>
            <span className="mx-1 text-faint">·</span>
            <span className="text-faint">normali <span className="num">{fmtCompact(video.medianViews)}</span></span>
          </span>
          <span className="shrink-0 text-faint">{fmtRelative(video.publishedAt)}</span>
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

        {/* Takip / Benzer / YouTube ikon oldu: akışta 20 kart × 3 buton = 60
            buton görsel gürültüsü yaratıyordu. Ana eylem "Kaydet" metin kalıyor,
            gerisi sağa yaslı ikon. */}
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
          className={`ml-auto rounded-lg p-1.5 transition-all active:scale-95 ${
            tracked ? "text-glow" : "text-faint hover:text-ink"
          }`}
          title={tracked ? "Takibi bırak" : "Kanalı takip et"}
          aria-label={tracked ? "Takibi bırak" : "Kanalı takip et"}
        >
          <Radar size={15} />
        </button>

        <Link
          href={`/home?similar=${encodeURIComponent(video.id)}`}
          className="rounded-lg p-1.5 text-faint transition-all hover:text-ink active:scale-95"
          title="Benzer videoları gör"
          aria-label="Benzer videoları gör"
        >
          <Copy size={15} />
        </Link>
        <a
          href={ytSearch}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg p-1.5 text-faint transition-all hover:text-ink active:scale-95"
          title="YouTube'da aç"
          aria-label="YouTube'da aç"
        >
          <ExternalLink size={15} />
        </a>
      </div>
    </div>
  );
}
