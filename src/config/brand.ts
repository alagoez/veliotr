/**
 * Viralab marka konfigürasyonu — tüm isim/renk/metin tek yerden yönetilir.
 * Marka değişirse SADECE bu dosya güncellenir (bkz. plan.md §11).
 */
export const brand = {
  name: "Viralab",
  domain: "viralab.dev",
  appUrl: "https://app.viralab.dev",
  tagline: "İzlenmeyen video çekmeyi bırak.",
  subTagline:
    "Viralab, milyonlarca videoyu tarayıp kanalını patlatacak fikirleri, başlıkları, thumbnail'ları ve hook'ları bulur.",
  cta: "HEMEN BAŞLA",
  supportEmail: "destek@viralab.dev",
  social: {
    youtube: "https://youtube.com/@viralab",
    x: "https://x.com/viralab",
    discord: "https://discord.gg/viralab",
  },
  pricing: {
    monthly: 349,
    annualMonthly: 249,
    annualTotal: 2988,
    launchCoupon: 87, // ilk ay %75
    currency: "₺",
    discountBadge: "%28,5 İNDİRİM",
  },
} as const;

export type Brand = typeof brand;
