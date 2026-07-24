import type { SearchFilters, SearchSort } from "@/lib/types";

/** Hazır Listeler — Velio'nun "Databases" özelliğinin karşılığı.
 *  Her liste = indeks üzerinde küratörlü bir sorgu (bkz. plan.md §3.7). */
export type Collection = {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  filters: SearchFilters;
  sort: SearchSort;
};

export const COLLECTIONS: Collection[] = [
  {
    slug: "ayin-patlayanlari",
    title: "Bu Ayın Patlayanları",
    description: "Son 30 günde kanal normalinin en çok üstüne çıkan videolar.",
    emoji: "🚀",
    filters: { datePreset: "this-month", multiplier: { min: 3 } },
    sort: "outlier",
  },
  {
    slug: "haftanin-yukselenleri",
    title: "Haftanın Yükselenleri",
    description: "Bu hafta ivme kazanan taze outlier'lar — trend burada doğar.",
    emoji: "📈",
    filters: { datePreset: "this-week" },
    sort: "outlier",
  },
  {
    slug: "kucuk-kanal-mucizeleri",
    title: "Küçük Kanal Mucizeleri",
    description: "50K abone altındaki kanallardan 10x+ patlamalar. 'Bunu ben de yapabilirim' listesi.",
    emoji: "💎",
    filters: { subscribers: { max: 50000 }, multiplier: { min: 10 } },
    sort: "outlier",
  },
  {
    slug: "shorts-patlamalari",
    title: "Shorts Patlamaları",
    description: "Kısa formatın en sert outlier'ları — hook laboratuvarı.",
    emoji: "⚡",
    filters: { isShort: true, multiplier: { min: 5 } },
    sort: "outlier",
  },
  {
    slug: "sessiz-devler",
    title: "Sessiz Devler",
    description: "Abonesine oranla çok izlenen videolar — kitlesiz keşfedilenler.",
    emoji: "🌊",
    filters: { viewsToSubs: { min: 5 }, multiplier: { min: 3 } },
    sort: "outlier",
  },
  {
    slug: "uzun-soluklular",
    title: "Uzun Soluklular",
    description: "20 dakika üstü olup yine de patlayan videolar — derinlik çalışıyor.",
    emoji: "🎬",
    filters: { durationSec: { min: 1200 }, multiplier: { min: 3 } },
    sort: "outlier",
  },
];

export function getCollection(slug: string): Collection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}
