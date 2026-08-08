/**
 * Kanal boyutu bantları — kart rozeti ve filtre çipleri için TEK KAYNAK.
 *
 * Neden var: çarpan ("3961x") bir orandır, "ne kadar küçük kanal" bilgisini
 * vermez. Oysa ürünün tek cümlesi "bu KÜÇÜK kanal bunu yaptı ve patladı".
 * O cümlenin "küçük" kısmı kartta okunabilir olmalı ve filtrede tek tıkla
 * seçilebilmeli — ikisi aynı bantları kullanmazsa kullanıcı iki farklı dil
 * öğrenmek zorunda kalır.
 */
export type ChannelSize = { key: string; label: string; min: number; max?: number };

export const CHANNEL_SIZES: ChannelSize[] = [
  { key: "mikro", label: "Mikro", min: 0, max: 10_000 },
  { key: "kucuk", label: "Küçük", min: 10_000, max: 100_000 },
  { key: "orta", label: "Orta", min: 100_000, max: 1_000_000 },
  { key: "buyuk", label: "Büyük", min: 1_000_000 },
];

export function channelSize(subscribers: number): ChannelSize {
  return (
    CHANNEL_SIZES.find((s) => subscribers >= s.min && (s.max === undefined || subscribers < s.max))
      ?? CHANNEL_SIZES[CHANNEL_SIZES.length - 1]
  );
}

/** Küçük kanal = ürünün vaadi. Rozet yalnızca burada vurgulanıyor. */
export function isSmallChannel(subscribers: number): boolean {
  return subscribers < 100_000;
}
