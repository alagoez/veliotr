/**
 * Embedding doldurma — video başlıklarını Gemini ile vektörleştirir.
 *
 * pgvector HNSW indeksi tekil yazımda çok yavaş olduğundan: indeksi DÜŞÜR →
 * toplu SQL ile yaz (Management API) → sonda indeksi TEK SEFERDE kur.
 * Ağ blibi tek batch'i öldürmesin diye hem işlem-içi retry hem dış döngü
 * kurtarması var. Devam edebilir: yalnızca embedding NULL olanları işler.
 *
 * Gerekli env: GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL,
 *              SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ACCESS_TOKEN
 */
import { createClient } from "@supabase/supabase-js";

const KEY = process.env.GEMINI_API_KEY;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!KEY) {
  console.log("GEMINI_API_KEY yok — embedding atlandı.");
  process.exit(0);
}
if (!TOKEN || !URL_) {
  console.error("SUPABASE_ACCESS_TOKEN ve NEXT_PUBLIC_SUPABASE_URL gerekli.");
  process.exit(1);
}

const db = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { GoogleGenAI } = await import("@google/genai");
const { EMBED_MODEL, EMBED_DIM } = await import("../src/config/ai");
const ai = new GoogleGenAI({ apiKey: KEY });

const ref = new URL(URL_).hostname.split(".")[0];
const SQL_API = `https://api.supabase.com/v1/projects/${ref}/database/query`;

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 6): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < attempts) await new Promise((r) => setTimeout(r, Math.min(20000, 1000 * i * i)));
    }
  }
  throw new Error(`${label}: ${last instanceof Error ? last.message : last}`);
}

async function runSql(sql: string): Promise<void> {
  const res = await fetch(SQL_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) throw new Error(`SQL ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

const okId = (id: string) => /^[A-Za-z0-9_-]+$/.test(id);
const vecLit = (v: number[]) => `[${v.map((x) => (Number.isFinite(x) ? x : 0)).join(",")}]`;

/**
 * Hangi videolar vektörlenecek? Tümü DEĞİL — sığmıyor (migration 0008).
 *
 *   kanal başına son PER_CHANNEL video   → niş tespiti (verify-niches.mts)
 *   çarpanı MIN_OUTLIER üstü tüm videolar → semantik arama
 *
 * Ölçüm: 768 boyut × 4 bayt = 3 kB/video. Tüm evren (175.400 video) 539 MB,
 * Supabase ücretsiz tavanı 500 MB. Bu seçimle ~40.000 vektör ≈ 123 MB.
 */
const PER_CHANNEL = Number(process.argv.find((a) => a.startsWith("--per-channel="))?.slice(14) ?? 20);
const MIN_OUTLIER = Number(process.argv.find((a) => a.startsWith("--min-outlier="))?.slice(14) ?? 10);

async function markTargets(): Promise<void> {
  await runSql(`
    update videos set embed_target = false where embed_target;

    with son_videolar as (
      select id from (
        select id, row_number() over (partition by channel_id order by published_at desc) sira
        from videos
      ) t where sira <= ${PER_CHANNEL}
    )
    update videos set embed_target = true
    where id in (select id from son_videolar)
       or outlier_score >= ${MIN_OUTLIER};
  `);
}

async function processBatch(): Promise<number | null> {
  const { data, error } = await db
    .from("videos")
    .select("id, title")
    .eq("embed_target", true)
    .is("embedding", null)
    .limit(25);
  if (error) throw new Error(error.message);
  const rows = (data ?? []).filter((r) => okId(r.id));
  if (rows.length === 0) return null; // bitti

  const res = await ai.models.embedContent({
    model: EMBED_MODEL,
    contents: rows.map((r) => r.title.slice(0, 1500)),
    config: { taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: EMBED_DIM },
  });
  const vectors = res.embeddings ?? [];

  const values: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const vals = vectors[i]?.values;
    if (vals) values.push(`('${rows[i].id}','${vecLit(vals)}'::vector)`);
  }
  if (values.length) {
    await runSql(
      `update videos as v set embedding = d.emb from (values ${values.join(",")}) as d(id, emb) where v.id = d.id;`,
    );
  }
  return values.length;
}

// 0) Hedefleri işaretle — hepsi değil, örneklem (yukarıdaki gerekçe)
console.log(`Hedefler işaretleniyor (kanal başına son ${PER_CHANNEL} video + ${MIN_OUTLIER}x üstü)...`);
await withRetry(markTargets, "mark targets");
const { count: hedef } = await db
  .from("videos")
  .select("id", { count: "exact", head: true })
  .eq("embed_target", true);
const { count: kalan } = await db
  .from("videos")
  .select("id", { count: "exact", head: true })
  .eq("embed_target", true)
  .is("embedding", null);
console.log(`Hedef: ${hedef} video · vektörlenecek: ${kalan} · tahmini boyut: ${Math.round((hedef ?? 0) * 3072 / 1e6)} MB\n`);

// 1) İndeksi düşür
console.log("HNSW indeksi düşürülüyor...");
await withRetry(() => runSql("drop index if exists idx_videos_embedding;"), "drop index");

// 2) Batch batch vektörle — batch hatası döngüyü öldürmez, tekrar dener
let done = 0;
let fails = 0;
for (;;) {
  try {
    const n = await withRetry(processBatch, "batch");
    if (n === null) break;
    done += n;
    fails = 0;
    if (done % 500 === 0 || done < 100) console.log(`✓ ${done} vektörlendi`);
    await new Promise((r) => setTimeout(r, 400));
  } catch (e) {
    fails++;
    console.log(`  batch hatası (${fails}/20): ${e instanceof Error ? e.message.slice(0, 80) : e}`);
    if (fails >= 20) {
      console.error("Çok fazla ardışık hata — durduruluyor. Tekrar çalıştırınca kaldığı yerden devam eder.");
      break;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}

// 3) İndeksi yeniden kur
console.log(`\n${done} embedding yazıldı. HNSW indeksi yeniden kuruluyor...`);
// Ücretsiz kademe belleği paralel HNSW kurulumunu kaldırmaz → paralel kapalı,
// düşük work_mem, hafif graf (m=8) ile kur.
await withRetry(
  () =>
    runSql(
      "set max_parallel_maintenance_workers = 0; set maintenance_work_mem = '32MB'; set statement_timeout = 0; create index if not exists idx_videos_embedding on videos using hnsw (embedding vector_cosine_ops) with (m = 8, ef_construction = 32);",
    ),
  "create index",
  4,
);
console.log("Bitti.");
