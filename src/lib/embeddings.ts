import { isGeminiConfigured } from "@/lib/env";
import { EMBED_DIM, EMBED_MODEL } from "@/config/ai";

/** Gemini embedding (768 boyut) — sorgu ve video başlıkları için. */
export async function embedText(
  text: string,
  taskType: "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT" = "RETRIEVAL_QUERY",
): Promise<number[] | null> {
  if (!isGeminiConfigured()) return null;
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const res = await ai.models.embedContent({
    model: EMBED_MODEL,
    contents: text.slice(0, 1500),
    config: { taskType, outputDimensionality: EMBED_DIM },
  });
  return res.embeddings?.[0]?.values ?? null;
}
