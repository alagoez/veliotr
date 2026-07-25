/**
 * Embedding doldurma — embedding'i olmayan videoların başlıklarını
 * Gemini embedding modeliyle (src/config/ai.ts) vektörleştirip Supabase'e yazar.
 *
 * Gerekli env: GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Çalıştırma: npm run embed   (ingest sonrası; cron'a eklenebilir)
 * Ücretsiz kota dostu: partiler arası bekleme + tek partide 100 başlık.
 */
import { createClient } from "@supabase/supabase-js";

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.log("GEMINI_API_KEY yok — embedding atlandı (semantik arama pasif kalır).");
  process.exit(0);
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const { GoogleGenAI } = await import("@google/genai");
const { EMBED_MODEL, EMBED_DIM } = await import("../src/config/ai");
const ai = new GoogleGenAI({ apiKey: KEY });

const BATCH = 100;
let done = 0;

for (;;) {
  const { data: rows, error } = await db
    .from("videos")
    .select("id, title")
    .is("embedding", null)
    .limit(BATCH);
  if (error) throw new Error(error.message);
  if (!rows?.length) break;

  const res = await ai.models.embedContent({
    model: EMBED_MODEL,
    contents: rows.map((r) => r.title.slice(0, 1500)),
    config: { taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: EMBED_DIM },
  });
  const vectors = res.embeddings ?? [];

  for (let i = 0; i < rows.length; i++) {
    const values = vectors[i]?.values;
    if (!values) continue;
    const { error: e2 } = await db
      .from("videos")
      .update({ embedding: JSON.stringify(values) })
      .eq("id", rows[i].id);
    if (e2) throw new Error(e2.message);
  }
  done += rows.length;
  console.log(`✓ ${done} video vektörlendi`);
  await new Promise((r) => setTimeout(r, 1500)); // kota nefesi
}

console.log(`Bitti — toplam ${done} embedding.`);
