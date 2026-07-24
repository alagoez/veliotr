import { isGeminiConfigured } from "@/lib/env";
import { search } from "@/lib/search";
import { fmtCompact, fmtMultiplier } from "@/lib/format";
import type { ChatMessage, Video } from "@/lib/types";

const MODEL = "gemini-2.5-flash";

/** Sorgu metninden niş çıkar (kullanıcı "finans nişinde..." derse bağlam daralır). */
const NICHE_HINTS: [string, string][] = [
  ["oyun", "oyun"], ["gaming", "oyun"], ["games", "oyun"],
  ["finans", "finans"], ["borsa", "finans"], ["yatırım", "finans"], ["kripto", "finans"], ["business", "finans"], ["finance", "finans"], ["money", "finans"],
  ["yemek", "yemek"], ["tarif", "yemek"], ["mutfak", "yemek"], ["food", "yemek"], ["cooking", "yemek"],
  ["vlog", "vlog"], ["kamp", "vlog"], ["gezi", "vlog"], ["travel", "vlog"], ["adventure", "vlog"],
  ["teknoloji", "teknoloji"], ["telefon", "teknoloji"], ["yazılım", "teknoloji"], ["technology", "teknoloji"], ["tech", "teknoloji"], ["ai", "teknoloji"],
  ["eğitim", "egitim"], ["egitim", "egitim"], ["sınav", "egitim"], ["ders", "egitim"], ["education", "egitim"], ["science", "egitim"],
  ["fitness", "fitness"], ["workout", "fitness"], ["wellness", "fitness"],
  ["entertainment", "entertainment"], ["movie", "entertainment"], ["music", "entertainment"],
];

function nicheFromQuery(query: string): string | undefined {
  const q = query.toLocaleLowerCase("tr-TR");
  return NICHE_HINTS.find(([kw]) => q.includes(kw))?.[1];
}

/** Sorguyla alakalı outlier bağlamını hazırla (RAG-lite — plan.md §3.6).
 *  Supabase yapılandırılmışsa gerçek indeksten, değilse demo setinden okur. */
export async function buildContext(
  query: string,
  niche?: string,
  videos?: Video[],
): Promise<Video[]> {
  if (videos?.length) return videos.slice(0, 20);
  const effectiveNiche = niche ?? nicheFromQuery(query);
  const res = await search({
    filters: { niche: effectiveNiche, multiplier: { min: 2 } },
    sort: "outlier",
    page: 0,
    pageSize: 20,
  });
  return res.videos;
}

function contextBlock(videos: Video[]): string {
  return videos
    .map(
      (v) =>
        `- "${v.title}" | kanal: ${v.channelTitle} (${fmtCompact(v.subscribers)} abone) | ${fmtCompact(v.views)} izlenme | çarpan ${fmtMultiplier(v.outlierScore)} | ${v.isShort ? "Shorts" : "uzun video"}`,
    )
    .join("\n");
}

const SYSTEM = `Sen Viralab'in "Fikir Doğrulayıcı" asistanısın. Dünyanın her yerindeki creator'lara veri odaklı içerik stratejisi öneriyorsun.
Kurallar:
- SADECE sana verilen video verisine dayan; veri uydurma.
- Kısa, maddeli, uygulanabilir yaz. Creator diliyle konuş (samimi, net, gaz veren ama gerçekçi).
- Çarpan (örn. 14,4x) = video izlenmesi ÷ kanal medyanı. Yüksek çarpan = kanıtlanmış talep.
- Başlık önerirken evrensel viral kalıpları kullan: curiosity gap, sayı, karşılaştırma, zaman sınırı, transformation ve challenge.
- Cevap dili: Türkçe.`;

export async function chat(
  messages: ChatMessage[],
  niche?: string,
  folderVideos?: Video[],
): Promise<string> {
  const lastUser = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const ctx = await buildContext(lastUser, niche, folderVideos);

  if (!isGeminiConfigured()) {
    return mockAnswer(lastUser, ctx);
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const contents = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction: `${SYSTEM}\n\nELİNDEKİ VERİ (outlier videolar):\n${contextBlock(ctx)}`,
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  });

  return response.text ?? "Üzgünüm, bir cevap üretemedim. Tekrar dener misin?";
}

/** GEMINI_API_KEY yoksa: veri setinden gerçek outlier'larla kurallı cevap (demo modu). */
function mockAnswer(query: string, ctx: Video[]): string {
  const top = ctx.slice(0, 5);
  const lines = top
    .map(
      (v, i) =>
        `${i + 1}. **"${v.title}"** — ${v.channelTitle}, ${fmtCompact(v.views)} izlenme (${fmtMultiplier(v.outlierScore)} çarpan)`,
    )
    .join("\n");
  return [
    `*(Demo modu — GEMINI_API_KEY eklendiğinde bu cevaplar Gemini 2.5 Flash ile üretilir.)*`,
    ``,
    `"${query}" sorusu için indeksten çektiğim en güçlü sinyaller:`,
    ``,
    lines,
    ``,
    `**Okuma:** Bu videoların ortak noktası kanal normalinin çok üstünde izlenme almaları — yani konu, kanaldan bağımsız talep görüyor. Aynı formatı kendi tarzınla yeniden paketlemen (farklı açı + daha güçlü hook) en hızlı test yolu.`,
    ``,
    `**Önerilen 3 adım:**`,
    `- En yüksek çarpanlı 2 videonun başlık kalıbını çıkar, kendi nişine uyarla.`,
    `- İlk 15 saniyeye net bir vaat koy (izleyici neden kalsın?).`,
    `- Videoyu klasöre kaydet, 1 hafta sonra çarpan değişimini kontrol et.`,
  ].join("\n");
}
