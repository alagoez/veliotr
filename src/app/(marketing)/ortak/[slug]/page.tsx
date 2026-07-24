import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { brand } from "@/config/brand";
import { getPartner, PARTNERS } from "@/config/partners";

export function generateStaticParams() {
  return PARTNERS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getPartner(slug);
  return { title: p ? `${p.name} × ${brand.name}` : brand.name };
}

const FEATURES = [
  "Sınırsız arama",
  "Gelişmiş filtreler",
  "Sınırsız rakip takibi",
  "Sınırsız video kaydetme",
  "Fikir Doğrulayıcı (AI)",
];

export default async function PartnerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const partner = getPartner(slug);
  if (!partner) notFound();

  const discounted = Math.round(brand.pricing.monthly * (1 - partner.discountPct / 100));

  return (
    <main className="mx-auto max-w-3xl px-6 py-20 text-center">
      <p className="section-kicker">
        {partner.handle} · {partner.subs} ABONE ÖZEL TEKLİFİ
      </p>
      <h1 className="mt-5 font-display text-4xl font-bold leading-tight sm:text-5xl">
        İzlenmeyen video çekmeyi{" "}
        <span className="bg-gradient-to-r from-brand to-glow bg-clip-text text-transparent">
          bırak
        </span>
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted">
        &quot;{partner.greeting}&quot;
      </p>

      {/* Teklif kartı */}
      <div className="price-hero mx-auto mt-10 max-w-md text-left">
        <div className="p-8">
          <p className="text-sm font-semibold text-muted">
            İlk ay %{partner.discountPct} indirimli
          </p>
          <p className="mt-2">
            <span className="num font-display text-5xl font-bold">
              {brand.pricing.currency}
              {discounted}
            </span>
            <span className="text-muted"> / ilk ay</span>
            <s className="ml-2 text-sm text-faint">
              {brand.pricing.currency}
              {brand.pricing.monthly}
            </s>
          </p>
          <p className="mt-1 text-xs text-faint">
            sonra {brand.pricing.currency}
            {brand.pricing.monthly}/ay · istediğin zaman iptal et
          </p>
          <ul className="mt-6 grid gap-3 text-sm">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <Check size={15} className="text-pos" /> {f}
              </li>
            ))}
          </ul>
          <Link
            href="/signin"
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-glow py-3.5 text-sm font-extrabold text-black transition-transform hover:scale-[1.015]"
          >
            TEKLİFİ KULLAN <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* Partner alıntısı */}
      <figure className="mx-auto mt-12 max-w-xl">
        <blockquote className="text-lg leading-relaxed text-ink/90">
          &quot;{partner.quote}&quot;
        </blockquote>
        <figcaption className="mt-3 text-sm text-muted">
          <span className="font-semibold text-brand-soft">{partner.name}</span> ·{" "}
          {partner.subs} abone
        </figcaption>
      </figure>

      <p className="mt-12 text-sm text-faint">
        {brand.name}&apos;i ilk ay riske girmeden dene — {partner.priceAnchor}.
      </p>
    </main>
  );
}
