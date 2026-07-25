import type { Metadata } from "next";
import Link from "next/link";
import { getPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — YouTube büyüme rehberleri",
  description:
    "Türk YouTuber'lar için veriye dayalı büyüme rehberleri: video fikirleri, başlık formülleri, outlier analizi.",
};

export default function BlogIndexPage() {
  const posts = getPosts();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="section-kicker">BLOG</p>
      <h1 className="mt-4 font-display text-4xl font-bold leading-tight">
        Veriyle büyüme rehberleri
      </h1>
      <p className="mt-3 text-muted">
        Türkçe YouTube indeksinden çıkan gerçek kalıplar — tahmin yok, veri var.
      </p>

      <div className="mt-10 flex flex-col gap-4">
        {posts.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="glass-panel group p-6">
            <p className="text-xs text-faint">{p.date}</p>
            <h2 className="mt-1.5 font-display text-lg font-bold leading-snug tracking-tight group-hover:text-brand-soft">
              {p.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{p.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
