/**
 * Niş kataloğu — UI (filtre, onboarding) ve niş adı çözümlemesi için tek kaynak.
 * DB niches tablosuyla senkron tutulur (scripts/migrate veya insert).
 * Not: demo/data.ts'teki NICHES yalnızca demo veri üreticisinin şablonu olan
 * 6 nişi içerir; kullanıcıya gösterilen tam liste burasıdır.
 */
export type NicheDef = { slug: string; name: string };

export const NICHE_CATALOG: NicheDef[] = [
  { slug: "oyun", name: "Gaming" },
  { slug: "finans", name: "Business & Finance" },
  { slug: "yemek", name: "Food & Cooking" },
  { slug: "vlog", name: "Vlog & Lifestyle" },
  { slug: "teknoloji", name: "Technology & AI" },
  { slug: "egitim", name: "Education & Science" },
  { slug: "makyaj", name: "Beauty & Makeup" },
  { slug: "oto", name: "Automotive" },
  { slug: "spor", name: "Sports & Fitness" },
  { slug: "komedi", name: "Comedy" },
  { slug: "muzik", name: "Music" },
  { slug: "saglik", name: "Health & Wellness" },
  { slug: "moda", name: "Fashion & Style" },
  { slug: "gelisim", name: "Self-Improvement" },
  { slug: "cocuk", name: "Kids & Family" },
];

export function nicheName(slug: string | null | undefined): string {
  if (!slug) return "";
  return NICHE_CATALOG.find((n) => n.slug === slug)?.name ?? slug;
}
