import type { Metadata } from "next";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Kullanım Koşulları" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl px-5 py-20 text-sm leading-relaxed text-muted [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink">
      <h1 className="font-display text-3xl font-bold text-ink">Kullanım Koşulları</h1>
      <p className="mt-2 text-xs text-faint">Son güncelleme: 24 Temmuz 2026 — taslak; yayına almadan önce hukuk danışmanıyla gözden geçirin.</p>

      <h2>1. Hizmet</h2>
      <p>
        {brand.name}, YouTube içerik üreticileri için veri odaklı araştırma araçları
        sunan bir abonelik hizmetidir. Veriler yalnızca resmî YouTube API
        Hizmetleri&apos;nden alınır ve olduğu gibi gösterilir.
      </p>

      <h2>2. Abonelik ve İptal</h2>
      <p>
        Abonelikler aylık veya yıllık olarak yenilenir. Aboneliğinizi dilediğiniz an
        hesap panelinden iptal edebilirsiniz; iptal, mevcut fatura döneminin sonunda
        geçerli olur. Cayma hakkı ve iadeler, Mesafeli Sözleşmeler Yönetmeliği ve
        ilgili tüketici mevzuatına tabidir.
      </p>

      <h2>3. Kabul Edilebilir Kullanım</h2>
      <p>
        Hizmete otomatik araçlarla (bot, kazıyıcı) erişmek, verileri toplu dışa
        aktarıp satmak, güvenlik önlemlerini aşmak ve hizmeti kötüye kullanmak
        yasaktır.
      </p>

      <h2>4. Fikri Mülkiyet</h2>
      <p>
        Yazılım, tasarım ve içerikler {brand.name}&apos;e aittir. YouTube verileri ve
        markaları ilgili hak sahiplerine aittir.
      </p>

      <h2>5. Sorumluluk Sınırı</h2>
      <p>
        Hizmet &quot;olduğu gibi&quot; sunulur; dolaylı zararlardan sorumluluk kabul edilmez.
        Zorunlu tüketici hakları saklıdır.
      </p>

      <h2>6. İletişim</h2>
      <p>{brand.supportEmail}</p>
    </article>
  );
}
