import type { Channel, Video } from "@/lib/types";

/**
 * Demo veri seti — Supabase/YouTube anahtarı olmadan uygulamanın
 * "neredeyse birebir çalışır" olmasını sağlar. Deterministik üretilir
 * (seed'li RNG), böylece her açılışta aynı evren görünür.
 * Gerçek moda geçiş: .env'e Supabase anahtarlarını ekle (bkz. README).
 */

// ---- Seed'li RNG (mulberry32) ----
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const NICHES = [
  { slug: "oyun", name: "Oyun" },
  { slug: "finans", name: "Finans & Borsa" },
  { slug: "yemek", name: "Yemek" },
  { slug: "vlog", name: "Vlog & Yaşam" },
  { slug: "teknoloji", name: "Teknoloji" },
  { slug: "egitim", name: "Eğitim" },
] as const;

const CHANNEL_NAMES: Record<string, string[]> = {
  oyun: [
    "Oyun Delisi", "Pixel Efe", "GG Kaan", "Zort Gaming", "Loot Peri",
    "Ramazan Oynuyor", "Klavye Savaşçısı", "Efsane Co-op",
  ],
  finans: [
    "Borsa Günlüğü", "Parayı Konuşalım", "Yatırımcı Baba", "Temettü Avcısı",
    "Kripto Pusula", "Finans Atölyesi", "Bütçe Ustası", "Ekonomi Sohbetleri",
  ],
  yemek: [
    "Anne Mutfağı", "Şef Deniz", "Tarif Kazanı", "Sokak Lezzetleri TR",
    "Tatlı Krizi", "Mangal Kardeşler", "Pratik Tarifler", "Mutfak Sırları",
  ],
  vlog: [
    "Bi Gün Böyle", "Yolda Olmak", "Ada Vlog", "Kamptayız",
    "Şehirde Yaşam", "Merve Günlükleri", "Rutinlerim", "Uzak Yollar",
  ],
  teknoloji: [
    "Teknoloji Masası", "İncelemeci", "Donanım Delisi", "Yazılım Sohbeti",
    "Mobil Dünya", "Kutu Açılımı TR", "Ucuz Teknoloji", "Yapay Zeka Günlüğü",
  ],
  egitim: [
    "10 Dakikada Öğren", "Sınav Koçu", "İngilizce Kampı", "Tarih Anlatıyorum",
    "Matematik Sever", "Kariyer Rehberi", "Kitap Kulübü", "Bilim Kurdu",
  ],
};

const TITLE_TEMPLATES: Record<string, string[]> = {
  oyun: [
    "Bu oyunda HERKESİN yaptığı hata", "24 saat boyunca sadece {X} oynadım",
    "Efsane geri dönüş: {X} rekoru kırdık", "Yeni güncelleme her şeyi değiştirdi",
    "1 TL'lik hesapla turnuva kazanmak", "Kimsenin bilmediği 7 hile (yasal)",
    "Bu taktikle rank atlamak ÇOK kolay", "Oyunun en zor bölümünü bitirdim",
    "Çaylak vs Efsane oyuncu farkı", "Bu ayarları AÇMADAN oynama",
  ],
  finans: [
    "Aylık {X} TL temettü nasıl kurulur?", "Bu hisseyi herkes konuşuyor, neden?",
    "Enflasyona karşı 5 gerçek koruma", "25 yaşında emeklilik planı yaptım",
    "1.000 TL ile yatırıma başlamak", "Bankaların söylemediği gerçek",
    "Portföyümü açıklıyorum (%{X} getiri)", "Kirada mı oturmalı, ev mi almalı?",
    "Asgari ücretle birikim mümkün mü?", "Bu hatayı yapan parasını eritiyor",
  ],
  yemek: [
    "Orijinal {X} tarifi (lokanta sırrı)", "3 malzemeyle efsane tatlı",
    "1 tavuktan 4 öğün çıkarmak", "Bunu bir kere yapan vazgeçemiyor",
    "Annemin 40 yıllık hamur sırrı", "5 dakikada kahvaltı sofrası",
    "Ustasından adım adım {X}", "Evde ilk kez yapanlar için {X}",
    "Bu yöntemle et LOKUM gibi oluyor", "Ramazan menüsü: 7 günlük plan",
  ],
  vlog: [
    "Her şeyi bırakıp köye taşındık", "İstanbul'da 1 gün / 100 TL",
    "Yalnız kamp: fırtınaya yakalandım", "Ev turu: 45 m² stüdyo dönüşümü",
    "Sabah 5'te kalkmak hayatımı değiştirdi", "30 gün şekersiz yaşadım",
    "Türkiye'nin en ucuz tatil rotası", "Minimalist oldum: 100 eşyayla yaşam",
    "İşimi bıraktım, işte olanlar", "Bir haftalık gerçek market alışverişi",
  ],
  teknoloji: [
    "{X} inceleme: Almadan önce izle", "Bu telefonu kimse önermiyor ama...",
    "20.000 TL altı en iyi kurulum", "Yapay zeka ile 1 günde web sitesi",
    "iPhone vs Android: 2026 finali", "Bu uygulamaları hemen sil",
    "Ucuza kurduğum oyun bilgisayarı", "5 yıllık laptop'u uçurdum",
    "Herkesin kullandığı ama bilmediği özellik", "Kutudan çıkan sürpriz: {X}",
  ],
  egitim: [
    "İngilizceyi 6 ayda böyle öğrendim", "Sınavda çıkacak 20 kritik soru",
    "Not tutma yöntemim (üniversite)", "Ezber değil: kalıcı öğrenme tekniği",
    "10 dakikada {X} konusu bitiyor", "Hoca anlatmıyor ama bu çıkıyor",
    "CV'nizde bu hata varsa elenirsiniz", "Günde 1 saatle dil öğrenmek",
    "Bu kitabı okumadan mezun olma", "Odaklanamayanlar için 5 teknik",
  ],
};

function pick<T>(r: () => number, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replaceAll("ı", "i").replaceAll("ğ", "g").replaceAll("ü", "u")
    .replaceAll("ş", "s").replaceAll("ö", "o").replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "");
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.floor((s[mid - 1] + s[mid]) / 2);
}

type Dataset = { channels: Channel[]; videos: Video[] };

let cache: Dataset | null = null;

export function getDemoDataset(): Dataset {
  if (cache) return cache;
  const r = rng(4242);
  const channels: Channel[] = [];
  const videos: Video[] = [];
  const now = Date.now();
  const DAY = 86400000;

  for (const niche of NICHES) {
    for (const name of CHANNEL_NAMES[niche.slug]) {
      const handle = "@" + slugify(name);
      const id = "ch_" + slugify(name);
      // Abone: 3K – 2M, log dağılım
      const subscribers = Math.floor(3000 * Math.pow(10, r() * 2.8));
      const ageYears = 1 + r() * 8;
      const videoCount = 12 + Math.floor(r() * 24);
      const baseViews = Math.max(500, Math.floor(subscribers * (0.15 + r() * 0.5)));

      const channelVideos: Video[] = [];
      for (let i = 0; i < videoCount; i++) {
        const ageDays = 1 + Math.floor(r() * ageYears * 330);
        // Çoğu video normal, ~%12'si outlier (2x–40x)
        const isOutlier = r() < 0.12;
        const mult = isOutlier ? 2 + Math.pow(r(), 0.6) * 38 : 0.3 + r() * 1.6;
        const views = Math.max(50, Math.floor(baseViews * mult * (0.8 + r() * 0.4)));
        const isShort = r() < 0.22;
        const durationSec = isShort
          ? 15 + Math.floor(r() * 45)
          : 180 + Math.floor(r() * 1500);
        const likes = Math.floor(views * (0.02 + r() * 0.05));
        const comments = Math.floor(views * (0.001 + r() * 0.006));
        const publishedAt = new Date(now - ageDays * DAY).toISOString();
        const title = pick(r, TITLE_TEMPLATES[niche.slug]).replace(
          "{X}",
          pick(r, ["Efsane", "İskender", "Zam", "RTX 5070", "Türev", "Sarma", "Karadeniz", "Fizik", "Valorant", "%42"]),
        );

        channelVideos.push({
          id: `v_${id}_${i}`,
          channelId: id,
          channelTitle: name,
          channelHandle: handle,
          subscribers,
          medianViews: 0, // aşağıda doldurulur
          nicheSlug: niche.slug,
          title,
          thumbUrl: null,
          publishedAt,
          durationSec,
          isShort,
          views,
          likes,
          comments,
          engagement: (likes + comments) / views,
          outlierScore: 0,
          viewsPerDay: views / Math.max(ageDays, 1),
          viewsToSubs: views / subscribers,
        });
      }

      // Medyan: 30 günden eski videolar üzerinden (plan.md §4.3)
      const mature = channelVideos.filter(
        (v) => now - new Date(v.publishedAt).getTime() > 30 * DAY,
      );
      const med = median((mature.length >= 10 ? mature : channelVideos).map((v) => v.views));
      for (const v of channelVideos) {
        v.medianViews = med;
        v.outlierScore = Math.round((v.views / Math.max(med, 1)) * 10) / 10;
      }

      channels.push({
        id,
        title: name,
        handle,
        avatarUrl: null,
        nicheSlug: niche.slug,
        subscribers,
        totalViews: channelVideos.reduce((a, v) => a + v.views, 0),
        videoCount,
        publishedAt: new Date(now - ageYears * 365 * DAY).toISOString(),
        medianViews: med,
      });
      videos.push(...channelVideos);
    }
  }

  cache = { channels, videos };
  return cache;
}
