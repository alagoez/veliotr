import type { Metadata } from "next";
import Link from "next/link";
import {
  Beaker,
  Check,
  Zap,
  Search,
  Radar,
  FolderOpen,
  Smartphone,
  BookOpen,
  LifeBuoy,
  MessagesSquare,
  GraduationCap,
} from "lucide-react";
import { brand } from "@/config/brand";

export const metadata: Metadata = {
  title: `${brand.name} — ${brand.tagline}`,
};

const TESTIMONIALS = [
  {
    handle: "@OYUNCUEFE",
    subs: "142 B Abone",
    quote:
      "Sonunda gerçekten izlenme getiren fikirleri, başlıkları ve thumbnail'ları bulan bir araç.",
  },
  {
    handle: "@BORSAGUNLUGU",
    subs: "88 B Abone",
    quote:
      "Eskiden saatler süren araştırma artık dakikalar alıyor. Elle yaptığıma inanamıyorum.",
  },
  {
    handle: "@TARIFKAZANI",
    subs: "215 B Abone",
    quote:
      "Nişimdeki outlier'ları bulmak 100 kat kolaylaştı. Öne çıkmak artık şans değil.",
  },
  {
    handle: "@TEKNOMASA",
    subs: "374 B Abone",
    quote:
      "Karşılaştığım en iyi YouTube aracı. Daha önce nasıl bilmiyordum, oyun değiştirici.",
  },
  {
    handle: "@ONDAKIKADAOGREN",
    subs: "97 B Abone",
    quote:
      "4 videoyla 75 bin aboneye ulaşmamın sırrı: kitlemin görmek istediği fikirleri bulmak. Artık hepsi otomatik.",
  },
  {
    handle: "@KAMPTAYIZ",
    subs: "63 B Abone",
    quote: "5 ayda 20 bin aboneye Viralab sayesinde ulaştım.",
  },
] as const;

const STEPS = [
  {
    icon: Search,
    title: "Viral kalıpları çöz",
    body: "Filtreler, anahtar kelimeler ve yapay zekâ ile kanıtlanmış fikirleri, başlıkları ve hook'ları saniyeler içinde bul.",
  },
  {
    icon: Radar,
    title: "Rakiplerini gözetle",
    body: "Tüm rakiplerini tek yerden izle; nişinde bir trend doğduğu anda haberin olsun.",
  },
  {
    icon: FolderOpen,
    title: "İzlenmeyi topla",
    body: "Tüm araştırmanı klasörler, etiketler ve notlarla tek yerde topla; viral kalıpları kolayca yakala.",
  },
] as const;

const SUPPORT = [
  {
    icon: BookOpen,
    title: "Kaynak Kasası",
    body: "Viralab'i sonuna kadar kullanmanı sağlayan rehberler, ipuçları ve pratik dersler.",
  },
  {
    icon: LifeBuoy,
    title: "Yardım Merkezi",
    body: "Takıldığın anda cevap bul; kanalını büyütürken önünde engel kalmasın.",
  },
  {
    icon: MessagesSquare,
    title: "Topluluk",
    body: "Discord'a katıl, diğer üreticilerle fikir alışverişi yap, geri bildirim al.",
  },
  {
    icon: GraduationCap,
    title: "Online Kurslar",
    body: "YouTube büyümesini kendi hızında öğren; uzman içgörüleriyle kanalını uçur.",
  },
] as const;

const PLAN_FEATURES = [
  "Sınırsız Arama",
  "Gelişmiş Filtreler",
  "Sınırsız Rakip Takibi",
  "Sınırsız Video Kaydetme",
  "Fikir Doğrulayıcı (AI)",
  "Varoluş Krizi Geçir",
] as const;

function Cta({ children = "HEMEN BAŞLA" }: { children?: string }) {
  return (
    <Link
      href="/home"
      className="inline-flex items-center gap-2 rounded-xl bg-brand px-7 py-3.5 text-sm font-bold tracking-wide text-white transition-colors hover:bg-brand-soft"
    >
      <Zap size={16} />
      {children}
    </Link>
  );
}

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-5 pb-20 pt-24 text-center">
        <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          İzlenmeyen video{" "}
          <span className="bg-gradient-to-r from-brand-soft to-glow bg-clip-text text-transparent">
            çekmeyi bırak
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          {brand.subTagline}
        </p>
        <div className="mt-8">
          <Cta />
        </div>

        {/* Ürün önizleme kartı */}
        <div className="mx-auto mt-14 max-w-2xl rounded-2xl border border-edge bg-surface p-5 text-left shadow-2xl shadow-brand/5">
          <div className="flex items-center gap-2 text-xs text-faint">
            <span className="rounded-full border border-edge bg-raised px-2.5 py-1">Çarpan: 10x+</span>
            <span className="rounded-full border border-edge bg-raised px-2.5 py-1">Video süresi</span>
            <span className="rounded-full border border-edge bg-raised px-2.5 py-1">Tarih aralığı</span>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-20 w-36 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand/40 to-glow/30 text-3xl">
              🚀
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                Küçük kanallar: Algoritmanın seni sevmesi için bunu yap
              </p>
              <p className="mt-1 text-xs text-muted">@teknomasa · 368 B abone</p>
              <p className="mt-1.5 text-xs">
                <span className="font-semibold text-ink">1,4 Mn izlenme</span>
                <span className="text-faint"> (97 B medyan)</span>
                <span className="ml-2 rounded-full border border-pos/40 bg-pos/15 px-2 py-0.5 text-[11px] font-bold text-pos">
                  14,4x
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial bandı */}
      <section className="border-y border-edge-soft bg-surface/40 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center font-display text-2xl font-semibold sm:text-3xl">
            Türkiye&apos;nin hızlı büyüyen kanalları güveniyor
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.handle}
                className="rounded-xl border border-edge-soft bg-surface p-5"
              >
                <blockquote className="text-sm leading-relaxed text-ink/90">
                  &quot;{t.quote}&quot;
                </blockquote>
                <figcaption className="mt-3 text-xs">
                  <span className="font-semibold text-brand-soft">{t.handle}</span>
                  <span className="ml-2 text-faint">{t.subs}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 3 adım */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-center font-display text-2xl font-semibold sm:text-3xl">
          Kanalın için steroid gibi — ama yasal
        </h2>
        <p className="mt-2 text-center text-muted">
          Sıradaki videonu 3 kolay adımda patlat
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="rounded-2xl border border-edge-soft bg-surface p-6"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/15 text-brand-soft">
                <s.icon size={20} />
              </span>
              <p className="mt-4 text-xs font-semibold text-faint">ADIM {i + 1}</p>
              <h3 className="mt-1 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Derin bloklar */}
      <section className="mx-auto flex max-w-5xl flex-col gap-16 px-5 pb-20">
        {[
          {
            kicker: "VİRAL KALIPLARI ÇÖZ",
            title: "Milyonlarca izlenme getiren formülleri nokta atışı bul",
            body: "Gelişmiş filtreler, yapay zekâ destekli arama ve 'Benzer Videoları Gör' özelliğiyle her niş için kanıtlanmış fikirleri, başlıkları, thumbnail'ları ve hook'ları ortaya çıkar — hem daha çok izlen, hem saatlerce süren işten kurtul.",
          },
          {
            kicker: "RAKİPLERİNİ GÖZETLE",
            title: "Rakiplerin nasıl kazandığını gör, arayı kapat",
            body: "Tüm rakiplerini tek yerden takip et, videolarını hızla analiz et, sonuç almak için tam olarak ne yaptıklarını çöz. Nişinde biri viral olduğunda otomatik uyarı al.",
          },
          {
            kicker: "İZLENMEYİ TOPLA",
            title: "Tüm araştırmanı tek yerde sakla",
            body: "Hayal et: tüm video fikirlerin, başlıkların, thumbnail'ların ve ilhamın tek yerde — özel klasörlere yerleşmiş, etiket ve notlarla anında bulunur halde.",
          },
        ].map((b) => (
          <div key={b.kicker} className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold tracking-widest text-glow">{b.kicker}</p>
              <h3 className="mt-2 font-display text-2xl font-semibold leading-snug">
                {b.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{b.body}</p>
            </div>
            <div className="flex h-48 items-center justify-center rounded-2xl border border-edge-soft bg-gradient-to-br from-surface to-raised text-5xl">
              {b.kicker.startsWith("V") ? "🔬" : b.kicker.startsWith("R") ? "📡" : "🗂️"}
            </div>
          </div>
        ))}
      </section>

      {/* Uygulama & eklenti */}
      <section className="border-y border-edge-soft bg-surface/40 py-16">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <p className="text-xs font-bold tracking-widest text-glow">
            UYGULAMA &amp; EKLENTİYİ İNDİR
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
            İlhamı her an, her yerde kaydet
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Chrome Eklentisi veya Mobil Uygulama ile YouTube&apos;dan hiç çıkmadan
            videoları Viralab&apos;e kaydet, etiket ve notlarla düzenle.{" "}
            <span className="text-faint">(Faz 2&apos;de geliyor)</span>
          </p>
          <Smartphone size={40} className="mx-auto mt-6 text-brand-soft" />
        </div>
      </section>

      {/* Fiyatlandırma */}
      <section id="fiyat" className="mx-auto max-w-4xl px-5 py-20">
        <p className="text-center text-xs font-bold tracking-widest text-glow">
          GERÇEK SONUÇLAR GÖRMEYE BAŞLA
        </p>
        <h2 className="mt-2 text-center font-display text-3xl font-semibold">
          Sıradaki videon patlamaya hazır mı?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted">
          İzlenmeyen video çekme kısır döngüsünü kır. Viralab&apos;e katıl,
          bir sonraki viral videonu kanıtlanmış veriyle üret.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <div className="relative rounded-2xl border border-brand/50 bg-surface p-7">
            <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-[11px] font-bold text-white">
              {brand.pricing.discountBadge}
            </span>
            <p className="text-sm font-medium text-muted">Yıllık</p>
            <p className="mt-2">
              <span className="font-display text-4xl font-bold">
                {brand.pricing.currency}
                {brand.pricing.annualMonthly}
              </span>
              <span className="text-muted">/ay</span>
              <s className="ml-2 text-sm text-faint">
                {brand.pricing.currency}
                {brand.pricing.monthly}
              </s>
            </p>
            <ul className="mt-5 flex flex-col gap-2">
              {PLAN_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check size={14} className="text-pos" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Cta />
            </div>
            <p className="mt-2 text-[11px] text-faint">*İstediğin zaman iptal et</p>
          </div>

          <div className="rounded-2xl border border-edge bg-surface p-7">
            <p className="text-sm font-medium text-muted">Aylık</p>
            <p className="mt-2">
              <span className="font-display text-4xl font-bold">
                {brand.pricing.currency}
                {brand.pricing.monthly}
              </span>
              <span className="text-muted">/ay</span>
            </p>
            <ul className="mt-5 flex flex-col gap-2">
              {PLAN_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check size={14} className="text-pos" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Cta />
            </div>
            <p className="mt-2 text-[11px] text-faint">*İstediğin zaman iptal et</p>
          </div>
        </div>
      </section>

      {/* Destek 4'lüsü */}
      <section className="border-t border-edge-soft bg-surface/40 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-center text-xs font-bold tracking-widest text-glow">
            VİRALAB DESTEK
          </p>
          <h2 className="mt-2 text-center font-display text-2xl font-semibold">
            Kanalını büyütmen için gereken her şey
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SUPPORT.map((s) => (
              <div
                key={s.title}
                className="rounded-xl border border-edge-soft bg-surface p-5"
              >
                <s.icon size={20} className="text-brand-soft" />
                <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-5 py-20 text-center">
        <h2 className="font-display text-3xl font-semibold">
          {brand.name}&apos;i bugün dene
        </h2>
        <p className="mt-3 text-muted">
          İlk ayını <span className="font-semibold text-ink">riske girmeden</span> dene —
          bir döner parasına.
        </p>
        <div className="mt-6">
          <Cta />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-edge-soft bg-surface/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-3">
          <div>
            <span className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/20 text-brand-soft">
                <Beaker size={15} />
              </span>
              <span className="font-display font-semibold">{brand.name}</span>
            </span>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Türk YouTuber&apos;ların kanıtlanmış viral video fikirlerini ve trendleri
              veriyle bulmasına yardım ediyoruz.
            </p>
          </div>
          <div className="text-sm">
            <p className="font-semibold">Hızlı Bağlantılar</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-xs text-muted">
              <li><Link href="/" className="hover:text-ink">Ana Sayfa</Link></li>
              <li><Link href="/ozellikler" className="hover:text-ink">Özellikler</Link></li>
              <li><Link href="/iletisim" className="hover:text-ink">İletişim</Link></li>
              <li><Link href="/home" className="hover:text-ink">Uygulamaya Git</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-semibold">Yasal</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-xs text-muted">
              <li><Link href="/gizlilik" className="hover:text-ink">Gizlilik Politikası</Link></li>
              <li><Link href="/kosullar" className="hover:text-ink">Kullanım Koşulları</Link></li>
            </ul>
            <p className="mt-4 text-xs text-faint">{brand.supportEmail}</p>
          </div>
        </div>
        <p className="border-t border-edge-soft py-5 text-center text-[11px] text-faint">
          {brand.name} © {new Date().getFullYear()} · Tüm hakları saklıdır.
        </p>
      </footer>
    </>
  );
}
