/**
 * Niş kataloğu — UI (filtre, onboarding) ve niş adı çözümlemesi için tek kaynak.
 * DB niches tablosuyla senkron tutulur (scripts/migrate veya insert).
 * Not: demo/data.ts'teki NICHES yalnızca demo veri üreticisinin şablonu olan
 * 6 nişi içerir; kullanıcıya gösterilen tam liste burasıdır.
 */
export type NicheDef = { slug: string; name: string };

export const NICHE_CATALOG: NicheDef[] = [
  { slug: "oyun", name: "Oyun" },
  { slug: "finans", name: "Finans & Girişim" },
  { slug: "yemek", name: "Yemek & Tarif" },
  { slug: "vlog", name: "Vlog & Yaşam" },
  { slug: "teknoloji", name: "Teknoloji & Yapay Zekâ" },
  { slug: "egitim", name: "Eğitim & Bilim" },
  { slug: "makyaj", name: "Güzellik & Makyaj" },
  { slug: "oto", name: "Otomotiv" },
  { slug: "spor", name: "Spor & Fitness" },
  { slug: "komedi", name: "Komedi" },
  { slug: "muzik", name: "Müzik" },
  { slug: "saglik", name: "Sağlık & İyi Yaşam" },
  { slug: "moda", name: "Moda & Stil" },
  { slug: "gelisim", name: "Kişisel Gelişim" },
  { slug: "cocuk", name: "Çocuk & Aile" },
];

export function nicheName(slug: string | null | undefined): string {
  if (!slug) return "";
  return NICHE_CATALOG.find((n) => n.slug === slug)?.name ?? slug;
}
