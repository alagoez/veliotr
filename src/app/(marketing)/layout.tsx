import Link from "next/link";
import { brand } from "@/config/brand";
import { BrandLogo } from "@/components/BrandLogo";

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-base">
      <header className="marketing-header">
        <div className="marketing-nav mx-auto flex max-w-[1240px] items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="marketing-logo" aria-label={brand.name}><BrandLogo priority /></Link>
          <nav className="header-nav" aria-label="Ana menü"><Link href="/ozellikler">Özellikler</Link><Link href="/iletisim">İletişim</Link><span className="header-live"><i /> Canlı</span></nav>
          <div className="header-actions"><Link href="/signin" className="header-login">Giriş yap</Link><Link href="/signin" className="header-cta">Hemen başla <span>↗</span></Link></div>
        </div>
      </header>
      {children}
      <footer className="border-t border-edge-soft bg-base">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-6 py-14 md:grid-cols-[1.6fr_1fr_1fr_1fr] lg:px-10">
          <div>
            <Link href="/" className="flex items-center gap-3"><BrandLogo /></Link>
            <p className="mt-5 max-w-xs text-sm leading-7 text-muted">Global creator&apos;ların kanıtlanmış viral video fikirlerini ve trendleri veriyle bulmasına yardım ediyoruz.</p>
          </div>
          <div><p className="text-sm font-semibold">Yasal</p><div className="mt-4 grid gap-3 text-sm text-muted"><Link href="/gizlilik" className="hover:text-ink">Gizlilik Politikası</Link><Link href="/kosullar" className="hover:text-ink">Kullanım Koşulları</Link></div></div>
          <div><p className="text-sm font-semibold">Hızlı bağlantılar</p><div className="mt-4 grid gap-3 text-sm text-muted"><Link href="/" className="hover:text-ink">Ana sayfa</Link><Link href="/iletisim" className="hover:text-ink">İletişim</Link><Link href="/ozellikler" className="hover:text-ink">Özellikler</Link><Link href="/ortaklik" className="hover:text-ink">Ortaklık Programı</Link><Link href="/blog" className="hover:text-ink">Blog</Link></div></div>
          <div><p className="text-sm font-semibold">Bize ulaş</p><p className="mt-4 text-sm leading-7 text-muted">{brand.supportEmail}</p></div>
        </div>
        <div className="border-t border-edge-soft py-5 text-center text-xs text-faint">{brand.name} © {new Date().getFullYear()} · Tüm hakları saklıdır.</div>
      </footer>
    </div>
  );
}
