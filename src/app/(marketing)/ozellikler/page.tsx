import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  FolderOpen,
  Radar,
  BellRing,
  Timer,
  TrendingUp,
  Users,
  Lightbulb,
  Zap,
} from "lucide-react";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Özellikler" };

const TILES = [
  { icon: Sparkles, title: "Yapay Zekâ Destekli Arama & Filtre" },
  { icon: FolderOpen, title: "Düzenle & Kaydet" },
  { icon: Radar, title: "Rakip Takibi" },
  { icon: BellRing, title: "Trend Uyarıları" },
  { icon: Timer, title: "Zaman Kazan" },
  { icon: TrendingUp, title: "İzlenmeyi Artır" },
  { icon: Users, title: "Üretici Topluluğuna Katıl" },
  { icon: Lightbulb, title: "Kanıtlanmış Fikirler Bul" },
] as const;

export default function FeaturesPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pb-14 pt-24 text-center">
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
          Kanalını düzlüğe çıkarmanın{" "}
          <span className="bg-gradient-to-r from-brand-soft to-glow bg-clip-text text-transparent">
            en hızlı yolu
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-muted">
          Tahmin etmekten yoruldun mu? {brand.name}, veri odaklı içgörüler, rakip
          takibi ve viral video analiziyle YouTube stratejini baştan yazar.
        </p>
        <div className="mt-8">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-7 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-soft"
          >
            <Zap size={16} />
            {brand.cta}
          </Link>
        </div>
      </section>

      {/* 8 özellik karosu */}
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {TILES.map((t) => (
            <div
              key={t.title}
              className="rounded-xl border border-edge-soft bg-surface p-5 text-center"
            >
              <t.icon size={22} className="mx-auto text-brand-soft" />
              <p className="mt-3 text-xs font-medium leading-snug">{t.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section className="border-y border-edge-soft bg-surface/40 py-16">
        <div className="mx-auto max-w-2xl px-5 text-center">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">
            Öne çıkmakta zorlanıyor musun? İçeriğin daha fazlasını hak ediyor
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Harika içerik üretiyorsun ama neredeyse hiç etkileşim almıyor. İçerik
            üreticileri için &quot;ne tutar&quot; tahmini sinir bozucudur — ve sana izlenme,
            abone ve gelir kaybettirir.
          </p>
        </div>
      </section>

      {/* Demo kartı */}
      <section className="mx-auto max-w-3xl px-5 py-16">
        <h2 className="text-center font-display text-2xl font-semibold">
          Üreticinin büyüme için gizli silahı
        </h2>
        <div className="mt-8 rounded-2xl border border-edge bg-surface p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-faint">
            <span className="rounded-full border border-pos/40 bg-pos/10 px-2.5 py-1 text-pos">
              Çarpan: 10x+
            </span>
            <span className="rounded-full border border-edge bg-raised px-2.5 py-1">
              Video süresi: 8-20 dk
            </span>
            <span className="rounded-full border border-edge bg-raised px-2.5 py-1">
              Tarih: son 2 yıl
            </span>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-24 w-40 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand/40 to-glow/30 text-4xl">
              🚀
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug">
                Küçük kanallar: Algoritmanın seni sevmesi için bunu yap
              </p>
              <p className="mt-1 text-xs text-muted">@teknomasa · 368 B abone</p>
              <p className="mt-2 text-sm">
                <span className="font-semibold">1,4 Mn izlenme</span>
                <span className="text-faint"> (97 B medyan)</span>
                <span className="ml-2 rounded-full border border-pos/40 bg-pos/15 px-2.5 py-0.5 text-xs font-bold text-pos">
                  14,4x
                </span>
              </p>
            </div>
          </div>
          <ul className="mt-5 flex flex-col gap-2 border-t border-edge-soft pt-4 text-sm text-muted">
            <li>• Milyonlarca veri noktasıyla viral video fikirleri keşfet.</li>
            <li>• Thumbnail&apos;larını mükemmelleştir, tıklanma oranını yükselt.</li>
            <li>• Rakipleri izle, trendlerin hep bir adım önünde ol.</li>
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-edge-soft bg-surface/40 py-16 text-center">
        <div className="mx-auto max-w-2xl px-5">
          <p className="text-xs font-bold tracking-widest text-glow">
            İLHAMI VİRAL BAŞARIYA DÖNÜŞTÜR
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold">
            Kanalını şaha kaldırmaya hazır mısın?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Bir videonun daha düşük performans göstermesine izin verme. {brand.name} ile
            uygulanabilir içgörüler, kanıtlanmış stratejiler ve büyümek için gereken tüm
            araçlar elinde — hem de dışarıda bir öğün yemekten ucuza.
          </p>
          <div className="mt-6">
            <Link
              href="/home"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-7 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-soft"
            >
              <Zap size={16} />
              {brand.cta}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
