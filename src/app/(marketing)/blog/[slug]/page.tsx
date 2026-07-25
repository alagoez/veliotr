import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { brand } from "@/config/brand";
import { extractFaq, getPost, getPosts, renderMarkdown } from "@/lib/blog";

/**
 * JSON-LD gömme güvenliği.
 * JSON.stringify "<" karakterini KAÇIRMAZ; HTML ayrıştırıcısı ise ilk literal
 * "</script" ile script bloğunu kapatır. pSEO cron'u LLM çıktısını incelemeden
 * commit'lediği için başlık/açıklama/SSS metinleri güvenilmezdir ve
 * "</script><script>…" ile blok kırılabilirdi (kanıtlandı). U+2028/2029 de
 * JS'te satır sonu sayıldığı için kaçırılır.
 */
function safeJsonLd(value: unknown): string {
  // "\" karakterini kod noktasindan uretiyoruz: kaynakta ters egik
  // cizgi kacisi katmanlari karisip sessizce no-op'a donusmesin.
  const BS = String.fromCharCode(92);
  const LINE_SEP = String.fromCharCode(0x2028);
  const PARA_SEP = String.fromCharCode(0x2029);
  return JSON.stringify(value)
    .split("<").join(BS + "u003c")
    .split(LINE_SEP).join(BS + "u2028")
    .split(PARA_SEP).join(BS + "u2029");
}


export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return { title: post.title, description: post.description };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const faq = extractFaq(post.body);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      author: { "@type": "Organization", name: brand.name },
      publisher: { "@type": "Organization", name: brand.name },
    },
    faq.length > 0 && {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ].filter(Boolean);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} /> Tüm yazılar
      </Link>
      <p className="mt-6 text-xs text-faint">{post.date}</p>
      <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight">
        {post.title}
      </h1>

      <article
        className="blog-body mt-8"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }}
      />

      <div className="glass-panel mt-12 p-6 text-center">
        <p className="font-display text-lg font-bold">
          Tahmin etmeyi bırak, veriyle üret
        </p>
        <p className="mt-1.5 text-sm text-muted">
          {brand.name}, Türkçe YouTube&apos;un outlier indeksini önüne serer.
        </p>
        <Link
          href="/signin"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-glow px-6 py-3 text-sm font-extrabold text-black transition-transform hover:scale-[1.02]"
        >
          ÜCRETSİZ DENE <ArrowRight size={15} />
        </Link>
      </div>
    </main>
  );
}
