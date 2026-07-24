/** Partner (ambassador) sayfaları — Velio'nun /ambassador master şablonu sistemi.
 *  Yeni partner eklemek = buraya bir kayıt eklemek (< 5 dakika).
 *  Sayfa: /ortak/[slug] — indirim attribution ile uygulanır, kupon kodu sızmaz. */
export type Partner = {
  slug: string;
  name: string;
  handle: string;
  subs: string;
  greeting: string;
  quote: string;
  discountPct: number; // ilk ay indirimi
  priceAnchor: string; // "bir döner parasına" vb.
};

export const PARTNERS: Partner[] = [
  {
    slug: "ornek-partner",
    name: "Örnek Partner",
    handle: "@ornekkanal",
    subs: "125 B",
    greeting: "Selam, ben Örnek! Kanalımı büyütürken kullandığım aracı sizin için anlaştım.",
    quote: "Viralab sayesinde ne çekeceğimi düşünmek yerine veriye bakıyorum. Araştırma süresi 10'da 1'e indi.",
    discountPct: 75,
    priceAnchor: "bir döner parasına",
  },
];

export function getPartner(slug: string): Partner | undefined {
  return PARTNERS.find((p) => p.slug === slug);
}
