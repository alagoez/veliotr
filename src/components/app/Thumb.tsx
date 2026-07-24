import { fmtDuration } from "@/lib/format";
import type { Video } from "@/lib/types";

/** Gerçek thumbnail yoksa (demo) video kimliğinden deterministik gradyan üretir. */
function hueFrom(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

const NICHE_EMOJI: Record<string, string> = {
  oyun: "🎮",
  finans: "📈",
  yemek: "🍳",
  vlog: "🎒",
  teknoloji: "💻",
  egitim: "📚",
};

export function Thumb({ video }: { video: Video }) {
  const h = hueFrom(video.id);
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-raised">
      {video.thumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={video.thumbUrl}
          alt={video.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            background: `linear-gradient(135deg, hsl(${h} 45% 18%), hsl(${(h + 60) % 360} 55% 30%))`,
          }}
        >
          <span className="text-4xl opacity-80" aria-hidden>
            {NICHE_EMOJI[video.nicheSlug] ?? "🎬"}
          </span>
        </div>
      )}
      <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white">
        {video.isShort ? "Shorts" : fmtDuration(video.durationSec)}
      </span>
    </div>
  );
}
