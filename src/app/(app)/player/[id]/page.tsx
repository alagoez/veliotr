import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Copy, ExternalLink, Flame } from "lucide-react";
import { getVideoById, search } from "@/lib/search";
import { VideoCard } from "@/components/app/VideoCard";
import {
  fmtCompact,
  fmtDuration,
  fmtMultiplier,
  fmtPercent,
  fmtRelative,
} from "@/lib/format";

export const metadata: Metadata = { title: "Video İncele" };

/** Gerçek YouTube ID'si mi? (demo ID'leri v_ ile başlar, embed edilemez) */
function isYouTubeId(id: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(id);
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const video = await getVideoById(id);
  if (!video) notFound();

  const similar = await search({
    filters: { similarTo: video.id },
    sort: "outlier",
    page: 0,
    pageSize: 6,
  });

  const stats: [string, string][] = [
    ["İzlenme", fmtCompact(video.views)],
    ["Kanal medyanı", fmtCompact(video.medianViews)],
    ["Çarpan", fmtMultiplier(video.outlierScore)],
    ["İzlenme : Abone", video.viewsToSubs.toLocaleString("tr-TR", { maximumFractionDigits: 1 })],
    ["Beğeni", fmtCompact(video.likes)],
    ["Yorum", fmtCompact(video.comments)],
    ["Etkileşim", fmtPercent(video.engagement)],
    ["Süre", video.isShort ? "Shorts" : fmtDuration(video.durationSec)],
    ["Yayın", fmtRelative(video.publishedAt)],
  ];

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-7">
      <Link
        href="/home"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} /> Keşfet&apos;e dön
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Oynatıcı */}
        <div>
          <div className="glass-panel overflow-hidden !rounded-2xl">
            {isYouTubeId(video.id) ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${video.id}`}
                title={video.title}
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="aspect-video w-full"
              />
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm text-muted">Demo videosu — oynatma yalnızca gerçek indekste.</p>
              </div>
            )}
          </div>
          <h1 className="mt-4 font-display text-xl font-bold leading-snug tracking-tight">
            {video.title}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {video.channelTitle}
            <span className="mx-1.5 text-faint">·</span>
            <span className="num">{fmtCompact(video.subscribers)}</span> abone
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Link
              href={`/home?similar=${encodeURIComponent(video.id)}`}
              className="icon-btn"
            >
              <Copy size={14} /> Benzerleri gör
            </Link>
            <a
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noreferrer"
              className="icon-btn"
            >
              <ExternalLink size={14} /> YouTube&apos;da aç
            </a>
          </div>
        </div>

        {/* Metrik paneli */}
        <div className="glass-panel h-fit p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-faint">
            <Flame size={13} className="text-brand-soft" /> Performans Karnesi
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5">
            {stats.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] text-faint">{k}</dt>
                <dd className="num mt-0.5 text-[15px] font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Benzerler */}
      {similar.videos.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-lg font-bold tracking-tight">Benzer videolar</h2>
          <div className="video-grid mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.videos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
