import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

export const metadata: Metadata = { title: "Kaynak Kasası" };

const GUIDES = [
  {
    emoji: "🎯",
    title: "Outlier avcılığı 101",
    body: "Çarpan = izlenme ÷ kanal medyanı. 3x üstü sinyal, 10x üstü kanıtlanmış talep demektir. Filtreyi 10x+, tarihi 'Bu Ay' yap; çıkan konuların ortak paydasını not al. Konu kanaldan bağımsız talep görüyorsa senin versiyonun da şansı var.",
  },
  {
    emoji: "🪝",
    title: "Hook: ilk 15 saniye",
    body: "Patlayan videoların açılışını izle: vaat + merak boşluğu + neden şimdi. Kendi videonda ilk cümleye videonun en güçlü anını koy. Shorts'ta bu süre 1,5 saniyeye iner — ilk kare afiş gibi olmalı.",
  },
  {
    emoji: "🔤",
    title: "Başlık kalıpları",
    body: "TR'de en çok çalışanlar: sayı ('7 hata'), karşıtlık ('Çaylak vs Efsane'), gizem ('Kimsenin bilmediği'), aciliyet ('Bunu yapmadan başlama'), sonuç vaadi ('...böyle 10x yaptım'). Outlier listenden 10 başlık topla, kalıbı çıkar, kendi konuna uyarla.",
  },
  {
    emoji: "📡",
    title: "Rakip takibi rutini",
    body: "Nişindeki 10-15 kanalı takibe al. Haftada bir Kanallarım'a gir: viral rozetli video varsa 24 saat içinde kendi açını çek. Trendin ilk dalgasında olmak, kalitenin önünde gelir.",
  },
  {
    emoji: "💎",
    title: "Küçük kanal stratejisi",
    body: "Hazır Listeler → Küçük Kanal Mucizeleri'ne bak: 50K altı kanalların 10x+ videoları, algoritmanın kanal büyüklüğüne bakmadığının kanıtı. Onların konusu + senin daha iyi paketlemen = en kısa büyüme yolu.",
  },
  {
    emoji: "🗂️",
    title: "Araştırma sistemi",
    body: "Her niş için bir klasör aç. Beğendiğin her outlier'ı etiketle ('hook', 'başlık', 'thumbnail'). Video çekmeden önce Fikir Doğrulayıcı'ya klasörünü ver: 'Buradaki ortak kalıpları çıkar' — brief hazır.",
  },
];

export default function LearnPage() {
  return (
    <div className="mx-auto max-w-[1000px] px-6 py-7">
      <h1 className="flex items-center gap-2.5 font-display text-2xl font-bold tracking-tight">
        <BookOpen size={22} className="text-brand-soft" />
        Kaynak Kasası
      </h1>
      <p className="mt-1 text-sm text-muted">
        Viralab&apos;i sonuna kadar kullanmanı sağlayan saha rehberleri.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {GUIDES.map((g) => (
          <article key={g.title} className="glass-panel p-5">
            <span className="text-2xl">{g.emoji}</span>
            <h2 className="mt-2.5 font-display text-[15px] font-bold tracking-tight">
              {g.title}
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{g.body}</p>
          </article>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-faint">
        Video kurslar ve topluluk Discord&apos;u yakında — şimdilik en iyi öğretmen indeksin kendisi. 🧪
      </p>
    </div>
  );
}
