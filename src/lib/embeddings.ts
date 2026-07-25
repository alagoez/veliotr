import { isGeminiConfigured } from "@/lib/env";

/** Gemini text-embedding-004 (768 boyut) — sorgu ve video başlıkları için. */
export async function embedText(
  text: string,
  taskType: "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT" = "RETRIEVAL_QUERY",
): Promise<number[] | null> {
  if (!isGeminiConfigured()) return null;
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const res = await ai.models.embedContent({
    model: "text-embedding-004",
    contents: text.slice(0, 1500),
    config: { taskType, outputDimensionality: 768 },
  });
  return res.embeddings?.[0]?.values ?? null;
}
