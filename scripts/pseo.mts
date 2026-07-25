/**
 * pSEO üretici — anahtar kelime matrisinden Gemini ile TR makale üretir.
 * Velio'nun içerik motorunun disiplinli versiyonu: aynı şablon iskeleti,
 * ama çift slug yok, alakasız link yok, JSON-LD route'ta otomatik.
 *
 * Gerekli env: GEMINI_API_KEY
 * Çalıştırma: npm run pseo            → sıradaki 1 makale
 *             npm run pseo -- 3       → sıradaki 3 makale
 * Cron: .github/workflows/pseo.yml (her gece 1 makale üretip commit'ler)
 */
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.log("GEMINI_API_KEY yok — pSEO üretimi atlandı.");
  process.exit(0);
}

// Anahtar kelime matrisi (plan.md §7.3 — niş × ticari × alt-huni × nasıl-yapılır)
const KEYWORDS: { slug: string; keyword: string; intent: string }[] = [
  { slug: "oyun-kanali-icin-video-fikirleri", keyword: "oyun kanalı için youtube video fikirleri", intent: "niş" },
  { slug: "yemek-kanali-icin-video-fikirleri", keyword: "yemek kanalı için youtube video fikirleri", intent: "niş" },
  { slug: "finans-kanali-icin-video-fikirleri", keyword: "finans kanalı için youtube video fikirleri", intent: "niş" },
  { slug: "vlog-video-fikirleri", keyword: "vlog video fikirleri", intent: "niş" },
  { slug: "teknoloji-kanali-video-fikirleri", keyword: "teknoloji kanalı için video fikirleri", intent: "niş" },
  { slug: "en-iyi-youtube-video-fikri-araci", keyword: "en iyi youtube video fikri aracı", intent: "ticari" },
  { slug: "yapay-zeka-youtube-baslik-uretici", keyword: "yapay zeka youtube başlık üretici", intent: "ticari" },
  { slug: "youtube-trend-konular-araci", keyword: "youtube trend konular aracı", intent: "ticari" },
  { slug: "tubebuddy-turkce-alternatifi", keyword: "tubebuddy türkçe alternatifi", intent: "alt-huni" },
  { slug: "youtube-analiz-araci-fiyatlari", keyword: "youtube analiz aracı fiyatları", intent: "alt-huni" },
  { slug: "youtube-izlenme-nasil-artirilir", keyword: "youtube izlenme nasıl artırılır", intent: "nasıl" },
  { slug: "viral-video-konusu-nasil-bulunur", keyword: "viral video konusu nasıl bulunur", intent: "nasıl" },
  { slug: "rakip-kanal-analizi-nasil-yapilir", keyword: "rakip youtube kanalı analizi nasıl yapılır", intent: "nasıl" },
  { slug: "youtube-hook-ornekleri", keyword: "youtube hook örnekleri", intent: "nasıl" },
  { slug: "youtube-shorts-izlenme-artirma", keyword: "youtube shorts izlenme artırma", intent: "nasıl" },
];

const DIR = join(process.cwd(), "content", "blog");
mkdirSync(DIR, { recursive: true });
const existing = new Set(readdirSync(DIR).map((f) => f.replace(/\.md$/, "")));
const queue = KEYWORDS.filter((k) => !existing.has(k.slug));
const count = Math.max(1, Math.min(5, Number(process.argv[2] ?? 1)));
const batch = queue.slice(0, count);

if (batch.length === 0) {
  console.log("Kuyrukta yeni anahtar kelime yok — matrise ekleme yap (scripts/pseo.ts).");
  process.exit(0);
}

const { GoogleGenAI } = await import("@google/genai");
const { CHAT_MODEL } = await import("../src/config/ai");
const ai = new GoogleGenAI({ apiKey: KEY });

const today = new Date().toISOString().slice(0, 10);

for (const item of batch) {
  const prompt = `Sen Viralab'in içerik editörüsün. Viralab, Türk YouTuber'lar için outlier (patlayan video) araştırma aracıdır: çarpan = izlenme ÷ kanal medyanı; keşif, rakip takibi ve AI fikir asistanı sunar.

"${item.keyword}" anahtar kelimesi için (arama niyeti: ${item.intent}) 900-1200 kelimelik, SEO uyumlu, TÜRKÇE bir makale yaz.

KESIN kurallar:
- İlk satır YAML frontmatter OLMASIN; sadece makale gövdesini yaz.
- Yapı: kısa hook girişi (2-3 cümle) → 4-6 adet "## " H2 bölümü → tam 1 adet markdown tablo → "## Sık Sorulan Sorular" altında tam 4 adet "### Soru?" + cevap paragrafı → tek cümlelik kapanış CTA'sı.
- H2 bölümlerinden birinde doğal biçimde Viralab'den bahset (link: [Viralab](/)) — satış dili değil, araç önerisi tonu.
- Kapanış CTA linki: [Viralab'i ücretsiz dene](/signin)
- Somut, örnekli, Türk YouTube ekosistemine uygun yaz. Uydurma istatistik verme; "genellikle", "sık görülür" gibi ifadeler kullan.
- Başka araçlardan bahsedersen adil ol (vidIQ, TubeBuddy).

Ayrıca ilk iki satırda şunları ver (sonra boş satır, sonra makale):
TITLE: <55-65 karakterlik başlık>
DESC: <140-155 karakterlik meta açıklama>`;

  const res = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents: prompt,
    config: { temperature: 0.8, maxOutputTokens: 4096 },
  });
  const raw = res.text ?? "";
  const titleMatch = /TITLE:\s*(.+)/.exec(raw);
  const descMatch = /DESC:\s*(.+)/.exec(raw);
  const body = raw
    .replace(/TITLE:.*\r?\n/, "")
    .replace(/DESC:.*\r?\n/, "")
    .trim();

  if (!titleMatch || body.length < 500) {
    console.error(`✗ ${item.slug}: üretim yetersiz, atlandı.`);
    continue;
  }

  const md = `---
title: ${titleMatch[1].trim()}
description: ${(descMatch?.[1] ?? "").trim()}
date: ${today}
keyword: ${item.keyword}
---

${body}
`;
  writeFileSync(join(DIR, `${item.slug}.md`), md, "utf8");
  console.log(`✓ ${item.slug}.md üretildi`);
}
