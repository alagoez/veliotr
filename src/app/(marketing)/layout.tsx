import Link from "next/link";
import { brand } from "@/config/brand";
import { BrandLogo } from "@/components/BrandLogo";

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // lp-light: pazarlama sayfaları açık temada. Uygulama koyu kalıyor —
    // orada saatlerce veri inceleniyor, koyu tema gözü yormuyor. Pazarlama
    // sayfası ise 5 saniyede ikna etmek zorunda; beyaz zemin + siyah yazı
    // elde edilebilecek en yüksek kontrast, aynı puntoda yazı daha iri
    // hissettiriyor. (ViewStats de böyle: site açık, uygulama koyu.)
    <div className="lp-light min-h-screen">
      <header className="lp-header">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" aria-label={brand.name}><BrandLogo priority /></Link>
          {/* Menü kasten çıplak: logo + iki eylem. Eskiden 2 bağlantı + yanıp
              sönen "Canlı" rozeti + gradyan buton vardı; başlıkla yarışıyordu. */}
          <div className="lp-header-actions">
            <Link href="/signin" className="lp-login">Giriş yap</Link>
            <Link href="/signin" className="lp-signup">Ücretsiz başla</Link>
          </div>
        </div>
      </header>
      {children}
      <footer className="lp-footer">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-6 py-14 md:grid-cols-[1.6fr_1fr_1fr_1fr] lg:px-10">
          <div>
            <Link href="/" className="flex items-center gap-3"><BrandLogo /></Link>
            <p className="mt-5 max-w-xs text-sm leading-7">Global creator&apos;ların kanıtlanmış viral video fikirlerini ve trendleri veriyle bulmasına yardım ediyoruz.</p>
          </div>
          <div><p className="lp-footer-head">Yasal</p><div className="mt-4 grid gap-3 text-sm"><Link href="/gizlilik">Gizlilik Politikası</Link><Link href="/kosullar">Kullanım Koşulları</Link></div></div>
          <div><p className="lp-footer-head">Hızlı bağlantılar</p><div className="mt-4 grid gap-3 text-sm"><Link href="/">Ana sayfa</Link><Link href="/iletisim">İletişim</Link><Link href="/ozellikler">Özellikler</Link><Link href="/ortaklik">Ortaklık Programı</Link><Link href="/blog">Blog</Link></div></div>
          <div><p className="lp-footer-head">Bize ulaş</p><p className="mt-4 text-sm leading-7">{brand.supportEmail}</p></div>
        </div>
        <div className="lp-footer-base">{brand.name} © {new Date().getFullYear()} · Tüm hakları saklıdır.</div>
      </footer>
    </div>
  );
}
