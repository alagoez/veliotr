import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, FolderSearch, LineChart, Search, Sparkles } from "lucide-react";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: `${brand.name} — ${brand.tagline}` };

const TESTIMONIALS = [
  ["Sonunda gerçekten izlenme getiren fikirleri, başlıkları ve thumbnail'ları bulan bir araç.", "142 B abone", "@OYUNCUEFE"],
  ["Eskiden saatler süren araştırma artık dakikalar alıyor. Elle yaptığıma inanamıyorum.", "88 B abone", "@BORSAGUNLUGU"],
  ["Nişimdeki outlier'ları bulmak 100 kat kolaylaştı. Öne çıkmak artık şans değil.", "215 B abone", "@TARIFKAZANI"],
  ["Karşılaştığım en iyi YouTube aracı. Daha önce nasıl bilmiyordum, oyun değiştirici.", "374 B abone", "@TEKNOMASA"],
  ["Kitlemin görmek istediği fikirleri buluyorum. Artık araştırma otomatik.", "97 B abone", "@ONDAKIKADAOGREN"],
] as const;

const SUPPORT = [
  [FolderSearch, "Kaynak Kasası", "Viralab'i sonuna kadar kullanmanı sağlayan rehberler, ipuçları ve pratik dersler."],
  [Sparkles, "Yardım Merkezi", "Takıldığın anda cevap bul; kanalını büyütürken önünde engel kalmasın."],
  [LineChart, "Topluluk", "Diğer üreticilerle fikir alışverişi yap, geri bildirim al ve birlikte büyü."],
  [Search, "Online Kurslar", "YouTube büyümesini kendi hızında öğren; uzman içgörüleriyle kanalını uçur."],
] as const;

function Cta({ children = "HEMEN BAŞLA" }: { children?: string }) {
  return <Link href="/signin" className="orange-button"><span>{children}</span><ArrowRight size={16} /></Link>;
}

function ProductMockup() {
  return (
    <div className="product-stage actual-product-stage" aria-label="Viralab ürün önizlemesi">
      <Image src="/velio-assets/hp.png" alt="Viralab araştırma ekranı" fill priority sizes="(max-width: 900px) 100vw, 58vw" className="hero-product-image" />
    </div>
  );
}

export default function LandingPage() {
  return (
    <main>
      <section className="hero-grid velio-hero relative overflow-hidden">
        <div className="hero-art-layer" aria-hidden="true"><span className="hero-orb" /><span className="hero-ring" /><span className="hero-beam" /><i className="hero-star star-one" /><i className="hero-star star-two" /><i className="hero-star star-three" /></div>
        <div className="mx-auto grid min-h-[690px] max-w-[1180px] items-center gap-10 px-6 py-20 lg:grid-cols-[0.92fr_1.08fr] lg:px-10 lg:py-24">
          <div className="relative z-10 max-w-[570px]">
            <p className="section-kicker">VERİYLE VİRAL OL</p>
            <h1 className="hero-title mt-5"><span className="hero-title-line">Tahmin etmeyi <em>bırak.</em></span><span className="hero-title-line gradient-text">Sıradaki viral fikrini bul.</span></h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-muted">Viralab, milyonlarca videoyu tarayıp kanalını büyütecek fikirleri, başlıkları, thumbnail&apos;ları ve hook&apos;ları bulur.</p>
            <div className="mt-9 flex flex-wrap items-center gap-4"><Cta /><span className="text-xs text-faint">İlk keşif ücretsiz</span></div>
          </div>
          <ProductMockup />
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-6 py-24 lg:px-10">
        <div className="awards-row"><Image src="/velio-assets/award-left.svg" alt="Ödül" width={130} height={65} /><p className="section-kicker text-center">ÜRETİCİLER NE DİYOR?</p><Image src="/velio-assets/award-right.svg" alt="Ödül" width={130} height={65} /></div>
        <div className="testimonial-marquee mt-12"><div className="testimonial-track">{[...TESTIMONIALS, ...TESTIMONIALS].map(([quote, subs, handle], index) => <figure key={`${handle}-${index}`} className="testimonial-card"><blockquote>“{quote}”</blockquote><figcaption><span className="avatar">{handle.slice(1, 2)}</span><span><b>{subs}</b><small>{handle}</small></span></figcaption></figure>)}</div></div>
      </section>

      <section className="mx-auto max-w-[1180px] px-6 pb-28 text-center lg:px-10">
        <p className="section-kicker">YOUTUBE KANALIN İÇİN STEROİD GİBİ</p>
        <div className="video-demo actual-video mt-12"><video autoPlay loop muted playsInline preload="metadata" aria-label="Viralab ürün tanıtım videosu"><source src="/velio-assets/velio-demo.mp4" type="video/mp4" /></video><div className="video-tint" /></div>
        <div className="step-grid mt-8">{[["01", "Viral kalıpları çöz", "Filtreler, anahtar kelimeler ve yapay zekâ ile kanıtlanmış fikirleri saniyeler içinde bul."], ["02", "Rakiplerini gözetle", "Rakiplerinin ne yaptığını analiz et, nişindeki trendleri herkesten önce yakala."], ["03", "Daha çok izlen", "Araştırmanı kaydet, uygula ve kanalını şansa bırakmadan büyüt."]].map(([num, title, body]) => <article key={num} className="step-card"><span>{num}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
      </section>

      <section className="feature-stack mx-auto max-w-[1180px] px-6 pb-28 lg:px-10"><article><div><p className="section-kicker">VİRAL KALIPLARI ÇÖZ</p><h2>Milyonlarca izlenme getiren formülleri nokta atışı bul.</h2><p>Gelişmiş filtreler, yapay zekâ destekli arama ve benzer videolar özelliğiyle her niş için kanıtlanmış fikirleri, başlıkları, thumbnail&apos;ları ve hook&apos;ları ortaya çıkar.</p></div><div className="feature-visual"><Image src="/velio-assets/glass-shelf.png" alt="Viralab filtre ve video arama ekranı" fill loading="eager" sizes="(max-width: 900px) 100vw, 50vw" /></div></article><article><div className="feature-visual"><Image src="/velio-assets/comp-alerts.png" alt="Rakip analiz ve uyarı ekranı" fill loading="eager" sizes="(max-width: 900px) 100vw, 50vw" /></div><div><p className="section-kicker">RAKİPLERİNİ GÖZETLE</p><h2>Rakiplerin nasıl kazandığını gör, arayı kapat.</h2><p>Tüm rakiplerini tek yerden takip et, sonuç almak için tam olarak ne yaptıklarını çöz. Nişinde biri viral olduğunda otomatik uyarı al.</p></div></article><article><div><p className="section-kicker">İZLENMEYİ TOPLA</p><h2>Tüm araştırmanı tek yerde sakla.</h2><p>Fikirlerin, başlıkların, thumbnail&apos;ların ve ilhamın klasörlerde, etiketlerde ve notlarda düzenli dursun.</p></div><div className="feature-visual"><Image src="/velio-assets/save-videos.png" alt="Kaydedilen video klasörleri" fill loading="eager" sizes="(max-width: 900px) 100vw, 50vw" /></div></article><article><div className="feature-visual"><Image src="/velio-assets/chrome-extension.png" alt="Viralab Chrome eklentisi" fill loading="eager" sizes="(max-width: 900px) 100vw, 50vw" /></div><div><p className="section-kicker">UYGULAMAYI İNDİR</p><h2>YouTube&apos;dan çıkmadan fikirlerini kaydet.</h2><p>Chrome eklentisi ve mobil uygulamayla videoları etiketle, not ekle ve araştırmanı anında Viralab&apos;e taşı.</p></div></article></section>

      <section className="pricing-band"><div className="mx-auto max-w-[1180px] px-6 py-28 text-center lg:px-10"><p className="section-kicker dark">FİYATLANDIRMA</p><h2 className="mt-5 font-display text-4xl font-bold tracking-[-0.05em] sm:text-6xl">Sıradaki videon patlamaya hazır mı?</h2><p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-black/70">İzlenmeyen video çekme döngüsünü kır. Viralab&apos;e katıl, bir sonraki viral videonu kanıtlanmış veriyle üret.</p><div className="mx-auto mt-12 max-w-md rounded-3xl border border-black/15 bg-black p-8 text-left text-white shadow-2xl"><p className="text-lg text-white/60">Yıllık plan</p><p className="mt-3 font-display text-6xl font-bold">₺249 <span className="text-base font-normal text-white/60">/ay</span></p><ul className="mt-8 grid gap-4 text-sm">{["Sınırsız arama", "Gelişmiş filtreler", "Sınırsız rakip takibi", "Sınırsız video kaydetme", "Fikir doğrulayıcı AI"].map((item) => <li key={item} className="flex items-center gap-3"><Check size={17} className="text-brand" />{item}</li>)}</ul><div className="mt-8"><Cta>BAŞLAMAYA HAZIRIM</Cta></div></div></div></section>

      <section className="mx-auto max-w-[1180px] px-6 py-28 lg:px-10"><p className="section-kicker text-center">VİRALAB DESTEK</p><h2 className="mx-auto mt-5 max-w-2xl text-center font-display text-4xl font-bold tracking-[-0.06em] sm:text-6xl">Kanalını büyütmek için ihtiyacın olan yardım.</h2><div className="support-grid mt-14">{SUPPORT.map(([Icon, title, body]) => <article key={title as string}><Icon size={30} className="text-brand" /><h3>{title as string}</h3><p>{body as string}</p></article>)}</div></section>

      <section className="final-cta"><p className="section-kicker dark">GERÇEK SONUÇLAR GÖRMEYE BAŞLA</p><h2>Viralab&apos;i bugün dene.</h2><p>İlk fikrini riske girmeden keşfet — bir döner parasına.</p><Cta /></section>
    </main>
  );
}
