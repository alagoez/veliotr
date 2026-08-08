"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

/**
 * SSS — sade akordiyon.
 *
 * Kart ızgarası yerine düz dikey liste: her satır ince bir çizgiyle ayrılıyor,
 * kutu yok. Premium his kutulardan değil, boşluktan ve tipografiden geliyor.
 *
 * Açılma animasyonu grid-template-rows üzerinden — max-height numarasının
 * aksine içeriğin gerçek yüksekliğini bilmeye gerek yok, sıçrama olmuyor.
 */
const SORULAR = [
  {
    s: "Çarpan tam olarak ne demek?",
    c: "Bir videonun izlenmesinin, o kanalın normal izlenmesine oranı. Kanal normalde 20 bin alıyorsa ve bir video 200 bin aldıysa çarpan 10x'tir. İzlenme sayısına değil bu orana bakıyoruz — çünkü 200 bin izlenme küçük bir kanal için patlama, büyük bir kanal için sıradan bir gün.",
  },
  {
    s: "Neden abone sayısına göre sıralamıyorsunuz?",
    c: "Çünkü büyük kanalın viral videosu sana bir şey öğretmez — onu izleten şey kanalın kendisi. Küçük bir kanalın kendi normalini 50 kat aşması ise içerikle ilgilidir ve tekrarlanabilir. Ürünün tamamı bu ayrım üzerine kurulu.",
  },
  {
    s: "Veriler nereden geliyor?",
    c: "Yalnızca resmî YouTube Data API'sinden. Scraping yok. Metrikler değiştirilmeden gösteriliyor ve her video kaynağına bağlanıyor.",
  },
  {
    s: "Sadece Türkçe kanallar mı var?",
    c: "Hayır. İndeks hem Türkiye hem global kanalları kapsıyor. Nişinde İngilizce bir kanalın çalışmış fikri, Türkçe'ye uyarlanabilir bir fikirdir — o yüzden ikisini de tarıyoruz.",
  },
  {
    s: "Kanalımı bağlamam gerekiyor mu?",
    c: "Hayır. Bağlarsan Keşfet akışı senin nişine göre kişiselleşir, ama zorunlu değil. Bağlamadan da tüm filtreleri ve aramayı kullanabilirsin.",
  },
  {
    s: "İstediğim zaman iptal edebilir miyim?",
    c: "Evet, tek tıkla. Dönem sonuna kadar erişimin devam eder, otomatik yenilenmez.",
  },
] as const;

export function Sss() {
  const [acik, setAcik] = useState<number | null>(0);

  return (
    <section className="lp-section lp-faq">
      <div className="lp-container">
        <div className="lp-head lp-measure">
          <h2>Sık sorulanlar</h2>
        </div>
        <div className="lp-faq-list">
          {SORULAR.map((q, i) => {
            const open = acik === i;
            return (
              <div key={q.s} className={`lp-faq-item${open ? " is-open" : ""}`}>
                <button
                  type="button"
                  onClick={() => setAcik(open ? null : i)}
                  aria-expanded={open}
                  aria-controls={`faq-${i}`}
                >
                  <span>{q.s}</span>
                  <Plus size={18} aria-hidden />
                </button>
                <div className="lp-faq-panel" id={`faq-${i}`} role="region" hidden={!open}>
                  <div>
                    <p>{q.c}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
