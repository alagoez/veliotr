/**
 * Embedding doldurma — embedding'i olmayan videoların başlıklarını
 * Gemini embedding modeliyle (src/config/ai.ts) vektörleştirip Supabase'e yazar.
 *
 * Gerekli env: GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Çalıştırma: npm run embed   (ingest sonrası; cron'a eklenebilir)
 * Devam edebilir: yalnızca embedding'i NULL olanları işler, tekrar çalıştırınca
 * kaldığı yerden sürer. Geçici ağ hataları retry ile yutulur.
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

/** Geçici hatalarda (ağ blibi, kota) üstel beklemeyle yeniden dener. */
async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 5): Promise<T> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < attempts) {
        const wait = 1000 * i * i; // 1s, 4s, 9s, 16s
        console.log(`  ${label} denemesi ${i} başarısız, ${wait / 1000}s bekleniyor...`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw new Error(`${label} ${attempts} denemede başarısız: ${lastErr instanceof Error ? lastErr.message : lastErr}`);
}

const BATCH = 50;
let done = 0;

for (;;) {
  const rows = await withRetry(async () => {
    const { data, error } = await db
      .from("videos")
      .select("id, title")
      .is("embedding", null)
      .limit(BATCH);
    if (error) throw new Error(error.message);
    return data;
  }, "select");

  if (!rows?.length) break;

  const res = await withRetry(
    () =>
      ai.models.embedContent({
        model: EMBED_MODEL,
        contents: rows.map((r) => r.title.slice(0, 1500)),
        config: { taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: EMBED_DIM },
      }),
    "embed",
  );
  const vectors = res.embeddings ?? [];

  let wrote = 0;
  for (let i = 0; i < rows.length; i++) {
    const values = vectors[i]?.values;
    if (!values) continue;
    await withRetry(async () => {
      const { error: e2 } = await db
        .from("videos")
        .update({ embedding: JSON.stringify(values) })
        .eq("id", rows[i].id);
      if (e2) throw new Error(e2.message);
    }, `update ${rows[i].id}`);
    wrote++;
  }
  done += wrote;
  console.log(`✓ ${done} video vektörlendi`);
  await new Promise((r) => setTimeout(r, 800)); // kota nefesi
}

console.log(`Bitti — bu çalıştırmada ${done} embedding yazıldı.`);
