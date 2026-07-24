import type { Metadata } from "next";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Gizlilik Politikası" };

export default function PrivacyPage() {
  return (
    <article className="prose-invert mx-auto max-w-2xl px-5 py-20 text-sm leading-relaxed text-muted [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink">
      <h1 className="font-display text-3xl font-bold text-ink">Gizlilik Politikası</h1>
      <p className="mt-2 text-xs text-faint">Son güncelleme: 24 Temmuz 2026 — taslak; yayına almadan önce hukuk danışmanıyla gözden geçirin.</p>

      <h2>1. Topladığımız Veriler</h2>
      <p>
        Hesap bilgileri (ad, e-posta), kullanım verileri (özellik etkileşimleri) ve
        teknik veriler (IP, tarayıcı, cihaz). YouTube kanalınızı bağlarsanız, yalnızca
        yetkilendirdiğiniz kanal verilerine erişiriz.
      </p>

      <h2>2. YouTube API Hizmetleri</h2>
      <p>
        {brand.name}, <strong className="text-ink">YouTube API Hizmetleri&apos;ni kullanır</strong>.
        Hizmeti kullanarak{" "}
        <a href="https://www.youtube.com/t/terms" className="text-glow underline">
          YouTube Hizmet Şartları
        </a>{" "}
        ve{" "}
        <a href="https://policies.google.com/privacy" className="text-glow underline">
          Google Gizlilik Politikası
        </a>
        &apos;nı kabul etmiş olursunuz. API üzerinden aldığımız yetkili veriler en geç 30
        günde bir tazelenir veya silinir. Yetkilendirmeyi dilediğiniz zaman{" "}
        <a
          href="https://security.google.com/settings/security/permissions"
          className="text-glow underline"
        >
          Google güvenlik ayarları
        </a>{" "}
        sayfasından iptal edebilirsiniz. API verileri reklam hedefleme amacıyla
        kullanılmaz ve üçüncü taraflara satılmaz.
      </p>

      <h2>3. Verilerin Kullanımı</h2>
      <p>
        Verilerinizi hizmeti sunmak, geliştirmek, destek sağlamak ve yasal
        yükümlülükleri yerine getirmek için kullanırız. Ödeme işlemleri Stripe
        aracılığıyla yürütülür; kart bilgileriniz sunucularımızda saklanmaz.
      </p>

      <h2>4. KVKK Kapsamındaki Haklarınız</h2>
      <p>
        6698 sayılı KVKK uyarınca verilerinize erişme, düzeltme, silme, işlemeyi
        kısıtlama ve itiraz haklarına sahipsiniz. Talepleriniz için:{" "}
        <span className="text-ink">{brand.supportEmail}</span>
      </p>

      <h2>5. Çerezler</h2>
      <p>
        Oturum yönetimi ve analitik için çerezler kullanırız. Analitik çerezleri
        tarayıcı ayarlarından veya çerez tercihlerinden reddedebilirsiniz.
      </p>
    </article>
  );
}
