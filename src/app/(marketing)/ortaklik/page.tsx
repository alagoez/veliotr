import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgePercent, Infinity as InfinityIcon, Rocket } from "lucide-react";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Ortaklık Programı" };

const PERKS = [
  {
    icon: BadgePercent,
    title: "%40 komisyon",
    body: "Linkinle gelen her abonenin ödemesinin %40'ı senin — sadece ilk ay değil.",
  },
  {
    icon: InfinityIcon,
    title: "Ömür boyu",
    body: "Abone kaldığı sürece kazanmaya devam edersin. Bir video, yıllarca gelir.",
  },
  {
    icon: Rocket,
    title: "Sana özel sayfa",
    body: "En iyi partnerlere kitlesine özel indirimli, kendi adına landing sayfası açıyoruz.",
  },
];

export default function AffiliatePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <p className="section-kicker text-center">ORTAKLIK PROGRAMI</p>
      <h1 className="mt-5 text-center font-display text-4xl font-bold leading-tight sm:text-5xl">
        Kitlene {brand.name}&apos;i öner,{" "}
        <span className="bg-gradient-to-r from-brand to-glow bg-clip-text text-transparent">
          ömür boyu kazan
        </span>
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-center text-muted">
        İçerik üreticileri için içerik üreticilerinin sattığı bir araç.
        Şeffaf şartlar: %40 tekrarlayan komisyon, 90 gün çerez, aylık ödeme.
      </p>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {PERKS.map((p) => (
          <div key={p.title} className="glass-panel p-5 text-center">
            <p.icon size={22} className="mx-auto text-brand-soft" />
            <h2 className="mt-3 font-display text-base font-bold">{p.title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{p.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <a
          href={`mailto:${brand.supportEmail}?subject=Ortaklık başvurusu&body=Kanalın/hesabın: %0D%0ANasıl tanıtmayı planlıyorsun: `}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-glow px-7 py-3.5 text-sm font-extrabold text-black transition-transform hover:scale-[1.02]"
        >
          BAŞVUR <ArrowRight size={15} />
        </a>
        <p className="mt-3 text-xs text-faint">
          Başvuruda kanal linkini ve tanıtım planını yaz — 48 saat içinde dönüş yapıyoruz.
        </p>
      </div>

      <p className="mt-14 text-center text-xs leading-relaxed text-faint">
        Örnek partner sayfası:{" "}
        <Link href="/ortak/ornek-partner" className="text-glow underline">
          /ortak/ornek-partner
        </Link>{" "}
        — kabul edilen partnerlere aynısından açılır.
      </p>
    </main>
  );
}
