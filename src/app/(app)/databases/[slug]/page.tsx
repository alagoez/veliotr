import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCollection } from "@/lib/collections";
import { search } from "@/lib/search";
import { VideoCard } from "@/components/app/VideoCard";
import { fmtPlain } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getCollection(slug);
  return { title: c ? c.title : "Hazır Liste" };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) notFound();

  const res = await search({
    filters: collection.filters,
    sort: collection.sort,
    page: 0,
    pageSize: 24,
  });

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-7">
      <Link
        href="/databases"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} /> Tüm listeler
      </Link>

      <div className="flex items-center gap-3">
        <span className="text-4xl">{collection.emoji}</span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {collection.title}
          </h1>
          <p className="mt-0.5 text-sm text-muted">{collection.description}</p>
        </div>
      </div>

      <p className="mt-4 flex items-center gap-2 text-xs text-faint">
        <span className="live-dot" aria-hidden />
        <span className="num text-muted">{fmtPlain(res.total)}</span> video bu kritere uyuyor
      </p>

      <div className="video-grid mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {res.videos.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
    </div>
  );
}
