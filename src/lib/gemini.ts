import { isGeminiConfigured } from "@/lib/env";
import { searchDemo } from "@/lib/search";
import { fmtCompact, fmtMultiplier } from "@/lib/format";
import type { ChatMessage, Video } from "@/lib/types";

const MODEL = "gemini-2.5-flash";

/** Sorgu metninden niş çıkar (kullanıcı "finans nişinde..." derse bağlam daralır). */
const NICHE_HINTS: [string, string][] = [
  ["oyun", "oyun"], ["gaming", "oyun"],
  ["finans", "finans"], ["borsa", "finans"], ["yatırım", "finans"], ["kripto", "finans"],
  ["yemek", "yemek"], ["tarif", "yemek"], ["mutfak", "yemek"],
  ["vlog", "vlog"], ["kamp", "vlog"], ["gezi", "vlog"],
  ["teknoloji", "teknoloji"], ["telefon", "teknoloji"], ["yazılım", "teknoloji"],
  ["eğitim", "egitim"], ["egitim", "egitim"], ["sınav", "egitim"], ["ders", "egitim"],
];

function nicheFromQuery(query: string): string | undefined {
  const q = query.toLocaleLowerCase("tr-TR");
  return NICHE_HINTS.find(([kw]) => q.includes(kw))?.[1];
}

/** Sorguyla alakalı outlier bağlamını hazırla (RAG-lite — plan.md §3.6). */
export function buildContext(query: string, niche?: string, videos?: Video[]): Video[] {
  if (videos?.length) return videos.slice(0, 20);
  const effectiveNiche = niche ?? nicheFromQuery(query);
  const res = searchDemo({
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

const SYSTEM = `Sen Viralab'in "Fikir Doğrulayıcı" asistanısın. Türk YouTuber'lara veri odaklı içerik stratejisi öneriyorsun.
Kurallar:
- SADECE sana verilen video verisine dayan; veri uydurma.
- Kısa, maddeli, uygulanabilir yaz. Creator diliyle konuş (samimi, net, gaz veren ama gerçekçi).
- Çarpan (örn. 14,4x) = video izlenmesi ÷ kanal medyanı. Yüksek çarpan = kanıtlanmış talep.
- Başlık önerirken Türkçe viral kalıpları kullan: merak boşluğu, sayı, "kimse söylemiyor", karşılaştırma, zaman sınırı.
- Cevap dili: Türkçe.`;

export async function chat(
  messages: ChatMessage[],
  niche?: string,
  folderVideos?: Video[],
): Promise<string> {
  const lastUser = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const ctx = buildContext(lastUser, niche, folderVideos);

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
